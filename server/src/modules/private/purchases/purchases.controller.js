// Importing modules
import mongoose from "mongoose";
import PurchaseDao from "../../../shared/dao/purchase.dao.js";
import PurchaseItemDao from "../../../shared/dao/purchaseItem.dao.js";
import VendorDao from "../../../shared/dao/vendor.dao.js";
import ProductDao from "../../../shared/dao/product.dao.js";
import TaxDao from "../../../shared/dao/tax.dao.js";
import WarehouseDao from "../../../shared/dao/warehouse.dao.js";
import InventoryDao from "../../../shared/dao/inventory.dao.js";
import StockMovementDao from "../../../shared/dao/stockMovement.dao.js";
import AccountDao from "../../../shared/dao/account.dao.js";
import JournalEntryDao from "../../../shared/dao/journalEntry.dao.js";
import JournalEntryLineDao from "../../../shared/dao/journalEntryLine.dao.js";
import LedgerEntryDao from "../../../shared/dao/ledgerEntry.dao.js";

import Conflict from "../../../shared/errors/Conflict.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import BadRequest from "../../../shared/errors/BadRequest.error.js";

import Created from "../../../shared/responses/Created.response.js";
import Ok from "../../../shared/responses/Ok.response.js";

// class to handle purchase operations
class PurchasesController {

