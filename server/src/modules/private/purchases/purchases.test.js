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
const { default: Product } = await import("../../../shared/models/product.model.js");
const { default: Tax } = await import("../../../shared/models/tax.model.js");
const { default: Warehouse } = await import("../../../shared/models/warehouse.model.js");
const { default: Inventory } = await import("../../../shared/models/inventory.model.js");
const { default: StockMovement } = await import("../../../shared/models/stockMovement.model.js");
const { default: JournalEntry } = await import("../../../shared/models/journalEntry.model.js");
const { default: JournalEntryLine } = await import("../../../shared/models/journalEntryLine.model.js");
const { default: LedgerEntry } = await import("../../../shared/models/ledgerEntry.model.js");
const { default: Purchase } = await import("../../../shared/models/purchase.model.js");

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
        name: "Create Purchases",
        code: "PURCHASES.CREATE",
        module: "purchases"
    });

    await Permission.create({
        name: "Update Purchases",
        code: "PURCHASES.UPDATE",
        module: "purchases"
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

describe("Purchases Management Integration Tests", () => {
    let vendor, product, tax, warehouse;

    beforeEach(async () => {
        vendor = await Vendor.create({ name: "Supplier Inc", organizationId: orgId });
        product = await Product.create({ name: "Widget A", sku: "WDG-A", organizationId: orgId });
        tax = await Tax.create({ name: "GST 10%", rate: 10, code: "GST10", organizationId: orgId });
        warehouse = await Warehouse.create({ name: "Central", code: "CWH", organizationId: orgId });
    });

    describe("POST /api/purchases", () => {
        it("should successfully record a purchase vendor bill with calculations", async () => {
            const res = await request(app)
                .post("/api/purchases")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    vendorId: vendor._id,
                    purchaseNumber: "PB-2026-001",
                    purchaseDate: "2026-07-17",
                    items: [
                        {
                            productId: product._id,
                            quantity: 5,
                            unitPrice: 200,
                            taxId: tax._id
                        }
                    ]
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.purchaseNumber).toBe("PB-2026-001");
            expect(res.body.data.status).toBe("billed");
            expect(res.body.data.subTotal).toBe(1000);
            expect(res.body.data.taxTotal).toBe(100);
            expect(res.body.data.grandTotal).toBe(1100);
            expect(res.body.data.organizationId.toString()).toBe(orgId.toString());
        });

        it("should return conflict if purchase number already exists in same organization", async () => {
            await Purchase.create({
                vendorId: vendor._id,
                purchaseNumber: "PB-2026-001",
                purchaseDate: new Date(),
                subTotal: 100,
                taxTotal: 10,
                grandTotal: 110,
                organizationId: orgId
            });

            const res = await request(app)
                .post("/api/purchases")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    vendorId: vendor._id,
                    purchaseNumber: "pb-2026-001",
                    purchaseDate: "2026-07-17",
                    items: [
                        {
                            productId: product._id,
                            quantity: 5,
                            unitPrice: 200
                        }
                    ]
                });

            expect(res.status).toBe(409);
        });

        it("should return forbidden if user does not have PURCHASES.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/purchases")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    vendorId: vendor._id,
                    purchaseNumber: "PB-2026-001",
                    purchaseDate: "2026-07-17",
                    items: [
                        {
                            productId: product._id,
                            quantity: 5,
                            unitPrice: 200
                        }
                    ]
                });

            expect(res.status).toBe(403);
        });
    });

    describe("POST /api/purchases/:purchaseId/approve", () => {
        let purchase;

        beforeEach(async () => {
            const res = await request(app)
                .post("/api/purchases")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    vendorId: vendor._id,
                    purchaseNumber: "PB-2026-002",
                    purchaseDate: "2026-07-17",
                    items: [
                        {
                            productId: product._id,
                            quantity: 5,
                            unitPrice: 200,
                            taxId: tax._id
                        }
                    ]
                });

            purchase = res.body.data;
        });

        it("should successfully approve recorded purchase and create ledger postings", async () => {
            const res = await request(app)
                .post(`/api/purchases/${purchase._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe("received");

            // Verify inventory incremented: 0 + 5 = 5
            const dbInv = await Inventory.findOne({ productId: product._id, warehouseId: warehouse._id });
            expect(dbInv.quantity).toBe(5);

            // Verify stock movement logged
            const dbMov = await StockMovement.findOne({ productId: product._id, referenceId: purchase._id });
            expect(dbMov).toBeDefined();
            expect(dbMov.type).toBe("in");
            expect(dbMov.quantity).toBe(5);
            expect(dbMov.referenceType).toBe("Purchase");

            // Verify JournalEntry posted
            const je = await JournalEntry.findOne({ organizationId: orgId });
            expect(je).toBeDefined();
            expect(je.status).toBe("posted");

            // Verify JournalEntryLines (Inventory Asset, GST Input, Accounts Payable)
            const lines = await JournalEntryLine.find({ journalEntryId: je._id }).populate("accountId");
            expect(lines.length).toBe(3);

            const invLine = lines.find(l => l.accountId.code === "INVENTORY_ASSET");
            expect(invLine.debit).toBe(1000);
            expect(invLine.credit).toBe(0);

            const gstLine = lines.find(l => l.accountId.code === "GST_INPUT_ASSET");
            expect(gstLine.debit).toBe(100);
            expect(gstLine.credit).toBe(0);

            const apLine = lines.find(l => l.accountId.code === "ACCOUNTS_PAYABLE");
            expect(apLine.debit).toBe(0);
            expect(apLine.credit).toBe(1100);

            // Verify LedgerEntries
            const ledgers = await LedgerEntry.find({ journalEntryId: je._id }).populate("accountId");
            expect(ledgers.length).toBe(3);
        });

        it("should return bad request when trying to approve an already approved purchase", async () => {
            // Approve once
            await request(app)
                .post(`/api/purchases/${purchase._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            // Approve again
            const res = await request(app)
                .post(`/api/purchases/${purchase._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(400);
        });

        it("should return forbidden if user does not have PURCHASES.UPDATE permission", async () => {
            const res = await request(app)
                .post(`/api/purchases/${purchase._id}/approve`)
                .set("Authorization", `Bearer ${userWithoutPermToken}`);

            expect(res.status).toBe(403);
        });
    });

});
