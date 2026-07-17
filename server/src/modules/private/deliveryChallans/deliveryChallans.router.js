// Importing modules
import express from "express";
import DeliveryChallansController from "./deliveryChallans.controller.js";
import { createDeliveryChallanValidators } from "./deliveryChallans.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new DeliveryChallansController();

/*
    @route POST /api/delivery-challans
    @desc Create a new delivery challan in the current organization
    @access Private (requires deliveryChallans.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("deliveryChallans.create"), createDeliveryChallanValidators, controller.createDeliveryChallan);

export default router;
