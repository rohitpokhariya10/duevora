// Importing modules
import express from "express";
import PurchasesController from "./purchases.controller.js";
import { createPurchaseValidators, approvePurchaseValidators } from "./purchases.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

// making the router
const router = express.Router();

// creating a PurchasesController instance
const controller = new PurchasesController();

/*
    @route POST /api/purchases
    @desc Record a new purchase (vendor bill) in the current organization
    @access Private (requires purchases.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("purchases.create"), createPurchaseValidators, controller.createPurchase);

/*
    @route GET /api/purchases
    @desc List all purchases (vendor bills) in the organization
    @access Private (requires purchases.view permission)
*/
router.get("/", authMiddleware, permissionMiddleware("purchases.view"), controller.listPurchases);

/*
    @route POST /api/purchases/:purchaseId/approve
    @desc Approve a recorded purchase (vendor bill)
    @access Private (requires purchases.update permission)
*/
router.post("/:purchaseId/approve", authMiddleware, permissionMiddleware("purchases.update"), approvePurchaseValidators, controller.approvePurchase);

// exporting the router
export default router;
