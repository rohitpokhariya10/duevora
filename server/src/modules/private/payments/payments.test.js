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
const { default: Vendor } = await import("../../../shared/models/vendor.model.js");
const { default: Account } = await import("../../../shared/models/account.model.js");
const { default: Purchase } = await import("../../../shared/models/purchase.model.js");
const { default: JournalEntry } = await import("../../../shared/models/journalEntry.model.js");
const { default: JournalEntryLine } = await import("../../../shared/models/journalEntryLine.model.js");
const { default: LedgerEntry } = await import("../../../shared/models/ledgerEntry.model.js");
const { default: Payment } = await import("../../../shared/models/payment.model.js");

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
        name: "Create Payments",
        code: "PAYMENTS.CREATE",
        module: "payments"
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

describe("Payments Management Integration Tests", () => {
    let vendor, purchase, bankAccount;

    beforeEach(async () => {
        vendor = await Vendor.create({ name: "Supplier Inc", organizationId: orgId });
        purchase = await Purchase.create({
            vendorId: vendor._id,
            purchaseNumber: "PB-2026-001",
            purchaseDate: new Date(),
            subTotal: 1000,
            taxTotal: 100,
            grandTotal: 1100,
            status: "billed",
            organizationId: orgId
        });
        bankAccount = await Account.create({
            name: "HDFC Bank",
            code: "HDFC_BANK",
            type: "asset",
            organizationId: orgId
        });
    });

    describe("POST /api/payments", () => {
        it("should successfully record a payment and update purchase status", async () => {
            const res = await request(app)
                .post("/api/payments")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    vendorId: vendor._id,
                    purchaseId: purchase._id,
                    paymentNumber: "PAY-2026-001",
                    paymentDate: "2026-07-17",
                    amount: 550, // half payment
                    paymentMethod: "Bank Transfer",
                    accountId: bankAccount._id
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.paymentNumber).toBe("PAY-2026-001");
            expect(res.body.data.amount).toBe(550);

            // Verify purchase status is updated to partially_paid
            const dbPurchase = await Purchase.findById(purchase._id);
            expect(dbPurchase.status).toBe("partially_paid");

            // Verify JournalEntry posted
            const je = await JournalEntry.findOne({ organizationId: orgId });
            expect(je).toBeDefined();

            // Verify JournalEntryLines (AP debit, Bank Account credit)
            const lines = await JournalEntryLine.find({ journalEntryId: je._id }).populate("accountId");
            expect(lines.length).toBe(2);

            const apLine = lines.find(l => l.accountId.code === "ACCOUNTS_PAYABLE");
            expect(apLine.debit).toBe(550);
            expect(apLine.credit).toBe(0);

            const bankLine = lines.find(l => l.accountId.code === "HDFC_BANK");
            expect(bankLine.debit).toBe(0);
            expect(bankLine.credit).toBe(550);

            // Verify LedgerEntries
            const ledgers = await LedgerEntry.find({ journalEntryId: je._id });
            expect(ledgers.length).toBe(2);
        });

        it("should update purchase status to paid if payment amount settles the grandTotal", async () => {
            const res = await request(app)
                .post("/api/payments")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    vendorId: vendor._id,
                    purchaseId: purchase._id,
                    paymentNumber: "PAY-2026-002",
                    paymentDate: "2026-07-17",
                    amount: 1100, // full payment
                    paymentMethod: "Bank Transfer",
                    accountId: bankAccount._id
                });

            expect(res.status).toBe(201);

            // Verify purchase status is updated to paid
            const dbPurchase = await Purchase.findById(purchase._id);
            expect(dbPurchase.status).toBe("paid");
        });

        it("should return conflict if payment number already exists", async () => {
            await Payment.create({
                organizationId: orgId,
                paymentNumber: "PAY-2026-001",
                paymentDate: new Date(),
                amount: 100,
                paymentMethod: "Cash",
                accountId: bankAccount._id
            });

            const res = await request(app)
                .post("/api/payments")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    vendorId: vendor._id,
                    paymentNumber: "pay-2026-001", // case-insensitive check
                    paymentDate: "2026-07-17",
                    amount: 100,
                    paymentMethod: "Cash",
                    accountId: bankAccount._id
                });

            expect(res.status).toBe(409);
        });

        it("should return forbidden if user does not have PAYMENTS.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/payments")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    vendorId: vendor._id,
                    paymentNumber: "PAY-2026-003",
                    paymentDate: "2026-07-17",
                    amount: 100,
                    paymentMethod: "Cash",
                    accountId: bankAccount._id
                });

            expect(res.status).toBe(403);
        });
    });

});
