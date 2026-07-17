// Importing modules
import { body, param } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";
import mongoose from "mongoose";

const createInvoiceValidators = [
    // validating customerId field
    body("customerId")
        .notEmpty()
        .withMessage("Customer ID is required")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Customer ID"),

    // validating invoiceNumber field
    body("invoiceNumber")
        .notEmpty()
        .withMessage("Invoice number is required")
        .isString(),

    // validating invoiceDate field
    body("invoiceDate")
        .notEmpty()
        .withMessage("Invoice date is required")
        .isISO8601()
        .withMessage("Invoice date must be a valid ISO 8601 date"),

    // validating dueDate field
    body("dueDate")
        .optional()
        .isISO8601()
        .withMessage("Due date must be a valid ISO 8601 date"),

    // validating items array
    body("items")
        .isArray({ min: 1 })
        .withMessage("Items must be a non-empty array"),

    // validating productId inside items array
    body("items.*.productId")
        .notEmpty()
        .withMessage("Product ID is required")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Product ID"),

    // validating quantity inside items array
    body("items.*.quantity")
        .notEmpty()
        .withMessage("Quantity is required")
        .isInt({ min: 1 })
        .withMessage("Quantity must be at least 1"),

    // validating unitPrice inside items array
    body("items.*.unitPrice")
        .notEmpty()
        .withMessage("Unit price is required")
        .isFloat({ min: 0 })
        .withMessage("Unit price cannot be negative"),

    // validating taxId inside items array
    body("items.*.taxId")
        .optional()
        .custom((value) => value === null || mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Tax ID"),

    // validating discountAmount inside items array
    body("items.*.discountAmount")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Discount amount cannot be negative"),

    // validating errors
    validateErrors
];

const approveInvoiceValidators = [
    // validating invoiceId param
    param("invoiceId")
        .notEmpty()
        .withMessage("Invoice ID is required")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Invoice ID"),

    // validating errors
    validateErrors
];

export {
    createInvoiceValidators,
    approveInvoiceValidators
};
