import express from "express";
import ReportsController from "./reports.controller.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new ReportsController();

router.get("/trial-balance", authMiddleware, permissionMiddleware("reports.view"), controller.trialBalance);
router.get("/profit-loss", authMiddleware, permissionMiddleware("reports.view"), controller.profitLoss);
router.get("/balance-sheet", authMiddleware, permissionMiddleware("reports.view"), controller.balanceSheet);
router.get("/cash-flow", authMiddleware, permissionMiddleware("reports.view"), controller.cashFlow);

export default router;
