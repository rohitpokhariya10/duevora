// Importing modules
import express from "express";
import BankTransactionsController from "./bankTransactions.controller.js";
import { createBankTransactionValidators } from "./bankTransactions.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

// making the router
const router = express.Router();

// creating a bankTransactions controller instance
const controller = new BankTransactionsController();

/*
    @route POST /api/bankTransactions
    @desc Record a new bank transaction against a bank account
    @access Private (requires bankTransactions.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("bankTransactions.create"), createBankTransactionValidators, controller.createBankTransaction);
router.get("/", authMiddleware, permissionMiddleware("bankTransactions.view"), controller.listBankTransactions);

// exporting the router
export default router;
