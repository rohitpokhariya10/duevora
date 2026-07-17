// Importing modules
import { body, param } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";
import mongoose from "mongoose";

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

const bindPermissionsValidators = [
    // validating roleId param
    param("roleId")
        .notEmpty()
        .withMessage("Role ID is required")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Role ID"),

    // validating permissionIds body array
    body("permissionIds")
        .isArray({ min: 1 })
        .withMessage("Permission IDs must be a non-empty array"),

    // validating individual permissionId inside array
    body("permissionIds.*")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Permission ID"),

    // validating errors
    validateErrors
];

export { createRoleValidators, bindPermissionsValidators };
