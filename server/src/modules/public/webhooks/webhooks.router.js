import express from "express";
import RazorpayWebhookController from "./razorpayWebhook.controller.js";

const router = express.Router();
const controller = new RazorpayWebhookController();

router.post(
    "/razorpay",
    express.raw({ type: "application/json", limit: "1mb" }),
    controller.handle
);

export default router;
