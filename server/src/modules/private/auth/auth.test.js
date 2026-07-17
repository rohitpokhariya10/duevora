import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

// Mock utilities that make external network calls
jest.unstable_mockModule("../../../shared/utils/sendMail.util.js", () => ({
    __esModule: true,
    default: jest.fn(),
}));

// Dynamically import application files after mocks have been registered
const { default: createApp } = await import("../../../app.js");
const { default: User } = await import("../../../shared/models/user.model.js");
const { default: Token } = await import("../../../shared/models/token.model.js");
const { default: Session } = await import("../../../shared/models/sessions.model.js");

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
    jest.clearAllMocks();
});

describe("Private Authentication API Integration Tests", () => {

    describe("POST /api/auth/verify-email", () => {

        let testUser;
        let testAccessToken;
        let testOtp;

        beforeEach(async () => {
            // Seed user
            testUser = await User.create({
                name: "Verify Me",
                email: "verify@example.com",
                password: "password123",
                isVerified: false,
                providers: ["local"]
            });

            // Create validation token (OTP)
            testOtp = "123456";
            await Token.create({
                email: testUser.email,
                type: "otp",
                value: testOtp,
                expiresAt: new Date(Date.now() + 50000)
            });

            // Log in to get accessToken
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "verify@example.com",
                    password: "password123"
                });
            testAccessToken = loginRes.body.data.accessToken;
        });

        it("should verify email successfully with valid OTP and Authorization header", async () => {
            const res = await request(app)
                .post("/api/auth/verify-email")
                .set("Authorization", `Bearer ${testAccessToken}`)
                .send({ otp: testOtp });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain("Email Verified Successfully");
            expect(res.body.data.user.isVerified).toBe(true);

            // Verify in db
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.isVerified).toBe(true);
        });

        it("should fail validation if OTP is missing", async () => {
            const res = await request(app)
                .post("/api/auth/verify-email")
                .set("Authorization", `Bearer ${testAccessToken}`)
                .send({});

            expect(res.status).toBe(400);
        });

        it("should fail validation if OTP is invalid", async () => {
            const res = await request(app)
                .post("/api/auth/verify-email")
                .set("Authorization", `Bearer ${testAccessToken}`)
                .send({ otp: "wrongotp" });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("Invalid OTP");
        });

    });

    describe("POST /api/auth/refresh", () => {

        let refreshToken;
        let sessionId;

        beforeEach(async () => {
            const user = await User.create({
                name: "Refresh User",
                email: "refresh@example.com",
                password: "password123",
                isVerified: true,
                providers: ["local"]
            });

            // Make a login request to capture session cookies
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "refresh@example.com",
                    password: "password123"
                });

            const cookieHeader = res.headers["set-cookie"][0];
            refreshToken = cookieHeader.split(";")[0].split("=")[1];

            // Extract session id from database
            const dbSession = await Session.findOne({ userId: user._id });
            sessionId = dbSession._id.toString();
        });

        it("should refresh access token using refresh token in cookies", async () => {
            const res = await request(app)
                .post("/api/auth/refresh")
                .set("Cookie", [`refreshToken=${refreshToken}`]);

            expect(res.status).toBe(200);
            expect(res.body.data.accessToken).toBeDefined();
            expect(res.headers["set-cookie"]).toBeDefined();
        });

    });

});
