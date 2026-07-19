import express from "express";
import WebhooksController from "./webhooks.controller.js";

const router = express.Router();
const controller = new WebhooksController();

router.post("/simulate-payment", controller.simulatePayment);
router.post("/send-reminder", controller.sendReminder);
router.post("/trigger-due-check", controller.triggerDueCheck);

export default router;
