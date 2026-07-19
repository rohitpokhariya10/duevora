// Importing modules 
import mongoose from "mongoose";

import { COOKIE_EXPIRY_TIME, REFRESH_TOKEN_COOKIE_OPTIONS } from "../constants/tokens.constants.js";
import { generateAccessToken, generateRefreshToken } from "./token.util.js";
import buildTokenPayload from "./buildTokenPayload.util.js";

// function to create a session and return sanitized user with tokens
async function createSession(user, res, sessionDao) {

    // building the full token payload with employee/org/roles/permissions
    const tokenPayload = await buildTokenPayload(user);

    // creating a session id
    const sessionId = new mongoose.Types.ObjectId();

    // making a refresh token using the session id and the user id
    const refreshToken = generateRefreshToken({
        sessionId: sessionId.toString(),
        userId: user._id.toString()
    });

    // creating a new session using the session dao
    await sessionDao.createSession({
        _id: sessionId,
        userId: user._id,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + COOKIE_EXPIRY_TIME)
    });

    // making an access token using the payload
    const accessToken = generateAccessToken(tokenPayload);

    // setting refresh token in the cookie
    res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    return { sanitizedUser: tokenPayload, accessToken };

}

export default createSession;
