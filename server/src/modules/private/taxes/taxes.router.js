// Importing modules
import express from "express";
import TaxesController from "./taxes.controller.js";
import { createTaxValidators } from "./taxes.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

// making the router
const router = express.Router();

// creating a Taxes controller instance
const controller = new TaxesController();

/*
    @route POST /api/taxes
    @desc Create a new tax rate in the current organization
    @access Private (requires taxes.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("taxes.create"), createTaxValidators, controller.createTax);
router.get("/", authMiddleware, permissionMiddleware("taxes.view"), controller.listTaxes);

// exporting the router
export default router;
