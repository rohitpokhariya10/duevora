// Importing modules
import { body } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";
import mongoose from "mongoose";

const createJournalEntryValidators = [
    // validating entryNumber field
    body("entryNumber")
        .notEmpty()
        .withMessage("Entry number is required")
        .isString(),

    // validating date field
    body("date")
        .notEmpty()
        .withMessage("Date is required")
        .isISO8601()
        .withMessage("Date must be a valid ISO 8601 date"),

    // validating narration field
    body("narration")
        .optional()
        .isString(),

    // validating status field
    body("status")
        .optional()
        .isIn(["draft", "posted"])
        .withMessage("Invalid status"),

    // validating lines array
    body("lines")
        .isArray({ min: 2 })
        .withMessage("Journal entry must contain at least 2 lines"),

    // validating accountId inside lines array
    body("lines.*.accountId")
        .notEmpty()
        .withMessage("Account reference is required")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Account ID"),

    // validating debit inside lines array
    body("lines.*.debit")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Debit cannot be negative"),

    // validating credit inside lines array
    body("lines.*.credit")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Credit cannot be negative"),

    // validating errors
    validateErrors
];

export { createJournalEntryValidators };
