// Importing modules
import express from "express";
import StockMovementsController from "./stockMovements.controller.js";
import { listStockMovementsValidators } from "./stockMovements.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new StockMovementsController();

/*
    @route GET /api/stock-movements
    @desc List stock movements with pagination and optional filters
    @access Private (requires stockMovements.view permission)
*/
router.get("/", authMiddleware, permissionMiddleware("stockMovements.view"), listStockMovementsValidators, controller.listStockMovements);

export default router;
