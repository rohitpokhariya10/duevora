// Importing modules
import { body } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";
import mongoose from "mongoose";

const createReminderValidators = [
    body("title")
        .notEmpty().withMessage("Reminder title is required").isString(),

    body("dueDate")
        .notEmpty().withMessage("Due date is required")
        .isISO8601().withMessage("Due date must be a valid ISO 8601 date"),

    body("status")
        .optional().isIn(["pending", "completed"]).withMessage("Invalid status"),

    body("invoiceId")
        .optional()
        .custom((v) => v === null || mongoose.Types.ObjectId.isValid(v)).withMessage("Invalid Invoice ID"),

    body("paymentId")
        .optional()
        .custom((v) => v === null || mongoose.Types.ObjectId.isValid(v)).withMessage("Invalid Payment ID"),

    body("description")
        .optional().isString(),

    validateErrors
];

export { createReminderValidators };
