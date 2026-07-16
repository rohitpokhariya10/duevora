// Importing modules
import { body } from "express-validator";
import mongoose from "mongoose";
import validateErrors from "../../../shared/utils/validateErrors.util.js";

const createDepartmentValidators = [
    // validating name field
    body("name")
        .notEmpty()
        .withMessage("Department name is required")
        .isLength({ min: 2 })
        .withMessage("Department name must be at least 2 characters long"),

    // validating code field
    body("code")
        .notEmpty()
        .withMessage("Department code is required")
        .isLength({ min: 2 })
        .withMessage("Department code must be at least 2 characters long")
        .isAlphanumeric()
        .withMessage("Department code must be alphanumeric"),

    // validating managerId field
    body("managerId")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Manager ID"),

    // validating errors
    validateErrors
];

export { createDepartmentValidators };
