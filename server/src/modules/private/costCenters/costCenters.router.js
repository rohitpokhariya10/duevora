import express from "express";
import CostCentersController from "./costCenters.controller.js";
import { createCostCenterValidators } from "./costCenters.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new CostCentersController();

router.post("/", authMiddleware, permissionMiddleware("costCenters.create"), createCostCenterValidators, controller.createCostCenter);

export default router;
