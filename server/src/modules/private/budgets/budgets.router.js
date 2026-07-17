import express from "express";
import BudgetsController from "./budgets.controller.js";
import { createBudgetValidators } from "./budgets.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new BudgetsController();

router.post("/", authMiddleware, permissionMiddleware("budgets.create"), createBudgetValidators, controller.createBudget);

export default router;
