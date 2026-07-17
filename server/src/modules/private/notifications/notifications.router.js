import express from "express";
import NotificationsController from "./notifications.controller.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new NotificationsController();

router.get("/", authMiddleware, permissionMiddleware("notifications.view"), controller.listNotifications);

export default router;
