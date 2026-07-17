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
const { default: JournalEntry } = await import("../../../shared/models/journalEntry.model.js");
const { default: LedgerEntry } = await import("../../../shared/models/ledgerEntry.model.js");

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
        name: "View Ledger",
        code: "LEDGER.VIEW",
        module: "ledger"
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

describe("Ledger Management Integration Tests", () => {
    let accountA, accountB, je;

    beforeEach(async () => {
        accountA = await Account.create({ name: "Cash Account", code: "CASH", type: "asset", organizationId: orgId });
        accountB = await Account.create({ name: "Revenue Account", code: "REV", type: "revenue", organizationId: orgId });
        je = await JournalEntry.create({
            organizationId: orgId,
            entryNumber: "JE-001",
            date: new Date("2026-07-01"),
            status: "posted"
        });

        // Seed ledger postings
        await LedgerEntry.create([
            {
                organizationId: orgId,
                accountId: accountA._id,
                journalEntryId: je._id,
                date: new Date("2026-07-01"),
                debit: 500,
                credit: 0
            },
            {
                organizationId: orgId,
                accountId: accountB._id,
                journalEntryId: je._id,
                date: new Date("2026-07-01"),
                debit: 0,
                credit: 500
            },
            {
                organizationId: orgId,
                accountId: accountA._id,
                journalEntryId: je._id,
                date: new Date("2026-07-15"),
                debit: 200,
                credit: 0
            }
        ]);
    });

    describe("GET /api/ledger", () => {
        it("should successfully list all ledger entries for the organization", async () => {
            const res = await request(app)
                .get("/api/ledger")
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.entries.length).toBe(3);
            expect(res.body.data.pagination.total).toBe(3);
        });

        it("should filter ledger entries by accountId", async () => {
            const res = await request(app)
                .get(`/api/ledger?accountId=${accountB._id}`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.entries.length).toBe(1);
            expect(res.body.data.entries[0].accountId._id.toString()).toBe(accountB._id.toString());
        });

        it("should filter ledger entries by date range", async () => {
            const res = await request(app)
                .get("/api/ledger?startDate=2026-07-10&endDate=2026-07-20")
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.entries.length).toBe(1);
            expect(res.body.data.entries[0].debit).toBe(200);
        });

        it("should return forbidden if user does not have LEDGER.VIEW permission", async () => {
            const res = await request(app)
                .get("/api/ledger")
                .set("Authorization", `Bearer ${userWithoutPermToken}`);

            expect(res.status).toBe(403);
        });
    });

});
