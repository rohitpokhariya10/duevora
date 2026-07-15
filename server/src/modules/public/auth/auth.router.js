// Importing modules
import express from "express";
import AuthController from "./auth.controller.js";
import { signupValidators, loginValidators, forgotPasswordValidators, resetPasswordValidators, verifyOtpValidators, googleLoginValidators } from "./auth.validattor.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import getRefreshTokenFromCookie from "../../../shared/middlewares/refresh.middleware.js";

// making the router
const router = express.Router();

// crating a auth controller instance
const authController = new AuthController();

/*
    @route POST /api/auth/signup
    @desc Signup user
    @access Public
*/
router.post("/signup", signupValidators, authController.signup);

/*
    @route POST /api/auth/login
    @desc Login user
    @access Public
*/
router.post("/login", loginValidators, authController.login);

/*
    @route POST /api/auth/google-login
    @desc Login user via Google
    @access Public
*/
router.post("/google-login", googleLoginValidators, authController.googleLogin);
router.get("/google", authController.googleRedirect);
router.get("/google/callback", authController.googleCallback);

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
    @route POST /api/auth/refresh-token
    @desc Refresh access token
    @access Private
*/
router.post("/refresh", getRefreshTokenFromCookie, authController.refresh);

/*

    @route POST /api/auth/forgot-password
    @desc Forgot password
    @access Public

*/
router.post("/forgot-password", forgotPasswordValidators, authController.forgotPassword);

/*
    @route POST /api/auth/reset-password
    @desc Reset password
    @access Public  
*/
router.post("/reset-password", resetPasswordValidators, authController.resetPassword);

/* 

    @route POST /api/auth/me
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

