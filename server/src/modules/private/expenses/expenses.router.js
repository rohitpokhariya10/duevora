// Importing modules
import express from "express";
import ExpensesController from "./expenses.controller.js";
import { createExpenseValidators } from "./expenses.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new ExpensesController();

/*
    @route POST /api/expenses
    @desc Record a new expense
    @access Private (requires expenses.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("expenses.create"), createExpenseValidators, controller.createExpense);

export default router;
