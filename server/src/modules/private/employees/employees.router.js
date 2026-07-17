// Importing modules
import express from "express";
import EmployeesController from "./employees.controller.js";
import { inviteValidators, createEmployeeValidators, bulkImportValidators } from "./employees.validator.js";
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

/*
    @route POST /api/employees/bulk-import
    @desc Bulk import employee profiles using transactions
    @access Private (requires employees.create permission)
*/
router.post("/bulk-import", authMiddleware, permissionMiddleware("employees.create"), bulkImportValidators, controller.bulkImportEmployees);

export default router;
