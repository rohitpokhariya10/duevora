import express from "express";
import BankTransactionsController from "./bankTransactions.controller.js";
import { createBankTransactionValidators } from "./bankTransactions.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new BankTransactionsController();

router.post("/", authMiddleware, permissionMiddleware("bankTransactions.create"), createBankTransactionValidators, controller.createBankTransaction);

export default router;
