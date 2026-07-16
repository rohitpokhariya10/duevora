// Importing modules
import { body, query } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";

const createCustomerValidators = [
    // validating name field
    body("name")
        .notEmpty()
        .withMessage("Customer name is required")
        .isLength({ min: 2 })
        .withMessage("Customer name must be at least 2 characters long"),

    // validating email field
    body("email")
        .optional()
        .isEmail()
        .withMessage("Email is invalid"),

    // validating phone field
    body("phone")
        .optional()
        .isString(),

    // validating address field
    body("address")
        .optional()
        .isString(),

    // validating taxNumber field
    body("taxNumber")
        .optional()
        .isString(),

    // validating status field
    body("status")
        .optional()
        .isIn(["active", "inactive"])
        .withMessage("Status must be either active or inactive"),

    // validating errors
    validateErrors
];

const listCustomersValidators = [
    // validating page query param
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),

    // validating limit query param
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be an integer between 1 and 100"),

    // validating sortBy query param
    query("sortBy")
        .optional()
        .isString()
        .withMessage("sortBy must be a string"),

    // validating sortOrder query param
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("Sort order must be asc or desc"),

    // validating search query param
    query("search")
        .optional()
        .isString()
        .withMessage("Search term must be a string"),

    // validating errors
    validateErrors
];

export { createCustomerValidators, listCustomersValidators };
