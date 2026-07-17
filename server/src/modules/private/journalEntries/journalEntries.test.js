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
const { default: Account } = await import("../../../shared/models/account.model.js");
const { default: JournalEntry } = await import("../../../shared/models/journalEntry.model.js");
const { default: JournalEntryLine } = await import("../../../shared/models/journalEntryLine.model.js");
const { default: LedgerEntry } = await import("../../../shared/models/ledgerEntry.model.js");

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
        name: "Create Journal Entries",
        code: "JOURNALENTRIES.CREATE",
        module: "journalEntries"
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

describe("Journal Entries Management Integration Tests", () => {
    let accountA, accountB;

    beforeEach(async () => {
        accountA = await Account.create({ name: "Account A", code: "ACCA", type: "asset", organizationId: orgId });
        accountB = await Account.create({ name: "Account B", code: "ACCB", type: "revenue", organizationId: orgId });
    });

    describe("POST /api/journal-entries", () => {
        it("should successfully record a draft journal entry and lines", async () => {
            const res = await request(app)
                .post("/api/journal-entries")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    entryNumber: "JE-2026-001",
                    date: "2026-07-17",
                    narration: "Transfer cash",
                    status: "draft",
                    lines: [
                        { accountId: accountA._id, debit: 500, credit: 0 },
                        { accountId: accountB._id, debit: 0, credit: 500 }
                    ]
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.entryNumber).toBe("JE-2026-001");
            expect(res.body.data.status).toBe("draft");

            // Verify JournalEntryLines are created
            const lines = await JournalEntryLine.find({ journalEntryId: res.body.data._id });
            expect(lines.length).toBe(2);

            // Since it's a draft, ledger entries should NOT be posted
            const ledgers = await LedgerEntry.find({ journalEntryId: res.body.data._id });
            expect(ledgers.length).toBe(0);
        });

        it("should successfully record a posted journal entry and log ledger entries", async () => {
            const res = await request(app)
                .post("/api/journal-entries")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    entryNumber: "JE-2026-002",
                    date: "2026-07-17",
                    narration: "Transfer cash posted",
                    status: "posted",
                    lines: [
                        { accountId: accountA._id, debit: 500, credit: 0 },
                        { accountId: accountB._id, debit: 0, credit: 500 }
                    ]
                });

            expect(res.status).toBe(201);
            expect(res.body.data.status).toBe("posted");

            // Verify LedgerEntries are posted
            const ledgers = await LedgerEntry.find({ journalEntryId: res.body.data._id });
            expect(ledgers.length).toBe(2);
        });

        it("should return bad request if total debits do not equal total credits", async () => {
            const res = await request(app)
                .post("/api/journal-entries")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    entryNumber: "JE-2026-003",
                    date: "2026-07-17",
                    lines: [
                        { accountId: accountA._id, debit: 500, credit: 0 },
                        { accountId: accountB._id, debit: 0, credit: 450 } // out of balance
                    ]
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("does not balance");
        });

        it("should return conflict if entry number already exists", async () => {
            await JournalEntry.create({
                organizationId: orgId,
                entryNumber: "JE-2026-001",
                date: new Date()
            });

            const res = await request(app)
                .post("/api/journal-entries")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    entryNumber: "je-2026-001", // case-insensitive check
                    date: "2026-07-17",
                    lines: [
                        { accountId: accountA._id, debit: 100, credit: 0 },
                        { accountId: accountB._id, debit: 0, credit: 100 }
                    ]
                });

            expect(res.status).toBe(409);
        });

        it("should return forbidden if user does not have JOURNALENTRIES.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/journal-entries")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    entryNumber: "JE-2026-004",
                    date: "2026-07-17",
                    lines: [
                        { accountId: accountA._id, debit: 100, credit: 0 },
                        { accountId: accountB._id, debit: 0, credit: 100 }
                    ]
                });

            expect(res.status).toBe(403);
        });
    });

});
