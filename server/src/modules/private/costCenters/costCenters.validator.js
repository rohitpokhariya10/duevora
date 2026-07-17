// Importing modules
import { body } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";

const createCostCenterValidators = [
    body("name")
        .notEmpty().withMessage("Cost center name is required").isString(),

    body("code")
        .notEmpty().withMessage("Cost center code is required")
        .matches(/^[a-zA-Z0-9_]+$/).withMessage("Code must be alphanumeric or contain underscores"),

    body("status")
        .optional().isIn(["active", "inactive"]).withMessage("Invalid status"),

    validateErrors
];

export { createCostCenterValidators };
