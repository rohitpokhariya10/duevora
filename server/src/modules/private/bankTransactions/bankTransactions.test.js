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
const { default: BankAccount } = await import("../../../shared/models/bankAccount.model.js");

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
    await Permission.create({ name: "Create Bank Transactions", code: "BANKTRANSACTIONS.CREATE", module: "bankTransactions" });
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

describe("Bank Transactions Management Integration Tests", () => {
    let bankAccount;

    beforeEach(async () => {
        const account = await Account.create({ name: "HDFC Current", code: "HDFC_CUR", type: "asset", organizationId: orgId });
        bankAccount = await BankAccount.create({ organizationId: orgId, bankName: "HDFC Bank", accountNumber: "1234567890", accountId: account._id });
    });

    describe("POST /api/bank-transactions", () => {
        it("should successfully record a bank deposit", async () => {
            const res = await request(app)
                .post("/api/bank-transactions")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ bankAccountId: bankAccount._id, transactionDate: "2026-07-17", amount: 10000, type: "deposit", reference: "REF-001" });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.type).toBe("deposit");
            expect(res.body.data.amount).toBe(10000);
        });

        it("should successfully record a bank withdrawal", async () => {
            const res = await request(app)
                .post("/api/bank-transactions")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ bankAccountId: bankAccount._id, transactionDate: "2026-07-17", amount: 5000, type: "withdrawal" });

            expect(res.status).toBe(201);
            expect(res.body.data.type).toBe("withdrawal");
        });

        it("should return forbidden without permission", async () => {
            const res = await request(app)
                .post("/api/bank-transactions")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({ bankAccountId: bankAccount._id, transactionDate: "2026-07-17", amount: 1000, type: "deposit" });
            expect(res.status).toBe(403);
        });
    });
});
