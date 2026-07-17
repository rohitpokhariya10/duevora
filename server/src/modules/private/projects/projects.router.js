import express from "express";
import ProjectsController from "./projects.controller.js";
import { createProjectValidators } from "./projects.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new ProjectsController();

router.post("/", authMiddleware, permissionMiddleware("projects.create"), createProjectValidators, controller.createProject);

export default router;
