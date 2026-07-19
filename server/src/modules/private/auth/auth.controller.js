// Importing modules
import UserDao from "../../../shared/dao/user.dao.js";
import SessionDao from "../../../shared/dao/session.dao.js";
import TokenDao from "../../../shared/dao/token.dao.js";

import { COOKIE_EXPIRY_TIME, REFRESH_TOKEN_COOKIE_OPTIONS, OTP_EXPIRY_TIME } from "../../../shared/constants/tokens.constants.js";

import { generateAccessToken, generateOTPToken, generateRefreshToken } from "../../../shared/utils/token.util.js";
import sendMail from "../../../shared/utils/sendMail.util.js";
import createSession from "../../../shared/utils/createSession.util.js";

import buildTokenPayload from "../../../shared/utils/buildTokenPayload.util.js";

import Unauthorized from "../../../shared/errors/Unauthorized.error.js";
import BadRequest from "../../../shared/errors/BadRequest.error.js";
import Ok from "../../../shared/responses/Ok.response.js";

// class to handle private authentication operations
class AuthController {

    constructor() {

        // initializing the user dao
        this.userDao = new UserDao();

        // initializing the session dao
        this.sessionDao = new SessionDao();

        // initializing the token dao
        this.tokenDao = new TokenDao();

    }

    // verify email using otp
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

        // updating the user
        const updatedUser = await this.userDao.updateUserById(user._id, { isVerified: true });

        // building the full token payload with employee/org/roles/permissions
        const tokenPayload = await buildTokenPayload(updatedUser);

        // generating the new accesstoken
        const accessToken = generateAccessToken(tokenPayload);

        // returning the verified user with access token
        return Ok(res, "Email Verified Successfully", { user: tokenPayload, accessToken: accessToken });

    }

    // send otp to user email
    sendOtp = async (req, res) => {

        // taking the user from the request
        const user = req.user;

        // deleting the old token if exist
        const oldOtp = await this.tokenDao.deleteTokenByEmail(user.email, "otp");

        // generating the new token
        const otp = generateOTPToken();

        // setting the otp in the database
        const otpSet = await this.tokenDao.createToken(
            {
                email: user.email,
                type: "otp",
                value: otp,
                expiresAt: new Date(Date.now() + OTP_EXPIRY_TIME)
            }
        );

        // sending the otp to the user
        sendMail(user.email, "Verify your email", `Your OTP is ${otp}. It will expire in ${OTP_EXPIRY_TIME / 60000} minutes.`);

        // returning the response
        return Ok(res, "Otp Sent SuccessFully");

    }

    // refresh access token using refresh token cookie
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

        // building the full token payload with employee/org/roles/permissions
        const tokenPayload = await buildTokenPayload(sessionInDb.userId);

        // generate the new access token using the full payload
        const accessToken = generateAccessToken(tokenPayload);

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

        // returning the new access token
        return Ok(res, "Access token refreshed successfully", { accessToken: accessToken });

    }

    // get current authenticated user details
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

        // building the full token payload with employee/org/roles/permissions
        const tokenPayload = await buildTokenPayload(sessionInDb.userId);

        // generating a new access token using the full payload
        const accessToken = generateAccessToken(tokenPayload);

        // returning the authenticated user with a fresh access token
        return Ok(res, "User fetched successfully", { user: tokenPayload, accessToken: accessToken });

    }

    // logout user from current session
    logout = async (req, res) => {

        // getting the refresh token from the request object
        const refreshToken = req.refreshToken;

        // getting the session from the request object
        const session = req.session;

        // deleting the session from the database using the session dao
        const deletedSession = await this.sessionDao.deleteSessionByRefreshTokenandSessionId(refreshToken, session.sessionId);

        // clearing the refresh token from the cookie
        res.clearCookie("refreshToken", REFRESH_TOKEN_COOKIE_OPTIONS);

        // returning success response
        return Ok(res, "User logged out successfully");

    }

    // logout user from all devices
    logoutAll = async (req, res) => {

        // getting the user id from the request object
        const userId = req.session.userId;

        // deleting all the sessions for the user from the database using the session dao
        const deletedSessions = await this.sessionDao.deleteSessionByUserId(userId);

        // clearing the refresh token from the cookie
        res.clearCookie("refreshToken", REFRESH_TOKEN_COOKIE_OPTIONS);

        // returning success response
        return Ok(res, "User logged out from all devices successfully");

    }

}

export default AuthController;
