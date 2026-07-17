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
const { default: Product } = await import("../../../shared/models/product.model.js");
const { default: Tax } = await import("../../../shared/models/tax.model.js");
const { default: Warehouse } = await import("../../../shared/models/warehouse.model.js");
const { default: Inventory } = await import("../../../shared/models/inventory.model.js");
const { default: StockMovement } = await import("../../../shared/models/stockMovement.model.js");
const { default: JournalEntry } = await import("../../../shared/models/journalEntry.model.js");
const { default: JournalEntryLine } = await import("../../../shared/models/journalEntryLine.model.js");
const { default: LedgerEntry } = await import("../../../shared/models/ledgerEntry.model.js");
const { default: Invoice } = await import("../../../shared/models/invoice.model.js");

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

    // Seed permissions
    await Permission.create({
        name: "Create Invoices",
        code: "INVOICES.CREATE",
        module: "invoices"
    });

    await Permission.create({
        name: "Update Invoices",
        code: "INVOICES.UPDATE",
        module: "invoices"
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

describe("Invoices Management Integration Tests", () => {
    let customer, product, tax, warehouse;

    beforeEach(async () => {
        customer = await Customer.create({ name: "Jane Doe", organizationId: orgId });
        product = await Product.create({ name: "Widget A", sku: "WDG-A", organizationId: orgId });
        tax = await Tax.create({ name: "GST 10%", rate: 10, code: "GST10", organizationId: orgId });
        warehouse = await Warehouse.create({ name: "Central", code: "CWH", organizationId: orgId });
    });

    describe("POST /api/invoices", () => {
        it("should successfully create a draft invoice with calculations", async () => {
            const res = await request(app)
                .post("/api/invoices")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    customerId: customer._id,
                    invoiceNumber: "INV-2026-001",
                    invoiceDate: "2026-07-17",
                    dueDate: "2026-08-17",
                    items: [
                        {
                            productId: product._id,
                            quantity: 10,
                            unitPrice: 100,
                            taxId: tax._id,
                            discountAmount: 100 // 10% discount total
                        }
                    ]
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.invoiceNumber).toBe("INV-2026-001");
            expect(res.body.data.status).toBe("draft");
            // calculations: subtotal = 10 * 100 = 1000
            // taxable amount = 1000 - 100 = 900
            // tax = 90
            // grandTotal = 990
            expect(res.body.data.subTotal).toBe(1000);
            expect(res.body.data.taxTotal).toBe(90);
            expect(res.body.data.discountTotal).toBe(100);
            expect(res.body.data.grandTotal).toBe(990);
        });

        it("should return conflict if invoice number already exists within organization", async () => {
            await Invoice.create({
                organizationId: orgId,
                customerId: customer._id,
                invoiceNumber: "INV-2026-001",
                invoiceDate: new Date(),
                subTotal: 100,
                taxTotal: 10,
                grandTotal: 110,
                status: "draft"
            });

            const res = await request(app)
                .post("/api/invoices")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    customerId: customer._id,
                    invoiceNumber: "inv-2026-001", // case-insensitive check
                    invoiceDate: "2026-07-17",
                    items: [
                        {
                            productId: product._id,
                            quantity: 5,
                            unitPrice: 20
                        }
                    ]
                });

            expect(res.status).toBe(409);
        });
    });

    describe("POST /api/invoices/:invoiceId/approve", () => {
        let invoice;

        beforeEach(async () => {
            // Seed inventory
            await Inventory.create({
                organizationId: orgId,
                productId: product._id,
                warehouseId: warehouse._id,
                quantity: 50
            });

            const creationRes = await request(app)
                .post("/api/invoices")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    customerId: customer._id,
                    invoiceNumber: "INV-2026-002",
                    invoiceDate: "2026-07-17",
                    items: [
                        {
                            productId: product._id,
                            quantity: 10,
                            unitPrice: 100,
                            taxId: tax._id
                        }
                    ]
                });

            invoice = creationRes.body.data;
        });

        it("should successfully approve draft invoice and create ledger entries", async () => {
            const res = await request(app)
                .post(`/api/invoices/${invoice._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe("sent");

            // Verify inventory decremented: 50 - 10 = 40
            const dbInv = await Inventory.findOne({ productId: product._id, warehouseId: warehouse._id });
            expect(dbInv.quantity).toBe(40);

            // Verify stock movement out logged
            const dbMov = await StockMovement.findOne({ productId: product._id, referenceId: invoice._id });
            expect(dbMov).toBeDefined();
            expect(dbMov.type).toBe("out");
            expect(dbMov.quantity).toBe(10);
            expect(dbMov.referenceType).toBe("Invoice");

            // Verify JournalEntry posted
            const je = await JournalEntry.findOne({ organizationId: orgId });
            expect(je).toBeDefined();
            expect(je.status).toBe("posted");

            // Verify JournalEntryLines (AR, Sales, Tax)
            const lines = await JournalEntryLine.find({ journalEntryId: je._id }).populate("accountId");
            expect(lines.length).toBe(3);

            const arLine = lines.find(l => l.accountId.code === "ACCOUNTS_RECEIVABLE");
            expect(arLine.debit).toBe(1100);
            expect(arLine.credit).toBe(0);

            const revLine = lines.find(l => l.accountId.code === "SALES_REVENUE");
            expect(revLine.debit).toBe(0);
            expect(revLine.credit).toBe(1000);

            const taxLine = lines.find(l => l.accountId.code === "TAX_PAYABLE");
            expect(taxLine.debit).toBe(0);
            expect(taxLine.credit).toBe(100);

            // Verify LedgerEntries
            const ledgers = await LedgerEntry.find({ journalEntryId: je._id }).populate("accountId");
            expect(ledgers.length).toBe(3);
        });

        it("should return bad request when trying to approve an already approved invoice", async () => {
            // Approve once
            await request(app)
                .post(`/api/invoices/${invoice._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            // Approve again
            const res = await request(app)
                .post(`/api/invoices/${invoice._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(400);
        });

        it("should return forbidden if user does not have INVOICES.UPDATE permission", async () => {
            const res = await request(app)
                .post(`/api/invoices/${invoice._id}/approve`)
                .set("Authorization", `Bearer ${userWithoutPermToken}`);

            expect(res.status).toBe(403);
        });
    });

});
