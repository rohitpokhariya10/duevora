import express from "express";
import RemindersController from "./reminders.controller.js";
import { createReminderValidators } from "./reminders.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new RemindersController();

router.post("/", authMiddleware, permissionMiddleware("reminders.create"), createReminderValidators, controller.createReminder);

export default router;
