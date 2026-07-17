// Importing modules
import { query } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";
import mongoose from "mongoose";

const listStockMovementsValidators = [
    // validating productId query param
    query("productId")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Product ID"),

    // validating warehouseId query param
    query("warehouseId")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Warehouse ID"),

    // validating type query param
    query("type")
        .optional()
        .isIn(["in", "out"])
        .withMessage("Type must be either in or out"),

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

    // validating errors
    validateErrors
];

export { listStockMovementsValidators };
