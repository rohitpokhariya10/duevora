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
const { default: Category } = await import("../../../shared/models/category.model.js");
const { default: Account } = await import("../../../shared/models/account.model.js");
const { default: JournalEntry } = await import("../../../shared/models/journalEntry.model.js");
const { default: JournalEntryLine } = await import("../../../shared/models/journalEntryLine.model.js");
const { default: LedgerEntry } = await import("../../../shared/models/ledgerEntry.model.js");
const { default: Expense } = await import("../../../shared/models/expense.model.js");

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
        name: "Create Expenses",
        code: "EXPENSES.CREATE",
        module: "expenses"
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

describe("Expenses Management Integration Tests", () => {
    let category, bankAccount;

    beforeEach(async () => {
        category = await Category.create({ name: "Office Supplies", code: "OFF_SUP", organizationId: orgId });
        bankAccount = await Account.create({
            name: "HDFC Bank",
            code: "HDFC_BANK",
            type: "asset",
            organizationId: orgId
        });
    });

    describe("POST /api/expenses", () => {
        it("should successfully record an expense", async () => {
            const res = await request(app)
                .post("/api/expenses")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    expenseNumber: "EXP-2026-001",
                    date: "2026-07-17",
                    amount: 250.50,
                    categoryId: category._id,
                    accountId: bankAccount._id,
                    description: "Office notebooks"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.expenseNumber).toBe("EXP-2026-001");
            expect(res.body.data.amount).toBe(250.50);

            // Verify JournalEntry posted
            const je = await JournalEntry.findOne({ organizationId: orgId });
            expect(je).toBeDefined();

            // Verify JournalEntryLines (Expense Account debit, HDFC_BANK credit)
            const lines = await JournalEntryLine.find({ journalEntryId: je._id }).populate("accountId");
            expect(lines.length).toBe(2);

            const expLine = lines.find(l => l.accountId.code === "EXPENSE");
            expect(expLine.debit).toBe(250.50);
            expect(expLine.credit).toBe(0);

            const bankLine = lines.find(l => l.accountId.code === "HDFC_BANK");
            expect(bankLine.debit).toBe(0);
            expect(bankLine.credit).toBe(250.50);

            // Verify LedgerEntries
            const ledgers = await LedgerEntry.find({ journalEntryId: je._id });
            expect(ledgers.length).toBe(2);
        });

        it("should return conflict if expense number already exists", async () => {
            await Expense.create({
                organizationId: orgId,
                expenseNumber: "EXP-2026-001",
                date: new Date(),
                amount: 100,
                accountId: bankAccount._id
            });

            const res = await request(app)
                .post("/api/expenses")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    expenseNumber: "exp-2026-001", // case-insensitive check
                    date: "2026-07-17",
                    amount: 100,
                    accountId: bankAccount._id
                });

            expect(res.status).toBe(409);
        });

        it("should return forbidden if user does not have EXPENSES.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/expenses")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    expenseNumber: "EXP-2026-003",
                    date: "2026-07-17",
                    amount: 100,
                    accountId: bankAccount._id
                });

            expect(res.status).toBe(403);
        });
    });

});
