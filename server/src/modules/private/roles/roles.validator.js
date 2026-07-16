// Importing modules
import { body } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";

const createRoleValidators = [
    // validating name field
    body("name")
        .notEmpty()
        .withMessage("Role name is required")
        .isLength({ min: 2 })
        .withMessage("Role name must be at least 2 characters long"),

    // validating code field
    body("code")
        .notEmpty()
        .withMessage("Role code is required")
        .isLength({ min: 2 })
        .withMessage("Role code must be at least 2 characters long")
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage("Role code must be alphanumeric and can contain underscores"),

    // validating description field
    body("description")
        .optional()
        .isString(),

    // validating errors
    validateErrors
];

export { createRoleValidators };
