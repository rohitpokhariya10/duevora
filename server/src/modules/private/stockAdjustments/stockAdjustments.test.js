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
const { default: Product } = await import("../../../shared/models/product.model.js");
const { default: Warehouse } = await import("../../../shared/models/warehouse.model.js");
const { default: Inventory } = await import("../../../shared/models/inventory.model.js");
const { default: StockMovement } = await import("../../../shared/models/stockMovement.model.js");
const { default: StockAdjustment } = await import("../../../shared/models/stockAdjustment.model.js");

let mongoServer;
let app;
let orgId;
let adminUserToken;
let userWithoutPermToken;
let adminEmployee;

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
        name: "Create Stock Adjustments",
        code: "STOCKADJUSTMENTS.CREATE",
        module: "stockAdjustments"
    });

    await Permission.create({
        name: "Update Stock Adjustments",
        code: "STOCKADJUSTMENTS.UPDATE",
        module: "stockAdjustments"
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

    // Load admin employee
    adminEmployee = await Employee.findOne({ userId: adminUser._id, organizationId: orgId });

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

describe("Stock Adjustments Management Integration Tests", () => {
    let product, warehouse;

    beforeEach(async () => {
        product = await Product.create({ name: "Widget A", sku: "WDG-A", organizationId: orgId });
        warehouse = await Warehouse.create({ name: "Central", code: "CWH", organizationId: orgId });
    });

    describe("POST /api/stock-adjustments", () => {
        it("should successfully create a stock adjustment draft", async () => {
            const res = await request(app)
                .post("/api/stock-adjustments")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    productId: product._id,
                    warehouseId: warehouse._id,
                    adjustedQuantity: -5,
                    reason: "Broken parts",
                    date: "2026-07-17"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.productId.toString()).toBe(product._id.toString());
            expect(res.body.data.warehouseId.toString()).toBe(warehouse._id.toString());
            expect(res.body.data.adjustedQuantity).toBe(-5);
            expect(res.body.data.status).toBe("Draft");
            expect(res.body.data.adjustedById.toString()).toBe(adminEmployee._id.toString());
            expect(res.body.data.organizationId.toString()).toBe(orgId.toString());
        });

        it("should return 404 if product belongs to foreign organization", async () => {
            const foreignOrg = await Organization.create({ name: "Foreign", code: "FRGN" });
            const foreignProduct = await Product.create({ name: "F Widget", sku: "F-WDG", organizationId: foreignOrg._id });

            const res = await request(app)
                .post("/api/stock-adjustments")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    productId: foreignProduct._id,
                    warehouseId: warehouse._id,
                    adjustedQuantity: -5
                });

            expect(res.status).toBe(404);
        });

        it("should return 404 if warehouse belongs to foreign organization", async () => {
            const foreignOrg = await Organization.create({ name: "Foreign", code: "FRGN" });
            const foreignWarehouse = await Warehouse.create({ name: "F Ware", code: "F-WH", organizationId: foreignOrg._id });

            const res = await request(app)
                .post("/api/stock-adjustments")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    productId: product._id,
                    warehouseId: foreignWarehouse._id,
                    adjustedQuantity: -5
                });

            expect(res.status).toBe(404);
        });

        it("should return forbidden if user does not have STOCKADJUSTMENTS.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/stock-adjustments")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    productId: product._id,
                    warehouseId: warehouse._id,
                    adjustedQuantity: -5
                });

            expect(res.status).toBe(403);
        });
    });

    describe("POST /api/stock-adjustments/:adjustmentId/approve", () => {
        let adjustment;

        beforeEach(async () => {
            adjustment = await StockAdjustment.create({
                organizationId: orgId,
                warehouseId: warehouse._id,
                productId: product._id,
                adjustedQuantity: 10,
                reason: "Initial Count",
                adjustedById: adminEmployee._id,
                status: "Draft"
            });
        });

        it("should successfully approve a draft stock adjustment", async () => {
            const res = await request(app)
                .post(`/api/stock-adjustments/${adjustment._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe("Completed");

            // Verify inventory level was updated
            const dbInventory = await Inventory.findOne({
                organizationId: orgId,
                productId: product._id,
                warehouseId: warehouse._id
            });
            expect(dbInventory).toBeDefined();
            expect(dbInventory.quantity).toBe(10);

            // Verify stock movement log entry
            const dbMovement = await StockMovement.findOne({
                organizationId: orgId,
                productId: product._id,
                warehouseId: warehouse._id,
                referenceId: adjustment._id
            });
            expect(dbMovement).toBeDefined();
            expect(dbMovement.quantity).toBe(10);
            expect(dbMovement.type).toBe("in");
            expect(dbMovement.referenceType).toBe("StockAdjustment");
        });

        it("should return bad request if trying to approve a completed adjustment", async () => {
            // Approve once
            await request(app)
                .post(`/api/stock-adjustments/${adjustment._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            // Approve again
            const res = await request(app)
                .post(`/api/stock-adjustments/${adjustment._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(400);
        });

        it("should return forbidden if user does not have STOCKADJUSTMENTS.UPDATE permission", async () => {
            const res = await request(app)
                .post(`/api/stock-adjustments/${adjustment._id}/approve`)
                .set("Authorization", `Bearer ${userWithoutPermToken}`);

            expect(res.status).toBe(403);
        });
    });

});
