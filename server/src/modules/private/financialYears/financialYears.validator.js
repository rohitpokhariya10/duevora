// Importing modules
import { body, param } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";
import mongoose from "mongoose";

const createFinancialYearValidators = [
    body("name")
        .notEmpty().withMessage("Financial year name is required").isString(),

    body("startDate")
        .notEmpty().withMessage("Start date is required")
        .isISO8601().withMessage("Start date must be a valid ISO 8601 date"),

    body("endDate")
        .notEmpty().withMessage("End date is required")
        .isISO8601().withMessage("End date must be a valid ISO 8601 date"),

    validateErrors
];

const archiveFinancialYearValidators = [
    param("fyId")
        .notEmpty().withMessage("Financial year ID is required")
        .custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage("Invalid financial year ID"),

    validateErrors
];

export { createFinancialYearValidators, archiveFinancialYearValidators };
