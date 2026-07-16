// Importing modules
import Session from "../models/sessions.model.js";

// class to handle session data access operations
class SessionDao {

    constructor() {

        // initializing the session model
        this.SessionModel = Session;

    }

    // function to create a new session
    async createSession(sessionData) {

        // creating a new session using the session model and returning the created session
        const session = this.SessionModel.create(sessionData);

        return session;

    }

    // function to find a session by refresh token
    async findSessionByRefreshTokenandSessionId(refreshToken, sessionId) {

        // finding a session by refresh token using the session model and returning the found session
        return await this.SessionModel.findOne({
            refreshToken: refreshToken,
            _id: sessionId
        }).populate("userId", "-password -__v");

    }

    // function to delete a session by refresh token
    async deleteSessionByRefreshTokenandSessionId(refreshToken, sessionId) {

        // deleting a session by refresh token using the session model and returning the deleted session
        return await this.SessionModel.findOneAndDelete({
            refreshToken: refreshToken,
            _id: sessionId
        });

    }

    async deleteSessionByUserId(userId) {

        // deleting a session by user id using the session model and returning the deleted session
        return await this.SessionModel.deleteMany({
            userId: userId
        });

    }

    async updateSessionByRefreshTokenandSessionId(refreshToken, sessionId, updateData) {

        // updating a session by refresh token using the session model and returning the updated session
        return await this.SessionModel.findOneAndUpdate({
            refreshToken: refreshToken,
            _id: sessionId
        }, updateData, { returnDocument: "after" });

    }

    async findById(id, session = null) {
        return await this.SessionModel.findById(id).populate("userId").session(session);
    }

    async find(filter = {}, options = {}, session = null) {
        let query = this.SessionModel.find(filter).populate("userId").session(session);
        if (options.sort) query = query.sort(options.sort);
        if (options.limit) query = query.limit(options.limit);
        if (options.skip) query = query.skip(options.skip);
        return await query;
    }

    async deleteById(id, session = null) {
        return await this.SessionModel.findByIdAndDelete(id, { session });
    }

}

export default SessionDao;
