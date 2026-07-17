// Importing modules
import { body } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";

const createProjectValidators = [
    body("name")
        .notEmpty().withMessage("Project name is required").isString(),

    body("code")
        .notEmpty().withMessage("Project code is required")
        .matches(/^[a-zA-Z0-9_]+$/).withMessage("Code must be alphanumeric or contain underscores"),

    body("customerId")
        .optional(),

    body("status")
        .optional().isIn(["active", "inactive"]).withMessage("Invalid status"),

    validateErrors
];

export { createProjectValidators };
