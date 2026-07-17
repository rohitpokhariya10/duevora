// Importing modules
import { body, param } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";
import mongoose from "mongoose";

const createPurchaseValidators = [
    // validating vendorId field
    body("vendorId")
        .notEmpty()
        .withMessage("Vendor ID is required")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Vendor ID"),

    // validating purchaseNumber field
    body("purchaseNumber")
        .notEmpty()
        .withMessage("Purchase number is required")
        .isString(),

    // validating purchaseDate field
    body("purchaseDate")
        .notEmpty()
        .withMessage("Purchase date is required")
        .isISO8601()
        .withMessage("Purchase date must be a valid ISO 8601 date"),

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

    // validating errors
    validateErrors
];

const approvePurchaseValidators = [
    // validating purchaseId param
    param("purchaseId")
        .notEmpty()
        .withMessage("Purchase ID is required")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Purchase ID"),

    // validating errors
    validateErrors
];

export { createPurchaseValidators, approvePurchaseValidators };
