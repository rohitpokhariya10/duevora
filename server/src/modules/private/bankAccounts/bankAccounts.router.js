// Importing modules
import express from "express";
import BankAccountsController from "./bankAccounts.controller.js";
import { createBankAccountValidators } from "./bankAccounts.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

// making the router
const router = express.Router();

// creating a bankAccounts controller instance
const controller = new BankAccountsController();

/*
    @route POST /api/bankAccounts
    @desc Create a new bank account linked to a chart of accounts entry
    @access Private (requires bankAccounts.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("bankAccounts.create"), createBankAccountValidators, controller.createBankAccount);
router.get("/", authMiddleware, permissionMiddleware("bankAccounts.view"), controller.listBankAccounts);

// exporting the router
export default router;
