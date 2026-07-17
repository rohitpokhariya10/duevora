import express from "express";
import OpeningBalancesController from "./openingBalances.controller.js";
import { createOpeningBalanceValidators } from "./openingBalances.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new OpeningBalancesController();

router.post("/", authMiddleware, permissionMiddleware("openingBalances.create"), createOpeningBalanceValidators, controller.createOpeningBalance);

export default router;