    constructor() {

        // initializing the purchase dao
        this.purchaseDao = new PurchaseDao();

        // initializing the purchase item dao
        this.purchaseItemDao = new PurchaseItemDao();

        // initializing the vendor dao
        this.vendorDao = new VendorDao();

        // initializing the product dao
        this.productDao = new ProductDao();

        // initializing the tax dao
        this.taxDao = new TaxDao();

        // initializing the warehouse dao
        this.warehouseDao = new WarehouseDao();

        // initializing the inventory dao
        this.inventoryDao = new InventoryDao();

        // initializing the stock movement dao
        this.stockMovementDao = new StockMovementDao();

        // initializing the account dao
        this.accountDao = new AccountDao();

        // initializing the journal entry dao
        this.journalEntryDao = new JournalEntryDao();

        // initializing the journal entry line dao
        this.journalEntryLineDao = new JournalEntryLineDao();

        // initializing the ledger entry dao
        this.ledgerEntryDao = new LedgerEntryDao();

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

            // returning the created purchase
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

    // approve a purchase bill
    approvePurchase = async (req, res) => {

        const { purchaseId } = req.params;
        const organizationId = req.user.organizationId;

        // starting a mongodb transaction session
        const session = await mongoose.startSession();
        session.startTransaction();

        try {

            // finding the purchase within organization context
            const purchase = await this.purchaseDao.findOne({
                _id: purchaseId,
                organizationId
            }, session);

            if (!purchase) {

                throw new NotFound("Purchase not found in your organization.");

            }

            if (purchase.status !== "billed") {

                throw new BadRequest("Only billed purchases can be approved.");

            }

            // fetching all related purchase items
            const items = await this.purchaseItemDao.find({ purchaseId }, {}, session);

            if (!items || items.length === 0) {

                throw new BadRequest("Purchase must contain at least one item to be approved.");

            }

            // finding first warehouse in this organization to increment inventory
            const warehouse = await this.warehouseDao.findOne({ organizationId }, session);

            if (!warehouse) {

                throw new BadRequest("No warehouse found in your organization to receive this purchase.");

            }

            // incrementing inventory and logging stock movements
            for (const item of items) {

                let inventory = await this.inventoryDao.Model.findOne({
                    organizationId,
                    productId: item.productId,
                    warehouseId: warehouse._id
                }).session(session);

                if (!inventory) {

                    inventory = new this.inventoryDao.Model({
                        organizationId,
                        productId: item.productId,
                        warehouseId: warehouse._id,
                        quantity: 0
                    });

                }

                // updating inventory quantity (incrementing)
                inventory.quantity += item.quantity;
                await inventory.save({ session });

                // logging IN stock movement log entry
                await this.stockMovementDao.create({
                    organizationId,
                    productId: item.productId,
                    warehouseId: warehouse._id,
                    quantity: item.quantity,
                    type: "in",
                    referenceType: "Purchase",
                    referenceId: purchase._id,
                    date: new Date()
                }, session);

            }

            // getting or creating double entry bookkeeping accounts
            const apAccount = await this.getOrCreateAccount(
                organizationId,
                "Accounts Payable",
                "ACCOUNTS_PAYABLE",
                "liability",
                session
            );

            const inventoryAccount = await this.getOrCreateAccount(
                organizationId,
                "Inventory Asset",
                "INVENTORY_ASSET",
                "asset",
                session
            );

            const gstInputAccount = await this.getOrCreateAccount(
                organizationId,
                "GST Input Asset",
                "GST_INPUT_ASSET",
                "asset",
                session
            );

            // creating a journal entry
            const journalEntry = await this.journalEntryDao.create({
                organizationId,
                entryNumber: `JE-PUR-${purchase.purchaseNumber}-${Date.now()}`,
                date: purchase.purchaseDate,
                narration: `Purchase approval for ${purchase.purchaseNumber}`,
                status: "posted"
            }, session);

            // creating journal entry lines and ledger entries
            // 1. Inventory Asset debit
            await this.journalEntryLineDao.create({
                journalEntryId: journalEntry._id,
                accountId: inventoryAccount._id,
                debit: purchase.subTotal,
                credit: 0
            }, session);

            await this.ledgerEntryDao.create({
                organizationId,
                accountId: inventoryAccount._id,
                journalEntryId: journalEntry._id,
                date: purchase.purchaseDate,
                debit: purchase.subTotal,
                credit: 0
            }, session);

            // 2. GST Input Asset debit (if taxTotal > 0)
            if (purchase.taxTotal > 0) {

                await this.journalEntryLineDao.create({
                    journalEntryId: journalEntry._id,
                    accountId: gstInputAccount._id,
                    debit: purchase.taxTotal,
                    credit: 0
                }, session);

                await this.ledgerEntryDao.create({
                    organizationId,
                    accountId: gstInputAccount._id,
                    journalEntryId: journalEntry._id,
                    date: purchase.purchaseDate,
                    debit: purchase.taxTotal,
                    credit: 0
                }, session);

            }

            // 3. Accounts Payable credit
            await this.journalEntryLineDao.create({
                journalEntryId: journalEntry._id,
                accountId: apAccount._id,
                debit: 0,
                credit: purchase.grandTotal
            }, session);

            await this.ledgerEntryDao.create({
                organizationId,
                accountId: apAccount._id,
                journalEntryId: journalEntry._id,
                date: purchase.purchaseDate,
                debit: 0,
                credit: purchase.grandTotal
            }, session);

            // updating status of purchase to received (approved)
            purchase.status = "received";
            await purchase.save({ session });

            // committing transaction
            await session.commitTransaction();

            // returning the approved purchase
            return Ok(res, "Purchase approved successfully", purchase);

        } catch (error) {

            // aborting transaction on failure
            await session.abortTransaction();
            throw error;

        } finally {

            // ending the session
            session.endSession();

        }

    }

    // list all organization purchases (vendor bills)
    listPurchases = async (req, res) => {

        const organizationId = req.user.organizationId;

        // fetching purchases
        const purchases = await this.purchaseDao.find({ organizationId });

        // populating vendor names
        const populated = [];

        for (const purchase of purchases) {

            const vendor = await this.vendorDao.findOne({ _id: purchase.vendorId });
            populated.push({
                ...purchase.toObject(),
                partyName: vendor ? vendor.name : "Unknown Vendor"
            });

        }

        return Ok(res, "Purchases retrieved successfully", populated);

    }

    // helper to get or create account
    getOrCreateAccount = async (organizationId, name, code, type, session) => {

        // looking up existing account by organization and code
        let account = await this.accountDao.Model.findOne({
            organizationId,
            code
        }).session(session);

        if (!account) {

            // creating a new account if not found
            account = new this.accountDao.Model({
                organizationId,
                name,
                code,
                type,
                status: "active"
            });

            await account.save({ session });

        }

        return account;

    }

}

export default PurchasesController;
