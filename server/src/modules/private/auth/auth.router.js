// Importing modules
import express from "express";
import AuthController from "./auth.controller.js";
import { verifyOtpValidators } from "./auth.validattor.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import getRefreshTokenFromCookie from "../../../shared/middlewares/refresh.middleware.js";

// making the router
const router = express.Router();

// creating a auth controller instance
const authController = new AuthController();

/*
    @route POST /api/auth/logout
    @desc Logout user
    @access Private
*/
router.post("/logout", authMiddleware, getRefreshTokenFromCookie, authController.logout);

/*
    @route POST /api/auth/logout-all
    @desc Logout user from all devices
    @access Private
*/
router.post("/logout-all", authMiddleware, getRefreshTokenFromCookie, authController.logoutAll);

/*
    @route POST /api/auth/refresh
    @desc Refresh access token
    @access Private
*/
router.post("/refresh", getRefreshTokenFromCookie, authController.refresh);

/* 
    @route GET /api/auth/me
    @desc Get user details
    @access Private
*/
router.get("/me", getRefreshTokenFromCookie, authController.me);

/*
    @route POST /api/auth/send-email
    @desc Send email
    @access Private
*/
router.post("/send-email", authMiddleware, authController.sendOtp);

/*
    @route POST /api/auth/verify-email
    @desc Verify email
    @access Private
*/
router.post("/verify-email", authMiddleware, verifyOtpValidators, authController.verifyEmail);

// exporting the router
export default router;
