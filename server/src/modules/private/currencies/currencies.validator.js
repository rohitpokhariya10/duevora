// Importing modules
import { body } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";

const createCurrencyValidators = [
    // validating name field
    body("name")
        .notEmpty()
        .withMessage("Currency name is required")
        .isString()
        .withMessage("Currency name must be a string"),

    // validating code field
    body("code")
        .notEmpty()
        .withMessage("Currency code is required")
        .isString()
        .withMessage("Currency code must be a string"),

    // validating symbol field
    body("symbol")
        .notEmpty()
        .withMessage("Currency symbol is required")
        .isString()
        .withMessage("Currency symbol must be a string"),

    // validating isBase field
    body("isBase")
        .optional()
        .isBoolean()
        .withMessage("isBase must be a boolean"),

    // validating errors
    validateErrors
];

export { createCurrencyValidators };
