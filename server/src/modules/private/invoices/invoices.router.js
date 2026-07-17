// Importing modules
import express from "express";
import InvoicesController from "./invoices.controller.js";
import { createInvoiceValidators, approveInvoiceValidators } from "./invoices.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new InvoicesController();

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

export default router;
