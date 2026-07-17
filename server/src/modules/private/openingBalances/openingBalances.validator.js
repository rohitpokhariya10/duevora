// Importing modules
import { body } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";
import mongoose from "mongoose";

const createOpeningBalanceValidators = [
    body("financialYearId").notEmpty().withMessage("Financial year is required").custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage("Invalid Financial Year ID"),
    body("accountId").notEmpty().withMessage("Account reference is required").custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage("Invalid Account ID"),
    body("debit").optional().isFloat({ min: 0 }).withMessage("Debit cannot be negative"),
    body("credit").optional().isFloat({ min: 0 }).withMessage("Credit cannot be negative"),
    validateErrors
];

export { createOpeningBalanceValidators };
