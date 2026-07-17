import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
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
const { default: Currency } = await import("../../../shared/models/currency.model.js");

let mongoServer;
let app;
let orgId;
let adminUserToken;
let userWithoutPermToken;

beforeAll(async () => {
    // MongoMemoryReplSet replica set is required for transactions to work
    mongoServer = await MongoMemoryReplSet.create({
        replSet: {
            storageEngine: "wiredTiger"
        }
    });
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
        name: "Create Currencies",
        code: "CURRENCIES.CREATE",
        module: "currencies"
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

describe("Currencies Management Integration Tests", () => {

    describe("POST /api/currencies", () => {
        it("should successfully create a currency", async () => {
            const res = await request(app)
                .post("/api/currencies")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "US Dollar",
                    code: "USD",
                    symbol: "$",
                    isBase: true
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("US Dollar");
            expect(res.body.data.code).toBe("USD");
            expect(res.body.data.symbol).toBe("$");
            expect(res.body.data.isBase).toBe(true);
            expect(res.body.data.organizationId.toString()).toBe(orgId.toString());
        });

        it("should return conflict if currency code already exists in same organization", async () => {
            await Currency.create({
                name: "US Dollar",
                code: "USD",
                symbol: "$",
                organizationId: orgId
            });

            const res = await request(app)
                .post("/api/currencies")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "United States Dollar",
                    code: "usd", // case-insensitive check
                    symbol: "$"
                });

            expect(res.status).toBe(409);
        });

        it("should automatically reset previous base currency when a new one is set as base", async () => {
            // Create first currency as base
            const c1 = await Currency.create({
                name: "US Dollar",
                code: "USD",
                symbol: "$",
                isBase: true,
                organizationId: orgId
            });

            // Create second currency as base
            const res = await request(app)
                .post("/api/currencies")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Euro",
                    code: "EUR",
                    symbol: "€",
                    isBase: true
                });

            expect(res.status).toBe(201);
            expect(res.body.data.isBase).toBe(true);

            // Verify first currency base status is now false
            const dbC1 = await Currency.findById(c1._id);
            expect(dbC1.isBase).toBe(false);
        });

        it("should return forbidden if user does not have CURRENCIES.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/currencies")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    name: "Unpermitted",
                    code: "UNPM",
                    symbol: "U"
                });

            expect(res.status).toBe(403);
        });
    });

});
