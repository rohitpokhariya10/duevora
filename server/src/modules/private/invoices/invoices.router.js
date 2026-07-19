// Importing modules
import express from "express";
import InvoicesController from "./invoices.controller.js";
import { createInvoiceValidators, approveInvoiceValidators } from "./invoices.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";
import { invoicePaymentLinksRouter } from "../paymentLinks/paymentLinks.router.js";

// making the router
const router = express.Router();

// creating a invoices controller instance
const controller = new InvoicesController();

// Invoice-scoped payment-link routes share the invoice URL while keeping provider logic isolated.
router.use("/:invoiceId/payment-link", invoicePaymentLinksRouter);

/*
    @route POST /api/invoices
    @desc Create a new invoice in the current organization
    @access Private (requires invoices.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("invoices.create"), createInvoiceValidators, controller.createInvoice);

/*
    @route POST /api/invoices/:invoiceId/approve
    @desc Approve a draft invoice
    @access Private (requires invoices.update permission)
*/
router.post("/:invoiceId/approve", authMiddleware, permissionMiddleware("invoices.update"), approveInvoiceValidators, controller.approveInvoice);

// exporting the router
export default router;
