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

    await Permission.create({ name: "Create Bank Accounts", code: "BANKACCOUNTS.CREATE", module: "bankAccounts" });
    await Permission.create({ name: "View Bank Accounts", code: "BANKACCOUNTS.VIEW", module: "bankAccounts" });

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

describe("Bank Accounts Management Integration Tests", () => {
    let account;

    beforeEach(async () => {
        account = await Account.create({ name: "HDFC Current", code: "HDFC_CUR", type: "asset", organizationId: orgId });
    });

    describe("POST /api/bank-accounts", () => {
        it("should successfully create a bank account", async () => {
            const res = await request(app)
                .post("/api/bank-accounts")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ bankName: "HDFC Bank", accountNumber: "1234567890", ifscCode: "HDFC0001", branch: "Mumbai Main", accountId: account._id });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.bankName).toBe("HDFC Bank");
            expect(res.body.data.accountNumber).toBe("1234567890");
        });

        it("should return conflict if account number already exists", async () => {
            await BankAccount.create({ organizationId: orgId, bankName: "HDFC", accountNumber: "1234567890", accountId: account._id });
            const res = await request(app)
                .post("/api/bank-accounts")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ bankName: "SBI", accountNumber: "1234567890", accountId: account._id });
            expect(res.status).toBe(409);
        });

        it("should return forbidden without permission", async () => {
            const res = await request(app)
                .post("/api/bank-accounts")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({ bankName: "HDFC Bank", accountNumber: "9999999999", accountId: account._id });
            expect(res.status).toBe(403);
        });
    });

    describe("GET /api/bank-accounts", () => {
        it("should successfully retrieve all bank accounts", async () => {
            await BankAccount.create({ organizationId: orgId, bankName: "HDFC Bank", accountNumber: "1234567890", accountId: account._id });

            const res = await request(app)
                .get("/api/bank-accounts")
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].bankName).toBe("HDFC Bank");
        });

        it("should return forbidden without permission", async () => {
            const res = await request(app)
                .get("/api/bank-accounts")
                .set("Authorization", `Bearer ${userWithoutPermToken}`);

            expect(res.status).toBe(403);
        });
    });
});
