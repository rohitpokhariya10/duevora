import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

jest.unstable_mockModule("../../../shared/utils/sendMail.util.js", () => ({ __esModule: true, default: jest.fn() }));

const { default: createApp } = await import("../../../app.js");
const { default: User } = await import("../../../shared/models/user.model.js");
const { default: Permission } = await import("../../../shared/models/permission.model.js");
const { default: AuditLog } = await import("../../../shared/models/auditLog.model.js");

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
    await Permission.create({ name: "View Audit Logs", code: "AUDITLOGS.VIEW", module: "auditLogs" });
    await User.create({ name: "Admin User", email: "admin@example.com", password: "password123", isVerified: true });
    const loginRes = await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "password123" });
    const onboardRes = await request(app).post("/api/organization").set("Authorization", `Bearer ${loginRes.body.data.accessToken}`)
        .send({ name: "Test Corp", code: "TCORP", firstName: "Admin", lastName: "User" });
    adminUserToken = onboardRes.body.data.accessToken;
    orgId = onboardRes.body.data.organization._id;
});

describe("Audit Logs Integration Tests", () => {
    describe("GET /api/audit-logs", () => {
        it("should return empty list when no logs", async () => {
            const res = await request(app).get("/api/audit-logs").set("Authorization", `Bearer ${adminUserToken}`);
            expect(res.status).toBe(200);
            expect(res.body.data.logs).toHaveLength(0);
        });

        it("should return audit logs for the organization", async () => {
            const user = await User.findOne({ email: "admin@example.com" });
            await AuditLog.create([
                { organizationId: orgId, userId: user._id, action: "CREATE", entityType: "Customer", entityId: "cust-001" },
                { organizationId: orgId, userId: user._id, action: "UPDATE", entityType: "Invoice", entityId: "inv-001" }
            ]);
            const res = await request(app).get("/api/audit-logs").set("Authorization", `Bearer ${adminUserToken}`);
            expect(res.status).toBe(200);
            expect(res.body.data.total).toBe(2);
        });
    });
});
