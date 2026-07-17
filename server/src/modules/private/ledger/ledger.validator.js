// Importing modules
import { query } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";
import mongoose from "mongoose";

const getLedgerValidators = [
    // validating accountId query parameter
    query("accountId")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Account ID"),

    // validating startDate query parameter
    query("startDate")
        .optional()
        .isISO8601()
        .withMessage("Start date must be a valid ISO 8601 date"),

    // validating endDate query parameter
    query("endDate")
        .optional()
        .isISO8601()
        .withMessage("End date must be a valid ISO 8601 date"),

    // validating page query parameter
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),

    // validating limit query parameter
    query("limit")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Limit must be a positive integer"),

    // validating errors
    validateErrors
];

export { getLedgerValidators };
