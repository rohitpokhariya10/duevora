// Importing modules
import express from "express";
import DepartmentsController from "./departments.controller.js";
import { createDepartmentValidators } from "./departments.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new DepartmentsController();

/*
    @route POST /api/departments
    @desc Create a new department in the current organization
    @access Private (requires departments.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("departments.create"), createDepartmentValidators, controller.createDepartment);

export default router;
