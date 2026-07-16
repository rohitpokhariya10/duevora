import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import SessionDao from "../session.dao.js";
import UserDao from "../user.dao.js";

const sessionDao = new SessionDao();
const userDao = new UserDao();

beforeAll(async () => {
    await connectTestDB();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearTestDB();
});

describe("Session DAO Tests", () => {
    let user;

    beforeEach(async () => {
        user = await userDao.createUser({
            name: "John Doe",
            email: "john@example.com",
            password: "password123"
        });
    });

    it("should create a session successfully", async () => {
        const sessionData = {
            userId: user._id,
            refreshToken: "token123",
            expiresAt: new Date(Date.now() + 3600 * 1000)
        };

        const session = await sessionDao.createSession(sessionData);
        expect(session).toBeDefined();
        expect(session.userId.toString()).toBe(user._id.toString());
        expect(session.refreshToken).toBe("token123");
    });

    it("should find session by refresh token and session id", async () => {
        const session = await sessionDao.createSession({
            userId: user._id,
            refreshToken: "token123",
            expiresAt: new Date(Date.now() + 3600 * 1000)
        });

        const found = await sessionDao.findSessionByRefreshTokenandSessionId("token123", session._id);
        expect(found).toBeDefined();
        expect(found.userId.email).toBe("john@example.com");
    });

    it("should update session by refresh token and session id", async () => {
        const session = await sessionDao.createSession({
            userId: user._id,
            refreshToken: "token123",
            expiresAt: new Date(Date.now() + 3600 * 1000)
        });

        const updated = await sessionDao.updateSessionByRefreshTokenandSessionId(
            "token123",
            session._id,
            { refreshToken: "newtoken123" }
        );
        expect(updated.refreshToken).toBe("newtoken123");
    });

    it("should delete session by refresh token and session id", async () => {
        const session = await sessionDao.createSession({
            userId: user._id,
            refreshToken: "token123",
            expiresAt: new Date(Date.now() + 3600 * 1000)
        });

        await sessionDao.deleteSessionByRefreshTokenandSessionId("token123", session._id);
        const found = await sessionDao.findById(session._id);
        expect(found).toBeNull();
    });

    it("should delete all sessions for a user id", async () => {
        await sessionDao.createSession({
            userId: user._id,
            refreshToken: "token1",
            expiresAt: new Date(Date.now() + 3600 * 1000)
        });
        await sessionDao.createSession({
            userId: user._id,
            refreshToken: "token2",
            expiresAt: new Date(Date.now() + 3600 * 1000)
        });

        await sessionDao.deleteSessionByUserId(user._id);
        const results = await sessionDao.find({ userId: user._id });
        expect(results.length).toBe(0);
    });
});
