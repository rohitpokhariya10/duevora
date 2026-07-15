// Importing modules 

import UserDao from "../../../shared/dao/user.dao.js";
import SessionDao from "../../../shared/dao/session.dao.js";
import TokenDao from "../../../shared/dao/token.dao.js";

import { COOKIE_EXPIRY_TIME, REFRESH_TOKEN_COOKIE_OPTIONS, OTP_EXPIRY_TIME, RESET_PASSWORD_TOKEN_EXPIRY_TIME } from "../../../shared/constants/tokens.constants.js";

import { generateAccessToken, generateOTPToken, generateRefreshToken, generateResetPasswordToken } from "../../../shared/utils/token.util.js";
import sendMail from "../../../shared/utils/sendMail.util.js";
import { getGoogleAuthorizationUrl, getGoogleUserFromCode, verifyGoogleToken } from "../../../shared/utils/googleAuth.util.js";
import crypto from "crypto";
import createSession from "../../../shared/utils/createSession.util.js";

import sanitizeUser from "../../../shared/sanitizers/user.sanitizer.js";

import Created from "../../../shared/responses/Created.response.js";

import Unauthorized from "../../../shared/errors/Unauthorized.error.js";
import BadRequest from "../../../shared/errors/BadRequest.error.js";
import NotFound from "../../../shared/errors/NotFound.error.js";
import Conflict from "../../../shared/errors/Conflict.error.js";
import Ok from "../../../shared/responses/Ok.response.js";

import env from "../../../shared/config/env.config.js";

// clas to handle authentication operations
class AuthController {

    constructor() {

        // initializing the user dao
        this.userDao = new UserDao();

        // initializing the session dao
        this.sessionDao = new SessionDao();

        // initializing the token dao
        this.tokenDao = new TokenDao();

    }

    signup = async (req, res) => {

        // getting the user from the request body
        const { name, email, password } = req.body;

        // creating a new user using the user dao
        const user = await this.userDao.createUser({
            name,
            email,
            password,
            providers: ["local"]
        });

        // creating session and tokens
        const { sanitizedUser, accessToken } = await createSession(user, res, this.sessionDao);

        // generate the otp to verify the user email
        const otp = generateOTPToken();

        // setting otp in the database using the token dao
        await this.tokenDao.createToken({
            email: user.email,
            type: "otp",
            value: otp,
            expiresAt: new Date(Date.now() + OTP_EXPIRY_TIME)
        });

        sendMail(user.email, "Verify your email", `Your OTP is ${otp}. It will expire in ${OTP_EXPIRY_TIME / 60000} minutes.`);

        // seding response with access token
        return Created(res, "Otp Sent Successfully for verification", { user: sanitizedUser, accessToken: accessToken });

    }

    login = async (req, res) => {

        // getting the user from the request body
        const { email, password } = req.body;

        // finding the user using the user dao
        const user = await this.userDao.findUserByEmail(email);

        // checking if the user exists
        if (!user) {
            throw new NotFound("User not found");
        }

        // checking if the password is valid
        const isPasswordValid = await user.comparePassword(password);

        // if the password is not valid, throw an unauthorized error
        if (!isPasswordValid) {
            throw new Unauthorized("Invalid email or password");
        }

        // creating session and tokens
        const { sanitizedUser, accessToken } = await createSession(user, res, this.sessionDao);

        // seding response with access token
        return Ok(res, "User Logged in Successfully", { user: sanitizedUser, accessToken: accessToken });
    }

    googleLogin = async (req, res) => {

        // getting the credential from the request body
        const { credential } = req.body;

        // verifying the Google credential token
        const googleUser = await verifyGoogleToken(credential);

        // finding the user by email
        let user = await this.userDao.findUserByEmail(googleUser.email);

        if (user) {

            // checking if the user already has google provider
            if (!user.providers.includes("google")) {

                // adding google to the providers list and setting googleId
                user = await this.userDao.updateUserById(user._id, {
                    $addToSet: { providers: "google" },
                    googleId: googleUser.googleId
                });

            }

        } else {

            // creating a new user with google provider
            user = await this.userDao.createUser({
                name: googleUser.name,
                email: googleUser.email,
                providers: ["google"],
                googleId: googleUser.googleId,
                isVerified: true
            });

        }

        // creating session and tokens
        const { sanitizedUser, accessToken } = await createSession(user, res, this.sessionDao);

        // seding response with access token
        return Ok(res, "User Logged in Successfully via Google", { user: sanitizedUser, accessToken: accessToken });

    }

