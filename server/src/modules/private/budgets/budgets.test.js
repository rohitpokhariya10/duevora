import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

jest.unstable_mockModule("../../../shared/utils/sendMail.util.js", () => ({ __esModule: true, default: jest.fn() }));

const { default: createApp } = await import("../../../app.js");
const { default: User } = await import("../../../shared/models/user.model.js");
const { default: Employee } = await import("../../../shared/models/employee.model.js");
const { default: Permission } = await import("../../../shared/models/permission.model.js");
const { default: Account } = await import("../../../shared/models/account.model.js");
const { default: FinancialYear } = await import("../../../shared/models/financialYear.model.js");
const { default: Budget } = await import("../../../shared/models/budget.model.js");

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
    await Permission.create({ name: "Create Budgets", code: "BUDGETS.CREATE", module: "budgets" });
    const adminUser = await User.create({ name: "Admin User", email: "admin@example.com", password: "password123", isVerified: true });
    const loginRes = await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "password123" });
    const onboardRes = await request(app).post("/api/organization").set("Authorization", `Bearer ${loginRes.body.data.accessToken}`)
        .send({ name: "Test Corp", code: "TCORP", firstName: "Admin", lastName: "User" });
    adminUserToken = onboardRes.body.data.accessToken;
    orgId = onboardRes.body.data.organization._id;

    const normalUser = await User.create({ name: "Normal User", email: "normal@example.com", password: "password123", isVerified: true });
    await Employee.create({ userId: normalUser._id, organizationId: orgId, employeeCode: "EMP-002", firstName: "Normal", lastName: "User", email: "normal@example.com", status: "active" });
    const normalLogin = await request(app).post("/api/auth/login").send({ email: "normal@example.com", password: "password123" });
    userWithoutPermToken = normalLogin.body.data.accessToken;
});

describe("Budgets Management Integration Tests", () => {
    let fy, account;

    beforeEach(async () => {
        fy = await FinancialYear.create({ name: "FY 2026-27", startDate: new Date("2026-04-01"), endDate: new Date("2027-03-31"), organizationId: orgId });
        account = await Account.create({ name: "Marketing Expense", code: "MKT_EXP", type: "expense", organizationId: orgId });
    });

    describe("POST /api/budgets", () => {
        it("should successfully create a budget", async () => {
            const res = await request(app)
                .post("/api/budgets")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ financialYearId: fy._id, accountId: account._id, amount: 50000 });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.amount).toBe(50000);
        });

        it("should return conflict if budget already exists for same fy+account", async () => {
            await Budget.create({ organizationId: orgId, financialYearId: fy._id, accountId: account._id, amount: 25000 });
            const res = await request(app)
                .post("/api/budgets")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ financialYearId: fy._id, accountId: account._id, amount: 10000 });
            expect(res.status).toBe(409);
        });

        it("should return forbidden without permission", async () => {
            const res = await request(app)
                .post("/api/budgets")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({ financialYearId: fy._id, accountId: account._id, amount: 5000 });
            expect(res.status).toBe(403);
        });
    });
});
