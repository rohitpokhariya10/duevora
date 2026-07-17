// Importing modules
import mongoose from "mongoose";
import ProductDao from "../../../shared/dao/product.dao.js";
import CategoryDao from "../../../shared/dao/category.dao.js";
import UnitDao from "../../../shared/dao/unit.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import BadRequest from "../../../shared/errors/BadRequest.error.js";
import Created from "../../../shared/responses/Created.response.js";
import Ok from "../../../shared/responses/Ok.response.js";

// class to handle product operations
class ProductsController {

    constructor() {

        // initializing the daos
        this.productDao = new ProductDao();
        this.categoryDao = new CategoryDao();
        this.unitDao = new UnitDao();

    }

    // create a new product
    createProduct = async (req, res) => {

        const { name, sku, description, categoryId, unitId, price, cost, status } = req.body;
        const organizationId = req.user.organizationId;

        // verifying SKU is unique within organization context
        const existingProduct = await this.productDao.findOne({
            organizationId,
            sku,
            isDeleted: {
                $ne: true
            }
        });

        if (existingProduct) {

            throw new Conflict("Product SKU already exists in your organization.");

        }

        // validating categoryId exists in organization if provided
        if (categoryId) {

            const category = await this.categoryDao.findOne({
                _id: categoryId,
                organizationId
            });

            if (!category) {

                throw new NotFound("Category not found in your organization.");

            }

        }

        // validating unitId exists in organization if provided
        if (unitId) {

            const unit = await this.unitDao.findOne({
                _id: unitId,
                organizationId
            });

            if (!unit) {

                throw new NotFound("Unit not found in your organization.");

            }

        }

        // creating the product using product dao
        const product = await this.productDao.create({
            organizationId,
            name,
            sku,
            description: description || "",
            categoryId: categoryId || undefined,
            unitId: unitId || undefined,
            price: price || 0,
            cost: cost || 0,
            status: status || "active",
            isDeleted: false
        });

        return Created(res, "Product created successfully", product);

    }

