// Importing modules
import express from "express";
import RolesController from "./roles.controller.js";
import { createRoleValidators } from "./roles.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new RolesController();

/*
    @route POST /api/roles
    @desc Create a new role in the current organization
    @access Private (requires roles.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("roles.create"), createRoleValidators, controller.createRole);

export default router;
