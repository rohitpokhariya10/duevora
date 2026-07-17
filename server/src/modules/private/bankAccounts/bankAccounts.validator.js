// Importing modules
import { body } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";
import mongoose from "mongoose";

const createBankAccountValidators = [
    body("bankName")
        .notEmpty().withMessage("Bank name is required").isString(),

    body("accountNumber")
        .notEmpty().withMessage("Account number is required").isString(),

    body("ifscCode")
        .optional().isString(),

    body("branch")
        .optional().isString(),

    body("accountId")
        .notEmpty().withMessage("Account reference is required")
        .custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage("Invalid Account ID"),

    validateErrors
];

export { createBankAccountValidators };
