// Importing modules
import express from "express";
import AccountsController from "./accounts.controller.js";
import { createAccountValidators } from "./accounts.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new AccountsController();

/*
    @route POST /api/accounts
    @desc Create a new account in chart of accounts
    @access Private (requires accounts.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("accounts.create"), createAccountValidators, controller.createAccount);

export default router;
