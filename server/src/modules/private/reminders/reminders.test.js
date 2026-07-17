import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

jest.unstable_mockModule("../../../shared/utils/sendMail.util.js", () => ({
    __esModule: true,
    default: jest.fn(),
}));

const { default: createApp } = await import("../../../app.js");
const { default: User } = await import("../../../shared/models/user.model.js");
const { default: Employee } = await import("../../../shared/models/employee.model.js");
const { default: Permission } = await import("../../../shared/models/permission.model.js");

let mongoServer, app, orgId, adminUserToken, userWithoutPermToken;

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
    for (const key in mongoose.connection.collections) {
        await mongoose.connection.collections[key].deleteMany({});
    }

    await Permission.create({ name: "Create Reminders", code: "REMINDERS.CREATE", module: "reminders" });

    const adminUser = await User.create({ name: "Admin User", email: "admin@example.com", password: "password123", isVerified: true });
    const loginRes = await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "password123" });
    const token = loginRes.body.data.accessToken;

    const onboardRes = await request(app).post("/api/organization").set("Authorization", `Bearer ${token}`)
        .send({ name: "Test Corp", code: "TCORP", firstName: "Admin", lastName: "User" });
    adminUserToken = onboardRes.body.data.accessToken;
    orgId = onboardRes.body.data.organization._id;

    const normalUser = await User.create({ name: "Normal User", email: "normal@example.com", password: "password123", isVerified: true });
    await Employee.create({ userId: normalUser._id, organizationId: orgId, employeeCode: "EMP-002", firstName: "Normal", lastName: "User", email: "normal@example.com", status: "active" });
    const normalLogin = await request(app).post("/api/auth/login").send({ email: "normal@example.com", password: "password123" });
    userWithoutPermToken = normalLogin.body.data.accessToken;
});

describe("Reminders Management Integration Tests", () => {
    describe("POST /api/reminders", () => {
        it("should successfully create a reminder", async () => {
            const res = await request(app)
                .post("/api/reminders")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ title: "Follow up with client", dueDate: "2026-08-01", description: "Call regarding invoice" });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.title).toBe("Follow up with client");
            expect(res.body.data.status).toBe("pending");
        });

        it("should create a reminder with completed status", async () => {
            const res = await request(app)
                .post("/api/reminders")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ title: "Done task", dueDate: "2026-07-01", status: "completed" });

            expect(res.status).toBe(201);
            expect(res.body.data.status).toBe("completed");
        });

        it("should return forbidden without permission", async () => {
            const res = await request(app)
                .post("/api/reminders")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({ title: "Secret reminder", dueDate: "2026-08-15" });
            expect(res.status).toBe(403);
        });
    });
});