    // list products with pagination, sorting, and search
    listProducts = async (req, res) => {

        const organizationId = req.user.organizationId;

        // formulating product filter based on organization isolation and excluding soft deleted products
        const filter = {
            organizationId,
            isDeleted: {
                $ne: true
            }
        };

        // checking if search query is provided
        if (req.query.search) {

            const searchRegex = {
                $regex: req.query.search,
                $options: "i"
            };

            filter.$or = [
                { name: searchRegex },
                { sku: searchRegex }
            ];

        }

        // parsing pagination and sorting parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

        // counting total records matching filter
        const total = await this.productDao.Model.countDocuments(filter);

        // fetching products using product dao
        const products = await this.productDao.find(filter, {
            sort: { [sortBy]: sortOrder },
            limit,
            skip
        });

        // constructing pagination metadata
        const pages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            status: 200,
            message: "Products retrieved successfully",
            data: products,
            pagination: {
                page,
                limit,
                total,
                pages
            }
        });

    }

    // get product details by id
    getProductDetails = async (req, res) => {

        const { productId } = req.params;
        const organizationId = req.user.organizationId;

        // finding the product profile within organization context excluding soft deleted products
        const product = await this.productDao.findOne({
            _id: productId,
            organizationId,
            isDeleted: {
                $ne: true
            }
        });

        if (!product) {

            throw new NotFound("Product not found in your organization.");

        }

        return Ok(res, "Product details retrieved successfully", product);

    }

    // update product details
    updateProduct = async (req, res) => {

        const { productId } = req.params;
        const { name, sku, description, categoryId, unitId, price, cost, status } = req.body;
        const organizationId = req.user.organizationId;

        // verifying target product exists in organization
        const product = await this.productDao.findOne({
            _id: productId,
            organizationId,
            isDeleted: {
                $ne: true
            }
        });

        if (!product) {

            throw new NotFound("Product not found in your organization.");

        }

        // if SKU is updated, verifying that it is unique within organization context
        if (sku && sku !== product.sku) {

            const existingProduct = await this.productDao.findOne({
                organizationId,
                sku,
                _id: {
                    $ne: productId
                },
                isDeleted: {
                    $ne: true
                }
            });

            if (existingProduct) {

                throw new Conflict("Product SKU already exists in your organization.");

            }

        }

        // validating categoryId exists in organization if provided
        if (categoryId && categoryId.toString() !== product.categoryId?.toString()) {

            const category = await this.categoryDao.findOne({
                _id: categoryId,
                organizationId
            });

            if (!category) {

                throw new NotFound("Category not found in your organization.");

            }

        }

        // validating unitId exists in organization if provided
        if (unitId && unitId.toString() !== product.unitId?.toString()) {

            const unit = await this.unitDao.findOne({
                _id: unitId,
                organizationId
            });

            if (!unit) {

                throw new NotFound("Unit not found in your organization.");

            }

        }

        // updating product record using product dao
        const updatedProduct = await this.productDao.updateById(productId, {
            name: name !== undefined ? name : product.name,
            sku: sku !== undefined ? sku : product.sku,
            description: description !== undefined ? description : product.description,
            categoryId: categoryId !== undefined ? categoryId : product.categoryId,
            unitId: unitId !== undefined ? unitId : product.unitId,
            price: price !== undefined ? price : product.price,
            cost: cost !== undefined ? cost : product.cost,
            status: status !== undefined ? status : product.status
        });

        return Ok(res, "Product updated successfully", updatedProduct);

    }

    // soft delete a product
    deleteProduct = async (req, res) => {

        const { productId } = req.params;
        const organizationId = req.user.organizationId;

        // verifying target product belongs to caller's organization context
        const product = await this.productDao.findOne({
            _id: productId,
            organizationId,
            isDeleted: {
                $ne: true
            }
        });

        if (!product) {

            throw new NotFound("Product not found in your organization.");

        }

        // soft deleting product by setting isDeleted to true
        await this.productDao.updateById(productId, {
            isDeleted: true
        });

        return Ok(res, "Product deleted successfully");

    }

    // bulk import products using database replica transactions
    bulkImportProducts = async (req, res) => {

        const { products } = req.body;
        const organizationId = req.user.organizationId;

        // tracking unique SKUs in the input payload to check for local duplicates
        const inputSkus = new Set();

        for (const prod of products) {

            if (inputSkus.has(prod.sku)) {

                throw new BadRequest(`Duplicate SKU found in import list: ${prod.sku}`);

            }

            inputSkus.add(prod.sku);

        }

        // starting a mongodb transaction session
        const session = await mongoose.startSession();
        session.startTransaction();

        try {

            const importedProducts = [];

            for (const prod of products) {

                // verifying SKU is unique in organization context
                const existingProduct = await this.productDao.findOne({
                    organizationId,
                    sku: prod.sku,
                    isDeleted: {
                        $ne: true
                    }
                }, session);

                if (existingProduct) {

                    throw new Conflict(`Product SKU ${prod.sku} already exists.`);

                }

                // validating categoryId exists in organization if provided
                if (prod.categoryId) {

                    const category = await this.categoryDao.findOne({
                        _id: prod.categoryId,
                        organizationId
                    }, session);

                    if (!category) {

                        throw new NotFound(`Category with ID ${prod.categoryId} not found.`);

                    }

                }

                // validating unitId exists in organization if provided
                if (prod.unitId) {

                    const unit = await this.unitDao.findOne({
                        _id: prod.unitId,
                        organizationId
                    }, session);

                    if (!unit) {

                        throw new NotFound(`Unit with ID ${prod.unitId} not found.`);

                    }

                }

                // creating product record using product dao
                const createdProd = await this.productDao.create({
                    organizationId,
                    name: prod.name,
                    sku: prod.sku,
                    description: prod.description || "",
                    categoryId: prod.categoryId || undefined,
                    unitId: prod.unitId || undefined,
                    price: prod.price || 0,
                    cost: prod.cost || 0,
                    status: prod.status || "active",
                    isDeleted: false
                }, session);

                importedProducts.push(createdProd);

            }

            // committing transaction and saving all documents
            await session.commitTransaction();

            return Created(res, "Products imported successfully", importedProducts);

        } catch (error) {

            // aborting transaction on failure
            await session.abortTransaction();
            throw error;

        } finally {

            // ending the session
            session.endSession();

        }

    }

}

export default ProductsController;
