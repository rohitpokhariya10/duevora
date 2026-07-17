// Importing modules
import mongoose from "mongoose";
import InvoiceDao from "../../../shared/dao/invoice.dao.js";
import InvoiceItemDao from "../../../shared/dao/invoiceItem.dao.js";
import CustomerDao from "../../../shared/dao/customer.dao.js";
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

// class to handle invoice operations
class InvoicesController {

    constructor() {

        // initializing the daos
        this.invoiceDao = new InvoiceDao();
        this.invoiceItemDao = new InvoiceItemDao();
        this.customerDao = new CustomerDao();
        this.productDao = new ProductDao();
        this.taxDao = new TaxDao();
        this.warehouseDao = new WarehouseDao();
        this.inventoryDao = new InventoryDao();
        this.stockMovementDao = new StockMovementDao();
        this.accountDao = new AccountDao();
        this.journalEntryDao = new JournalEntryDao();
        this.journalEntryLineDao = new JournalEntryLineDao();
        this.ledgerEntryDao = new LedgerEntryDao();

    }

    // create a new invoice (draft state)
    createInvoice = async (req, res) => {

        const { customerId, invoiceNumber, invoiceDate, dueDate, items } = req.body;
        const organizationId = req.user.organizationId;

        // starting a mongodb transaction session
        const session = await mongoose.startSession();
        session.startTransaction();

        try {

            // validating customer exists in organization
            const customer = await this.customerDao.findOne({
                _id: customerId,
                organizationId
            }, session);

            if (!customer) {

                throw new NotFound("Customer reference not found in your organization.");

            }

            // verifying invoice number is unique within organization context
            const existingInvoice = await this.invoiceDao.findOne({
                organizationId,
                invoiceNumber: {
                    $regex: new RegExp(`^${invoiceNumber.trim()}$`, "i")
                }
            }, session);

            if (existingInvoice) {

                throw new Conflict("Invoice number already exists in your organization.");

            }

            // calculating items totals
            let subTotal = 0;
            let taxTotal = 0;
            let discountTotal = 0;
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

                const itemDiscount = item.discountAmount || 0;
                const itemSubtotal = item.quantity * item.unitPrice;
                const taxableAmount = Math.max(0, itemSubtotal - itemDiscount);

                if (taxRate > 0) {

                    taxAmount = taxableAmount * (taxRate / 100);

                }

                const itemTotal = taxableAmount + taxAmount;

                subTotal += itemSubtotal;
                discountTotal += itemDiscount;
                taxTotal += taxAmount;
                grandTotal += itemTotal;

                processedItems.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxId: item.taxId || undefined,
                    taxAmount,
                    discountAmount: itemDiscount,
                    total: itemTotal
                });

            }

            // creating invoice record using invoice dao
            const invoice = await this.invoiceDao.create({
                organizationId,
                customerId,
                invoiceNumber: invoiceNumber.trim(),
                invoiceDate: new Date(invoiceDate),
                dueDate: dueDate ? new Date(dueDate) : undefined,
                subTotal,
                taxTotal,
                discountTotal,
                grandTotal,
                status: "draft"
            }, session);

            // creating all related invoice item records
            for (const item of processedItems) {

                await this.invoiceItemDao.create({
                    invoiceId: invoice._id,
                    ...item
                }, session);

            }

            // committing transaction
            await session.commitTransaction();

            return Created(res, "Invoice created successfully", invoice);

        } catch (error) {

            // aborting transaction on failure
            await session.abortTransaction();
            throw error;

        } finally {

            // ending the session
            session.endSession();

        }

    }

    // approve a draft invoice
    approveInvoice = async (req, res) => {

        const { invoiceId } = req.params;
        const organizationId = req.user.organizationId;

        // starting a mongodb transaction session
        const session = await mongoose.startSession();
        session.startTransaction();

        try {

            // finding the invoice within organization context
            const invoice = await this.invoiceDao.findOne({
                _id: invoiceId,
                organizationId
            }, session);

            if (!invoice) {

                throw new NotFound("Invoice not found in your organization.");

            }

            if (invoice.status !== "draft") {

                throw new BadRequest("Only draft invoices can be approved.");

            }

            // fetching all related invoice items
            const items = await this.invoiceItemDao.find({ invoiceId }, {}, session);

            if (!items || items.length === 0) {

                throw new BadRequest("Invoice must contain at least one item to be approved.");

            }

            // finding first warehouse in this organization to decrement inventory
            const warehouse = await this.warehouseDao.findOne({ organizationId }, session);

            if (!warehouse) {

                throw new BadRequest("No warehouse found in your organization to fulfill this invoice.");

            }

            // decrementing inventory and logging stock movements
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

                // updating inventory quantity (decrementing)
                inventory.quantity -= item.quantity;
                await inventory.save({ session });

                // logging OUT stock movement log entry
                await this.stockMovementDao.create({
                    organizationId,
                    productId: item.productId,
                    warehouseId: warehouse._id,
                    quantity: item.quantity,
                    type: "out",
                    referenceType: "Invoice",
                    referenceId: invoice._id,
                    date: new Date()
                }, session);

            }

            // getting or creating double entry bookkeeping accounts
            const arAccount = await this.getOrCreateAccount(
                organizationId,
                "Accounts Receivable",
                "ACCOUNTS_RECEIVABLE",
                "asset",
                session
            );

            const revenueAccount = await this.getOrCreateAccount(
                organizationId,
                "Sales Revenue",
                "SALES_REVENUE",
                "revenue",
                session
            );

            const taxAccount = await this.getOrCreateAccount(
                organizationId,
                "Tax Payable",
                "TAX_PAYABLE",
                "liability",
                session
            );

            // creating a journal entry
            const journalEntry = await this.journalEntryDao.create({
                organizationId,
                entryNumber: `JE-INV-${invoice.invoiceNumber}-${Date.now()}`,
                date: invoice.invoiceDate,
                narration: `Invoice approval for ${invoice.invoiceNumber}`,
                status: "posted"
            }, session);

            // creating journal entry lines and ledger entries
            // 1. Accounts Receivable debit
            await this.journalEntryLineDao.create({
                journalEntryId: journalEntry._id,
                accountId: arAccount._id,
                debit: invoice.grandTotal,
                credit: 0
            }, session);

            await this.ledgerEntryDao.create({
                organizationId,
                accountId: arAccount._id,
                journalEntryId: journalEntry._id,
                date: invoice.invoiceDate,
                debit: invoice.grandTotal,
                credit: 0
            }, session);

            // 2. Sales Revenue credit
            await this.journalEntryLineDao.create({
                journalEntryId: journalEntry._id,
                accountId: revenueAccount._id,
                debit: 0,
                credit: invoice.subTotal
            }, session);

            await this.ledgerEntryDao.create({
                organizationId,
                accountId: revenueAccount._id,
                journalEntryId: journalEntry._id,
                date: invoice.invoiceDate,
                debit: 0,
                credit: invoice.subTotal
            }, session);

            // 3. Tax Payable credit (if taxTotal > 0)
            if (invoice.taxTotal > 0) {

                await this.journalEntryLineDao.create({
                    journalEntryId: journalEntry._id,
                    accountId: taxAccount._id,
                    debit: 0,
                    credit: invoice.taxTotal
                }, session);

                await this.ledgerEntryDao.create({
                    organizationId,
                    accountId: taxAccount._id,
                    journalEntryId: journalEntry._id,
                    date: invoice.invoiceDate,
                    debit: 0,
                    credit: invoice.taxTotal
                }, session);

            }

            // updating status of invoice to sent (approved)
            invoice.status = "sent";
            await invoice.save({ session });

            // committing transaction
            await session.commitTransaction();

            return Ok(res, "Invoice approved successfully", invoice);

        } catch (error) {

            // aborting transaction on failure
            await session.abortTransaction();
            throw error;

        } finally {

            // ending the session
            session.endSession();

        }

    }

    // helper to get or create account
    getOrCreateAccount = async (organizationId, name, code, type, session) => {

        let account = await this.accountDao.Model.findOne({
            organizationId,
            code
        }).session(session);

        if (!account) {

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

export default InvoicesController;
