// Importing modules
import express from "express";
import ProductsController from "./products.controller.js";
import {
    createProductValidators,
    listProductsValidators,
    getProductValidators,
    updateProductValidators,
    bulkImportProductsValidators
} from "./products.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new ProductsController();

/*
    @route POST /api/products
    @desc Create a new product in the current organization
    @access Private (requires products.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("products.create"), createProductValidators, controller.createProduct);

/*
    @route GET /api/products
    @desc List product profiles with pagination and search
    @access Private (requires products.view permission)
*/
router.get("/", authMiddleware, permissionMiddleware("products.view"), listProductsValidators, controller.listProducts);

/*
    @route POST /api/products/bulk-import
    @desc Bulk import product profiles using transactions
    @access Private (requires products.create permission)
*/
router.post("/bulk-import", authMiddleware, permissionMiddleware("products.create"), bulkImportProductsValidators, controller.bulkImportProducts);

/*
    @route GET /api/products/:productId
    @desc Get product details by ID
    @access Private (requires products.view permission)
*/
router.get("/:productId", authMiddleware, permissionMiddleware("products.view"), getProductValidators, controller.getProductDetails);

/*
    @route PUT /api/products/:productId
    @desc Update product details
    @access Private (requires products.update permission)
*/
router.put("/:productId", authMiddleware, permissionMiddleware("products.update"), updateProductValidators, controller.updateProduct);

/*
    @route DELETE /api/products/:productId
    @desc Soft delete a product
    @access Private (requires products.delete permission)
*/
router.delete("/:productId", authMiddleware, permissionMiddleware("products.delete"), getProductValidators, controller.deleteProduct);

export default router;
