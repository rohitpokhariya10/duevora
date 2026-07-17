import express from "express";
import AuditLogsController from "./auditLogs.controller.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new AuditLogsController();

router.get("/", authMiddleware, permissionMiddleware("auditLogs.view"), controller.listAuditLogs);

export default router;
