// Importing modules
import mongoose from "mongoose";
import PurchaseDao from "../../../shared/dao/purchase.dao.js";
import PurchaseItemDao from "../../../shared/dao/purchaseItem.dao.js";
import VendorDao from "../../../shared/dao/vendor.dao.js";
import ProductDao from "../../../shared/dao/product.dao.js";
import TaxDao from "../../../shared/dao/tax.dao.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import Created from "../../../shared/responses/Created.response.js";

// class to handle purchase operations
class PurchasesController {

    constructor() {

        // initializing the daos
        this.purchaseDao = new PurchaseDao();
        this.purchaseItemDao = new PurchaseItemDao();
        this.vendorDao = new VendorDao();
        this.productDao = new ProductDao();
        this.taxDao = new TaxDao();

    }

    // create a new purchase bill
    createPurchase = async (req, res) => {

        const { vendorId, purchaseNumber, purchaseDate, items } = req.body;
        const organizationId = req.user.organizationId;

        // starting a mongodb transaction session
        const session = await mongoose.startSession();
        session.startTransaction();

        try {

            // validating vendor exists in organization
            const vendor = await this.vendorDao.findOne({
                _id: vendorId,
                organizationId
            }, session);

            if (!vendor) {

                throw new NotFound("Vendor reference not found in your organization.");

            }

            // verifying purchase number is unique within organization context
            const existingPurchase = await this.purchaseDao.findOne({
                organizationId,
                purchaseNumber: {
                    $regex: new RegExp(`^${purchaseNumber.trim()}$`, "i")
                }
            }, session);

            if (existingPurchase) {

                throw new Conflict("Purchase number already exists in your organization.");

            }

            // calculating items totals
            let subTotal = 0;
            let taxTotal = 0;
            let grandTotal = 0;

            const processedItems = [];

            for (const item of items) {

                // validating product exists in organization context
                const product = await this.productDao.findOne({
                    _id: item.productId,
                    organizationId,
                    isDeleted: {
                        $ne: true
                    }
                }, session);

                if (!product) {

                    throw new NotFound(`Product with ID ${item.productId} not found.`);

                }

                let taxRate = 0;
                let taxAmount = 0;

                // validating tax details if taxId is provided
                if (item.taxId) {

                    const tax = await this.taxDao.findOne({
                        _id: item.taxId,
                        organizationId
                    }, session);

                    if (!tax) {

                        throw new NotFound(`Tax reference with ID ${item.taxId} not found.`);

                    }

                    taxRate = tax.rate;

                }

                const itemSubtotal = item.quantity * item.unitPrice;

                if (taxRate > 0) {

                    taxAmount = itemSubtotal * (taxRate / 100);

                }

                const itemTotal = itemSubtotal + taxAmount;

                subTotal += itemSubtotal;
                taxTotal += taxAmount;
                grandTotal += itemTotal;

                processedItems.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxId: item.taxId || undefined,
                    taxAmount,
                    total: itemTotal
                });

            }

            // creating purchase record using purchase dao
            const purchase = await this.purchaseDao.create({
                organizationId,
                vendorId,
                purchaseNumber: purchaseNumber.trim(),
                purchaseDate: new Date(purchaseDate),
                subTotal,
                taxTotal,
                grandTotal,
                status: "billed"
            }, session);

            // creating all related purchase item records
            for (const item of processedItems) {

                await this.purchaseItemDao.create({
                    purchaseId: purchase._id,
                    ...item
                }, session);

            }

            // committing transaction
            await session.commitTransaction();

            return Created(res, "Purchase recorded successfully", purchase);

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

export default PurchasesController;
