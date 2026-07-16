// Importing modules
import { body } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";
import mongoose from "mongoose";

const createCategoryValidators = [
    // validating name field
    body("name")
        .notEmpty()
        .withMessage("Category name is required")
        .isString()
        .withMessage("Category name must be a string"),

    // validating code field
    body("code")
        .notEmpty()
        .withMessage("Category code is required")
        .isString()
        .withMessage("Category code must be a string"),

    // validating parentId field
    body("parentId")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Parent Category ID"),

    // validating errors
    validateErrors
];

export { createCategoryValidators };
