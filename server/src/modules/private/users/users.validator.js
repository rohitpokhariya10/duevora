// Importing modules
import { query } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";

const listUsersValidators = [
    // validating page query param
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),

    // validating limit query param
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),

    // validating sortOrder query param
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("Sort order must be either asc or desc"),

    // validating errors
    validateErrors
];

export { listUsersValidators };
