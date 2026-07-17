// Importing modules
import { body } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";
import mongoose from "mongoose";

const createExchangeRateValidators = [
    // validating currencyId field
    body("currencyId")
        .notEmpty()
        .withMessage("Currency ID is required")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Currency ID"),

    // validating rate field
    body("rate")
        .notEmpty()
        .withMessage("Exchange rate is required")
        .isFloat({ min: 0.000001 })
        .withMessage("Rate must be greater than zero"),

    // validating effectiveDate field
    body("effectiveDate")
        .notEmpty()
        .withMessage("Effective date is required")
        .isISO8601()
        .withMessage("Effective date must be a valid ISO 8601 date"),

    // validating errors
    validateErrors
];

export { createExchangeRateValidators };
