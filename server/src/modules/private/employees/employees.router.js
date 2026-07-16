// Importing modules
import express from "express";
import EmployeesController from "./employees.controller.js";
import { inviteValidators, createEmployeeValidators } from "./employees.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new EmployeesController();

/*
    @route POST /api/employees/invite
    @desc Generate an employee invitation signup link
    @access Private (requires employees.create permission)
*/
router.post("/invite", authMiddleware, permissionMiddleware("employees.create"), inviteValidators, controller.inviteMember);

/*
    @route POST /api/employees
    @desc Create employee profile manually
    @access Private (requires employees.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("employees.create"), createEmployeeValidators, controller.createEmployee);

export default router;
