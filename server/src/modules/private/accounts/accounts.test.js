import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

// Mock sending mail
jest.unstable_mockModule("../../../shared/utils/sendMail.util.js", () => ({
    __esModule: true,
    default: jest.fn(),
}));

const { default: createApp } = await import("../../../app.js");
const { default: User } = await import("../../../shared/models/user.model.js");
const { default: Organization } = await import("../../../shared/models/organization.model.js");
const { default: Employee } = await import("../../../shared/models/employee.model.js");
const { default: Permission } = await import("../../../shared/models/permission.model.js");
const { default: Account } = await import("../../../shared/models/account.model.js");

let mongoServer;
let app;
let orgId;
let adminUserToken;
let userWithoutPermToken;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    app = createApp();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }

    // Seed permission
    await Permission.create({
        name: "Create Accounts",
        code: "ACCOUNTS.CREATE",
        module: "accounts"
    });

    await Permission.create({
        name: "View Accounts",
        code: "ACCOUNTS.VIEW",
        module: "accounts"
    });

    // Create Admin User
    const adminUser = await User.create({
        name: "Admin User",
        email: "admin@example.com",
        password: "password123",
        isVerified: true
    });

    const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@example.com", password: "password123" });

    const token = loginRes.body.data.accessToken;

    const onboardRes = await request(app)
        .post("/api/organization")
        .set("Authorization", `Bearer ${token}`)
        .send({
            name: "Test Corp",
            code: "TCORP",
            firstName: "Admin",
            lastName: "User"
        });

    adminUserToken = onboardRes.body.data.accessToken;
    orgId = onboardRes.body.data.organization._id;

    // Create normal user without permissions
    const normalUser = await User.create({
        name: "Normal User",
        email: "normal@example.com",
        password: "password123",
        isVerified: true
    });

    await Employee.create({
        userId: normalUser._id,
        organizationId: orgId,
        employeeCode: "EMP-002",
        firstName: "Normal",
        lastName: "User",
        email: "normal@example.com",
        status: "active"
    });

    const normalLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: "normal@example.com", password: "password123" });

    userWithoutPermToken = normalLogin.body.data.accessToken;
});

describe("Accounts Management Integration Tests", () => {

    describe("POST /api/accounts", () => {
        it("should successfully create an account", async () => {
            const res = await request(app)
                .post("/api/accounts")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Salaries Expense",
                    code: "sal_exp",
                    type: "expense",
                    status: "active"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("Salaries Expense");
            expect(res.body.data.code).toBe("SAL_EXP"); // formatted uppercase
            expect(res.body.data.type).toBe("expense");
            expect(res.body.data.organizationId.toString()).toBe(orgId.toString());
        });

        it("should return conflict if account code already exists in organization", async () => {
            await Account.create({
                name: "Salaries Expense",
                code: "SAL_EXP",
                type: "expense",
                organizationId: orgId
            });

            const res = await request(app)
                .post("/api/accounts")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Salaries",
                    code: "sal_exp",
                    type: "expense"
                });

            expect(res.status).toBe(409);
        });

        it("should allow duplicate account code across different organizations", async () => {
            await Account.create({
                name: "Salaries Expense",
                code: "SAL_EXP",
                type: "expense",
                organizationId: orgId
            });

            const foreignOrg = await Organization.create({ name: "Foreign Corp", code: "FRGN" });
            const foreignUser = await User.create({ name: "Foreign User", email: "foreign@example.com", password: "password123", isVerified: true });

            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({ email: "foreign@example.com", password: "password123" });

            const onboardRes = await request(app)
                .post("/api/organization")
                .set("Authorization", `Bearer ${loginRes.body.data.accessToken}`)
                .send({
                    name: "Foreign Corp Org",
                    code: "FCORP",
                    firstName: "Foreign",
                    lastName: "User"
                });

            const foreignToken = onboardRes.body.data.accessToken;

            const res = await request(app)
                .post("/api/accounts")
                .set("Authorization", `Bearer ${foreignToken}`)
                .send({
                    name: "Foreign Salaries",
                    code: "sal_exp",
                    type: "expense"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it("should return forbidden if user does not have ACCOUNTS.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/accounts")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    name: "Office Expense",
                    code: "off_exp",
                    type: "expense"
                });

            expect(res.status).toBe(403);
        });
    });

    describe("GET /api/accounts", () => {
        it("should successfully retrieve all accounts for organization", async () => {
            await Account.create({
                name: "Petty Cash",
                code: "PETTY_CASH",
                type: "asset",
                organizationId: orgId
            });

            const res = await request(app)
                .get("/api/accounts")
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            const pettyCash = res.body.data.find(a => a.code === "PETTY_CASH");
            expect(pettyCash).toBeDefined();
            expect(pettyCash.name).toBe("Petty Cash");
        });

        it("should return forbidden if user does not have ACCOUNTS.VIEW permission", async () => {
            const res = await request(app)
                .get("/api/accounts")
                .set("Authorization", `Bearer ${userWithoutPermToken}`);

            expect(res.status).toBe(403);
        });
    });

});
