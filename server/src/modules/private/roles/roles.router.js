// Importing modules
import express from "express";
import RolesController from "./roles.controller.js";
import { createRoleValidators, bindPermissionsValidators } from "./roles.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

// making the router
const router = express.Router();

// creating a RolesController instance
const controller = new RolesController();

/*
    @route POST /api/roles
    @desc Create a new role in the current organization
    @access Private (requires roles.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("roles.create"), createRoleValidators, controller.createRole);

/*
    @route GET /api/roles
    @desc List all roles for the organization
    @access Private (requires roles.view permission)
*/
router.get("/", authMiddleware, permissionMiddleware("roles.view"), controller.listRoles);

/*
    @route GET /api/roles/permissions
    @desc List all system permissions
    @access Private (requires roles.view permission)
*/
router.get("/permissions", authMiddleware, permissionMiddleware("roles.view"), controller.listPermissions);

/*
    @route POST /api/roles/:roleId/permissions
    @desc Bind permissions to a role
    @access Private (requires roles.update permission)
*/
router.post("/:roleId/permissions", authMiddleware, permissionMiddleware("roles.update"), bindPermissionsValidators, controller.bindPermissions);

// exporting the router
export default router;
