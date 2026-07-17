import express from "express";
import BankAccountsController from "./bankAccounts.controller.js";
import { createBankAccountValidators } from "./bankAccounts.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new BankAccountsController();

router.post("/", authMiddleware, permissionMiddleware("bankAccounts.create"), createBankAccountValidators, controller.createBankAccount);

export default router;
