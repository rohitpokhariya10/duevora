// Importing modules
import express from "express";
import AuthController from "./auth.controller.js";
import { signupValidators, loginValidators, forgotPasswordValidators, resetPasswordValidators, googleLoginValidators } from "./auth.validattor.js";

// making the router
const router = express.Router();

// creating a auth controller instance
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

// exporting the router
export default router;
