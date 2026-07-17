// Importing modules
import express from "express";
import SalesOrdersController from "./salesOrders.controller.js";
import { createSalesOrderValidators, approveSalesOrderValidators } from "./salesOrders.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new SalesOrdersController();

/*
    @route POST /api/sales-orders
    @desc Create a new sales order
    @access Private (requires salesOrders.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("salesOrders.create"), createSalesOrderValidators, controller.createSalesOrder);

/*
    @route POST /api/sales-orders/:orderId/approve
    @desc Approve a sales order
    @access Private (requires salesOrders.update permission)
*/
router.post("/:orderId/approve", authMiddleware, permissionMiddleware("salesOrders.update"), approveSalesOrderValidators, controller.approveSalesOrder);

export default router;
