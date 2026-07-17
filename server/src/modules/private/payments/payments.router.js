// Importing modules
import express from "express";
import PaymentsController from "./payments.controller.js";
import { createPaymentValidators } from "./payments.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new PaymentsController();

/*
    @route POST /api/payments
    @desc Record a new payment (settling vendor bill)
    @access Private (requires payments.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("payments.create"), createPaymentValidators, controller.createPayment);

export default router;
