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
const { default: Customer } = await import("../../../shared/models/customer.model.js");
const { default: Account } = await import("../../../shared/models/account.model.js");
const { default: Invoice } = await import("../../../shared/models/invoice.model.js");
const { default: JournalEntry } = await import("../../../shared/models/journalEntry.model.js");
const { default: JournalEntryLine } = await import("../../../shared/models/journalEntryLine.model.js");
const { default: LedgerEntry } = await import("../../../shared/models/ledgerEntry.model.js");
const { default: Receipt } = await import("../../../shared/models/receipt.model.js");
const { recordCustomerReceipt } = await import("../../../shared/services/customerReceipt.service.js");

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
        name: "Create Receipts",
        code: "RECEIPTS.CREATE",
        module: "receipts"
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

describe("Receipts Management Integration Tests", () => {
    let customer, invoice, bankAccount;

    beforeEach(async () => {
        customer = await Customer.create({ name: "Jane Doe", organizationId: orgId });
        invoice = await Invoice.create({
            customerId: customer._id,
            invoiceNumber: "INV-2026-001",
            invoiceDate: new Date(),
            subTotal: 1000,
            taxTotal: 100,
            grandTotal: 1100,
            status: "sent",
            organizationId: orgId
        });
        bankAccount = await Account.create({
            name: "HDFC Bank",
            code: "HDFC_BANK",
            type: "asset",
            organizationId: orgId
        });
    });

    describe("POST /api/receipts", () => {
        it("should successfully record a receipt and update invoice status", async () => {
            const res = await request(app)
                .post("/api/receipts")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    customerId: customer._id,
                    invoiceId: invoice._id,
                    receiptNumber: "REC-2026-001",
                    receiptDate: "2026-07-17",
                    amount: 550, // half payment
                    paymentMethod: "Bank Transfer",
                    accountId: bankAccount._id
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.receiptNumber).toBe("REC-2026-001");
            expect(res.body.data.amount).toBe(550);

            // Verify invoice status is updated to partially_paid
            const dbInvoice = await Invoice.findById(invoice._id);
            expect(dbInvoice.status).toBe("partially_paid");

            // Verify JournalEntry posted
            const je = await JournalEntry.findOne({ organizationId: orgId });
            expect(je).toBeDefined();

            // Verify JournalEntryLines (Bank Account debit, AR credit)
            const lines = await JournalEntryLine.find({ journalEntryId: je._id }).populate("accountId");
            expect(lines.length).toBe(2);

            const bankLine = lines.find(l => l.accountId.code === "HDFC_BANK");
            expect(bankLine.debit).toBe(550);
            expect(bankLine.credit).toBe(0);

            const arLine = lines.find(l => l.accountId.code === "ACCOUNTS_RECEIVABLE");
            expect(arLine.debit).toBe(0);
            expect(arLine.credit).toBe(550);

            // Verify LedgerEntries
            const ledgers = await LedgerEntry.find({ journalEntryId: je._id });
            expect(ledgers.length).toBe(2);
        });

        it("should update invoice status to paid if receipt amount settles the grandTotal", async () => {
            const res = await request(app)
                .post("/api/receipts")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    customerId: customer._id,
                    invoiceId: invoice._id,
                    receiptNumber: "REC-2026-002",
                    receiptDate: "2026-07-17",
                    amount: 1100, // full payment
                    paymentMethod: "Bank Transfer",
                    accountId: bankAccount._id
                });

            expect(res.status).toBe(201);

            // Verify invoice status is updated to paid
            const dbInvoice = await Invoice.findById(invoice._id);
            expect(dbInvoice.status).toBe("paid");
        });

        it("should isolate invoice receipt totals by organization", async () => {
            const otherOrganization = await Organization.create({
                name: "Other Corp",
                code: "OTHER"
            });
            const otherAccount = await Account.create({
                name: "Other Bank",
                code: "OTHER_BANK",
                type: "asset",
                organizationId: otherOrganization._id
            });

            // A malformed cross-tenant reference must never affect this organization's balance.
            await Receipt.create({
                organizationId: otherOrganization._id,
                invoiceId: invoice._id,
                receiptNumber: "OTHER-REC-001",
                receiptDate: new Date(),
                amount: 1000,
                paymentMethod: "Cash",
                accountId: otherAccount._id
            });

            const res = await request(app)
                .post("/api/receipts")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    customerId: customer._id,
                    invoiceId: invoice._id,
                    receiptNumber: "REC-ORG-SAFE",
                    receiptDate: "2026-07-17",
                    amount: 100,
                    paymentMethod: "Cash",
                    accountId: bankAccount._id
                });

            expect(res.status).toBe(201);

            const dbInvoice = await Invoice.findById(invoice._id);
            expect(dbInvoice.status).toBe("partially_paid");
        });

        it("should never regress a paid invoice to partially paid", async () => {
            invoice.status = "paid";
            await invoice.save();

            const res = await request(app)
                .post("/api/receipts")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    customerId: customer._id,
                    invoiceId: invoice._id,
                    receiptNumber: "REC-PAID-TERMINAL",
                    receiptDate: "2026-07-17",
                    amount: 100,
                    paymentMethod: "Cash",
                    accountId: bankAccount._id
                });

            expect(res.status).toBe(201);

            const dbInvoice = await Invoice.findById(invoice._id);
            expect(dbInvoice.status).toBe("paid");
        });

        it("should make Razorpay provider payments idempotent", async () => {
            const recordProviderPayment = async () => {
                const session = await mongoose.startSession();
                session.startTransaction();

                try {
                    const result = await recordCustomerReceipt({
                        organizationId: orgId,
                        customerId: customer._id,
                        invoiceId: invoice._id,
                        receiptDate: "2026-07-17",
                        amount: 550,
                        paymentMethod: "razorpay",
                        accountId: bankAccount._id,
                        provider: "razorpay",
                        providerPaymentId: "pay_duevora_001",
                        providerPaymentLinkId: "plink_duevora_001",
                        providerOrderId: "order_duevora_001",
                        session
                    });

                    await session.commitTransaction();
                    return result;
                } catch (error) {
                    await session.abortTransaction();
                    throw error;
                } finally {
                    await session.endSession();
                }
            };

            const firstResult = await recordProviderPayment();
            const duplicateResult = await recordProviderPayment();

            expect(firstResult.receipt.receiptNumber).toBe("RZP-pay_duevora_001");
            expect(firstResult.totalPaid).toBe(550);
            expect(firstResult.outstandingAmount).toBe(550);
            expect(duplicateResult.receipt._id.toString()).toBe(firstResult.receipt._id.toString());
            expect(await Receipt.countDocuments({ providerPaymentId: "pay_duevora_001" })).toBe(1);
            expect(await JournalEntry.countDocuments({ organizationId: orgId })).toBe(1);
            expect(await JournalEntryLine.countDocuments({})).toBe(2);
            expect(await LedgerEntry.countDocuments({ organizationId: orgId })).toBe(2);
        });

        it("should return conflict if receipt number already exists", async () => {
            await Receipt.create({
                organizationId: orgId,
                receiptNumber: "REC-2026-001",
                receiptDate: new Date(),
                amount: 100,
                paymentMethod: "Cash",
                accountId: bankAccount._id
            });

            const res = await request(app)
                .post("/api/receipts")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    customerId: customer._id,
                    receiptNumber: "rec-2026-001", // case-insensitive check
                    receiptDate: "2026-07-17",
                    amount: 100,
                    paymentMethod: "Cash",
                    accountId: bankAccount._id
                });

            expect(res.status).toBe(409);
        });

        it("should return forbidden if user does not have RECEIPTS.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/receipts")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    customerId: customer._id,
                    receiptNumber: "REC-2026-003",
                    receiptDate: "2026-07-17",
                    amount: 100,
                    paymentMethod: "Cash",
                    accountId: bankAccount._id
                });

            expect(res.status).toBe(403);
        });
    });

});
