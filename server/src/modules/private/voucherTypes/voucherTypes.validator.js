// Importing modules
import { body } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";

const createVoucherTypeValidators = [
    // validating name field
    body("name")
        .notEmpty()
        .withMessage("Voucher type name is required")
        .isString()
        .trim(),

    // validating code field
    body("code")
        .notEmpty()
        .withMessage("Voucher type code is required")
        .isAlphanumeric()
        .withMessage("Voucher type code must be alphanumeric")
        .trim(),

    // validating description field
    body("description")
        .optional()
        .isString(),

    // validating errors
    validateErrors
];

export { createVoucherTypeValidators };
