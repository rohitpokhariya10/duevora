import express from "express";
import FinancialYearsController from "./financialYears.controller.js";
import { createFinancialYearValidators, archiveFinancialYearValidators } from "./financialYears.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new FinancialYearsController();

// @route POST /api/financial-years
router.post("/", authMiddleware, permissionMiddleware("financialYears.create"), createFinancialYearValidators, controller.createFinancialYear);

// @route POST /api/financial-years/:fyId/archive
router.post("/:fyId/archive", authMiddleware, permissionMiddleware("financialYears.archive"), archiveFinancialYearValidators, controller.archiveFinancialYear);

export default router;

