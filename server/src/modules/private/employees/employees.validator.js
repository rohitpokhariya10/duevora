// Importing modules
import { body } from "express-validator";
import mongoose from "mongoose";
import validateErrors from "../../../shared/utils/validateErrors.util.js";

const inviteValidators = [
    // validating email
    body("email")
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Email is invalid"),

    // validating roleId
    body("roleId")
        .notEmpty()
        .withMessage("Role ID is required")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Role ID"),

    // validating errors
    validateErrors
];

const createEmployeeValidators = [
    // validating employeeCode
    body("employeeCode")
        .notEmpty()
        .withMessage("Employee code is required")
        .isLength({ min: 2 })
        .withMessage("Employee code must be at least 2 characters long"),

    // validating firstName
    body("firstName")
        .notEmpty()
        .withMessage("First name is required"),

    // validating lastName
    body("lastName")
        .notEmpty()
        .withMessage("Last name is required"),

    // validating email
    body("email")
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Email is invalid"),

    // validating departmentId
    body("departmentId")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Department ID"),

    // validating userId
    body("userId")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid User ID"),

    // validating phone
    body("phone")
        .optional()
        .isString(),

    // validating joiningDate
    body("joiningDate")
        .optional()
        .isISO8601()
        .withMessage("Joining date must be a valid ISO8601 date string"),

    // validating errors
    validateErrors
];

const bulkImportValidators = [
    // validating employees array
    body("employees")
        .isArray({ min: 1 })
        .withMessage("Employees must be a non-empty array"),

    // validating employeeCode inside array
    body("employees.*.employeeCode")
        .notEmpty()
        .withMessage("Employee code is required")
        .isLength({ min: 2 })
        .withMessage("Employee code must be at least 2 characters long"),

    // validating firstName inside array
    body("employees.*.firstName")
        .notEmpty()
        .withMessage("First name is required"),

    // validating lastName inside array
    body("employees.*.lastName")
        .notEmpty()
        .withMessage("Last name is required"),

    // validating email inside array
    body("employees.*.email")
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Email is invalid"),

    // validating departmentId inside array
    body("employees.*.departmentId")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Department ID"),

    // validating userId inside array
    body("employees.*.userId")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid User ID"),

    // validating phone inside array
    body("employees.*.phone")
        .optional()
        .isString(),

    // validating joiningDate inside array
    body("employees.*.joiningDate")
        .optional()
        .isISO8601()
        .withMessage("Joining date must be a valid ISO8601 date string"),

    // validating errors
    validateErrors
];

export { inviteValidators, createEmployeeValidators, bulkImportValidators };
