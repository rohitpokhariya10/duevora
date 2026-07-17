import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

// Mock utilities that make external network calls
jest.unstable_mockModule("../../../shared/utils/sendMail.util.js", () => ({
    __esModule: true,
    default: (...args) => {
        if (globalThis.mockSendMail) {
            return globalThis.mockSendMail(...args);
        }
    },
}));

jest.unstable_mockModule("../../../shared/utils/googleAuth.util.js", () => ({
    __esModule: true,
    getGoogleAuthorizationUrl: jest.fn(() => "https://google.com/oauth"),
    getGoogleUserFromCode: jest.fn(() => ({
        googleId: "google-12345",
        email: "googleuser@example.com",
        name: "Google User",
    })),
    verifyGoogleToken: jest.fn(() => ({
        googleId: "google-12345",
        email: "googleuser@example.com",
        name: "Google User",
    })),
}));

// Dynamically import application files after mocks have been registered
const { default: createApp } = await import("../../../app.js");
const { default: User } = await import("../../../shared/models/user.model.js");
const { default: Token } = await import("../../../shared/models/token.model.js");

let mongoServer;
let app;

beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    app = createApp();
});

afterAll(async () => {
    // Disconnect database and stop memory server
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    // Clear all collections to ensure test isolation
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
    
    // Initialize/Reset the global mock function
    globalThis.mockSendMail = jest.fn();
    jest.clearAllMocks();
});

describe("Public Authentication API Integration Tests", () => {

    describe("POST /api/auth/signup", () => {

        const validSignupPayload = {
            name: "John Doe",
            email: "john@example.com",
            password: "password123",
            confirmPassword: "password123"
        };

        it("should successfully signup a new user, create a session, and send verification OTP", async () => {
            const res = await request(app)
                .post("/api/auth/signup")
                .send(validSignupPayload);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.status).toBe(201);
            expect(res.body.message).toContain("Otp Sent Successfully");
            expect(res.body.data.user).toBeDefined();
            expect(res.body.data.user.name).toBe(validSignupPayload.name);
            expect(res.body.data.user.email).toBe(validSignupPayload.email);
            expect(res.body.data.user.isVerified).toBe(false);
            expect(res.body.data.accessToken).toBeDefined();

            // Verify cookie is set
            expect(res.headers["set-cookie"]).toBeDefined();
            expect(res.headers["set-cookie"][0]).toContain("refreshToken=");

            // Verify user exists in database
            const dbUser = await User.findOne({ email: validSignupPayload.email });
            expect(dbUser).toBeDefined();
            expect(dbUser.name).toBe(validSignupPayload.name);

            // Verify OTP token is created
            const dbOtp = await Token.findOne({ email: validSignupPayload.email, type: "otp" });
            expect(dbOtp).toBeDefined();
            expect(dbOtp.value).toBeDefined();

            // Verify mail function was triggered
            expect(globalThis.mockSendMail).toHaveBeenCalledTimes(1);
        });

        it("should return validation error if parameters are missing or invalid", async () => {
            const invalidPayload = {
                name: "Jo", // Min 3 chars
                email: "not-an-email",
                password: "123", // Min 6 chars
                confirmPassword: "different-password"
            };

            const res = await request(app)
                .post("/api/auth/signup")
                .send(invalidPayload);

            expect(res.status).toBe(400);
            expect(res.body.message).toBeDefined();
        });

    });

    describe("POST /api/auth/login", () => {

        beforeEach(async () => {
            // Seed a local verified user for testing login
            await User.create({
                name: "Jane Doe",
                email: "jane@example.com",
                password: "password123",
                isVerified: true,
                providers: ["local"]
            });
        });

        it("should log in successfully with correct credentials", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "jane@example.com",
                    password: "password123"
                });

            expect(res.status).toBe(200);
            expect(res.body.data.user.email).toBe("jane@example.com");
            expect(res.body.data.accessToken).toBeDefined();
            expect(res.headers["set-cookie"]).toBeDefined();
        });

        it("should fail with invalid password", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "jane@example.com",
                    password: "wrongpassword"
                });

            expect(res.status).toBe(401);
            expect(res.body.message).toContain("Invalid email or password");
        });

        it("should fail with non-existent user email", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "nonexistent@example.com",
                    password: "password123"
                });

            expect(res.status).toBe(404);
            expect(res.body.message).toContain("User not found");
        });

    });

    describe("POST /api/auth/forgot-password & reset-password", () => {

        beforeEach(async () => {
            await User.create({
                name: "Reset User",
                email: "reset@example.com",
                password: "password123",
                isVerified: true,
                providers: ["local"]
            });
        });

        it("should process forgot password and reset password successfully", async () => {
            // Trigger forgot password
            const forgotRes = await request(app)
                .post("/api/auth/forgot-password")
                .send({ email: "reset@example.com" });

            expect(forgotRes.status).toBe(200);
            expect(forgotRes.body.message).toContain("Reset password Mail sent Successfully");

            // Verify token is in DB
            const dbToken = await Token.findOne({ email: "reset@example.com", type: "reset" });
            expect(dbToken).toBeDefined();

            // Trigger reset password using token
            const resetRes = await request(app)
                .post("/api/auth/reset-password")
                .send({
                    token: dbToken.value,
                    password: "newsecurepassword"
                });

            expect(resetRes.status).toBe(200);
            expect(resetRes.body.message).toContain("Password reset Successfully");

            // Verify password was changed by logging in with new password
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "reset@example.com",
                    password: "newsecurepassword"
                });
            expect(loginRes.status).toBe(200);
        });

    });

});
