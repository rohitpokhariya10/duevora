// Importing modules
import express from "express";
import CategoriesController from "./categories.controller.js";
import { createCategoryValidators } from "./categories.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const controller = new CategoriesController();

/*
    @route POST /api/categories
    @desc Create a new category in the current organization
    @access Private (requires categories.create permission)
*/
router.post("/", authMiddleware, permissionMiddleware("categories.create"), createCategoryValidators, controller.createCategory);

export default router;