    googleRedirect = (req, res) => {
        const state = crypto.randomUUID();
        res.cookie("googleOAuthState", state, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 10 * 60 * 1000,
        });

        // Capture client origin from referer or query
        let clientOrigin = env.FRONTEND_URL;
        if (req.headers.referer) {
            try {
                clientOrigin = new URL(req.headers.referer).origin;
            } catch (err) {
                // ignore invalid URL referers
            }
        }
        res.cookie("googleOAuthOrigin", clientOrigin, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 10 * 60 * 1000,
        });

        return res.redirect(getGoogleAuthorizationUrl(state));
    }

    googleCallback = async (req, res) => {
        const { code, state, error } = req.query;
        const clientOrigin = req.cookies.googleOAuthOrigin || env.FRONTEND_URL;
        const redirectToLogin = `${clientOrigin}/login?googleError=1`;

        if (error || !code || !state || state !== req.cookies.googleOAuthState) {
            res.clearCookie("googleOAuthState");
            res.clearCookie("googleOAuthOrigin");
            return res.redirect(redirectToLogin);
        }
        res.clearCookie("googleOAuthState");
        res.clearCookie("googleOAuthOrigin");

        const googleUser = await getGoogleUserFromCode(code);
        let user = await this.userDao.findUserByEmail(googleUser.email);

        if (user && !user.providers.includes("google")) {
            user = await this.userDao.updateUserById(user._id, {
                $addToSet: { providers: "google" },
                googleId: googleUser.googleId,
                isVerified: true,
            });
        } else if (!user) {
            user = await this.userDao.createUser({
                name: googleUser.name,
                email: googleUser.email,
                providers: ["google"],
                googleId: googleUser.googleId,
                isVerified: true,
            });
        }

        await createSession(user, res, this.sessionDao);
        return res.redirect(`${clientOrigin}/dashboard`);
    }

    verifyEmail = async (req, res) => {

        // getting the otp from the request
        const { otp } = req.body;

        // taking the user id from the request
        const user = req.user;

        // finding the otp in the database using the token dao
        const token = await this.tokenDao.findTokenByValue(otp);

        // checking if the token exists
        if (!token) {

            // if the token does not exist, throw an unauthorized error
            throw new BadRequest("Invalid OTP");

        }

        // Updating the user
        const updatedUser = await this.userDao.updateUserById(user._id, { isVerified: true });

        // sanitizing the updated user 
        const sanitizedUser = sanitizeUser(updatedUser);

        // generating the new accesstoken
        const accessToken = generateAccessToken(sanitizedUser);

        return Ok(res, "Email Verified Successfully", { user: sanitizedUser, accessToken: accessToken });

    }

    sendOtp = async (req, res) => {

        // taking the user from the request 
        const user = req.user;

        // deleting the old token if exist
        const oldOtp = await this.tokenDao.deleteTokenByEmail(user.email, "otp");

        // generating the new token 
        const otp = generateOTPToken();

        // setting the otp in the databse 
        const otpSet = await this.tokenDao.createToken(
            {
                email: user.email,
                type: "otp",
                value: otp,
                expiresAt: new Date(Date.now() + OTP_EXPIRY_TIME)
            }
        );

        // Sending the otp to the user
        sendMail(user.email, "Verify your email", `Your OTP is ${otp}. It will expire in ${OTP_EXPIRY_TIME / 60000} minutes.`);

        // returning the response 
        return Ok(res, "Otp Sent SuccessFully");

    }

    forgotPassword = async (req, res) => {

        // getting the email from the request body 
        const { email } = req.body;

        // Deleting the resetToken if any
        const oldResetToken = await this.tokenDao.deleteTokenByEmail(email, "reset");

        // generating the new reset token 
        const resetToken = generateResetPasswordToken();

        // setting the reset token in the databse 
        const resetTokenSet = await this.tokenDao.createToken({
            email: email,
            type: "reset",
            value: resetToken,
            expiresAt: new Date(Date.now() + RESET_PASSWORD_TOKEN_EXPIRY_TIME)
        });

        // Sending the reset Password Token as a magic link to the email
        sendMail(email, "Your reset Password Link", `Click the link and reset your password <a href="${env.FRONTEND_URL}/reset-password/${resetToken}">Reset Your Password</a>`);

        // Sending the response 
        return Ok(res, "Reset password Mail sent Successfully");

    }

    resetPassword = async (req, res) => {

        // getting the token from the request body 
        const { token, password } = req.body;

        // Finding the token 
        const resetToken = await this.tokenDao.findTokenByValue(token);

        if (!resetToken) {

            // throw notfound error and return 
            throw new NotFound("Reset token not found.");

        }

        // Finding the user from the email 
        const user = await this.userDao.findUserByEmail(resetToken.email);

        // setting the new password
        user.password = password;

        // enabling local auth if the user was google-only
        if (!user.providers.includes("local")) {
            user.providers.push("local");
        }

        // saving the user
        await user.save();

        // delteing the token 
        await this.tokenDao.deleteTokenByValue(token);

        // seding the response 
        return Ok(res, "Password reset Successfully");

    }

    refresh = async (req, res) => {

        // getting the refresh token from the request object
        const refreshToken = req.refreshToken;

        // getting the session from the request object
        const session = req.session;

        // getting the session from the database using the session dao
        const sessionInDb = await this.sessionDao.findSessionByRefreshTokenandSessionId(refreshToken, session.sessionId);

        // if the session is not found, throw an unauthorized error
        if (!sessionInDb || !sessionInDb.userId) {

            // if the session is not found, throw an unauthorized error
            throw new Unauthorized("Session not found.");

        }

        // getting the sanitized user from the session
        const sanitizedUser = sanitizeUser(sessionInDb.userId);

        // generate the new access token using the user id from the session
        const accessToken = generateAccessToken(sanitizedUser);

        // generating a new refresh token using the session id and the user id from the session
        const newRefreshToken = generateRefreshToken({
            sessionId: session.sessionId,
            userId: sessionInDb.userId._id.toString()
        });

        // updating the session in the database with the new refresh token and the new expiry time
        const updatedSession = await this.sessionDao.updateSessionByRefreshTokenandSessionId(refreshToken, session.sessionId, {
            refreshToken: newRefreshToken,
            expiresAt: new Date(Date.now() + COOKIE_EXPIRY_TIME)
        });

        // setting the new refresh token in the cookie
        res.cookie("refreshToken", newRefreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

        // sending the response with the new access token
        return Ok(res, "Access token refreshed successfully", { accessToken: accessToken });

    }

    me = async (req, res) => {

        // getting the refresh token from the request object
        const refreshToken = req.refreshToken;

        // getting the session from the request object
        const session = req.session;

        // getting the session from the database using the session dao
        const sessionInDb = await this.sessionDao.findSessionByRefreshTokenandSessionId(refreshToken, session.sessionId);

        // if the session is not found, throw an unauthorized error
        if (!sessionInDb || !sessionInDb.userId) {

            // if the session is not found, throw an unauthorized error
            throw new Unauthorized("Session not found.");

        }

        // getting the sanitized user from the session
        const sanitizedUser = sanitizeUser(sessionInDb.userId);

        // generating a new access token using the user id from the session
        const accessToken = generateAccessToken(sanitizedUser);

        // sending the response with the sanitized user
        return Ok(res, "User fetched successfully", { user: sanitizedUser, accessToken: accessToken });

    }

    logout = async (req, res) => {

        // getting the refresh token from the request object
        const refreshToken = req.refreshToken;

        // getting the session from the request object
        const session = req.session;

        // deleting the session from the database using the session dao
        const deletedSession = await this.sessionDao.deleteSessionByRefreshTokenandSessionId(refreshToken, session.sessionId);

        // clearing the refresh token from the cookie
        res.clearCookie("refreshToken", REFRESH_TOKEN_COOKIE_OPTIONS);

        // sending the response
        return Ok(res, "User logged out successfully");

    }

    logoutAll = async (req, res) => {

        // getting the user id from the request object
        const userId = req.session.userId;

        // deleting all the sessions for the user from the database using the session dao
        const deletedSessions = await this.sessionDao.deleteSessionByUserId(userId);

        // clearing the refresh token from the cookie
        res.clearCookie("refreshToken", REFRESH_TOKEN_COOKIE_OPTIONS);

        // sending the response
        return Ok(res, "User logged out from all devices successfully");

    }

}

export default AuthController;
