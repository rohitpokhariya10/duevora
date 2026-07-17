import { jest } from "@jest/globals";
jest.setTimeout(20000);
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
const { default: FinancialYear } = await import("../../../shared/models/financialYear.model.js");

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

    // seed both permissions needed by the suite
    await Permission.create([
        { name: "Create Financial Years", code: "FINANCIALYEARS.CREATE", module: "financialYears" },
        { name: "Archive Financial Years", code: "FINANCIALYEARS.ARCHIVE", module: "financialYears" },
    ]);

    // admin user — full permissions via org-owner role
    await User.create({ name: "Admin User", email: "admin@example.com", password: "password123", isVerified: true });
    const loginRes = await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "password123" });
    const token = loginRes.body.data.accessToken;

    const onboardRes = await request(app)
        .post("/api/organization")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Test Corp", code: "TCORP", firstName: "Admin", lastName: "User" });

    adminUserToken = onboardRes.body.data.accessToken;
    orgId = onboardRes.body.data.organization._id;

    // normal user without any permissions
    const normalUser = await User.create({ name: "Normal User", email: "normal@example.com", password: "password123", isVerified: true });
    await Employee.create({ userId: normalUser._id, organizationId: orgId, employeeCode: "EMP-002", firstName: "Normal", lastName: "User", email: "normal@example.com", status: "active" });
    const normalLogin = await request(app).post("/api/auth/login").send({ email: "normal@example.com", password: "password123" });
    userWithoutPermToken = normalLogin.body.data.accessToken;
});

describe("Financial Years — Archive Integration Tests", () => {
    describe("POST /api/financial-years/:fyId/archive", () => {

        it("should archive an open financial year successfully", async () => {
            // create a financial year first
            const fyRes = await request(app)
                .post("/api/financial-years")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ name: "FY 2026-27", startDate: "2026-04-01", endDate: "2027-03-31" });

            expect(fyRes.status).toBe(201);
            const fyId = fyRes.body.data._id;

            const res = await request(app)
                .post(`/api/financial-years/${fyId}/archive`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.isClosed).toBe(true);
            expect(res.body.data._id).toBe(fyId);
        });

        it("should return 400 if financial year is already archived", async () => {
            // create and directly mark as closed in DB
            const fy = await FinancialYear.create({
                organizationId: orgId,
                name: "FY 2025-26",
                startDate: new Date("2025-04-01"),
                endDate: new Date("2026-03-31"),
                isClosed: true,
            });

            const res = await request(app)
                .post(`/api/financial-years/${fy._id}/archive`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("should return 404 if financial year does not exist", async () => {
            const fakeId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .post(`/api/financial-years/${fakeId}/archive`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(404);
        });

        it("should return 400 if fyId is not a valid ObjectId", async () => {
            const res = await request(app)
                .post("/api/financial-years/not-a-valid-id/archive")
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(400);
        });

        it("should return 403 if user does not have financialYears.archive permission", async () => {
            const fy = await FinancialYear.create({
                organizationId: orgId,
                name: "FY 2026-27",
                startDate: new Date("2026-04-01"),
                endDate: new Date("2027-03-31"),
            });

            const res = await request(app)
                .post(`/api/financial-years/${fy._id}/archive`)
                .set("Authorization", `Bearer ${userWithoutPermToken}`);

            expect(res.status).toBe(403);
        });

        it("should return 401 if no token is provided", async () => {
            const fakeId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .post(`/api/financial-years/${fakeId}/archive`);

            expect(res.status).toBe(401);
        });
    });
});
