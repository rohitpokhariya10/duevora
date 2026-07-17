import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

jest.unstable_mockModule("../../../shared/utils/sendMail.util.js", () => ({ __esModule: true, default: jest.fn() }));

const { default: createApp } = await import("../../../app.js");
const { default: User } = await import("../../../shared/models/user.model.js");
const { default: Permission } = await import("../../../shared/models/permission.model.js");
const { default: Notification } = await import("../../../shared/models/notification.model.js");

let mongoServer, app, orgId, adminUserToken;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    for (const key in mongoose.connection.collections) { await mongoose.connection.collections[key].deleteMany({}); }
    await Permission.create({ name: "View Notifications", code: "NOTIFICATIONS.VIEW", module: "notifications" });
    await User.create({ name: "Admin User", email: "admin@example.com", password: "password123", isVerified: true });
    const loginRes = await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "password123" });
    const onboardRes = await request(app).post("/api/organization").set("Authorization", `Bearer ${loginRes.body.data.accessToken}`)
        .send({ name: "Test Corp", code: "TCORP", firstName: "Admin", lastName: "User" });
    adminUserToken = onboardRes.body.data.accessToken;
    orgId = onboardRes.body.data.organization._id;
});

describe("Notifications Integration Tests", () => {
    describe("GET /api/notifications", () => {
        it("should return empty list when no notifications", async () => {
            const res = await request(app).get("/api/notifications").set("Authorization", `Bearer ${adminUserToken}`);
            expect(res.status).toBe(200);
            expect(res.body.data.notifications).toHaveLength(0);
            expect(res.body.data.total).toBe(0);
        });

        it("should return notifications for the current user", async () => {
            const user = await User.findOne({ email: "admin@example.com" });
            await Notification.create([
                { organizationId: orgId, userId: user._id, title: "Invoice Due", message: "Invoice INV-001 is due today" },
                { organizationId: orgId, userId: user._id, title: "Payment Received", message: "Payment of $500 received" }
            ]);
            const res = await request(app).get("/api/notifications").set("Authorization", `Bearer ${adminUserToken}`);
            expect(res.status).toBe(200);
            expect(res.body.data.total).toBe(2);
        });
    });
});
