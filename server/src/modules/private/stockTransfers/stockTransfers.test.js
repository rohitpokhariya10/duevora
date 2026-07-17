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
const { default: StockTransfer } = await import("../../../shared/models/stockTransfer.model.js");

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
        name: "Update Stock Transfers",
        code: "STOCKTRANSFERS.UPDATE",
        module: "stockTransfers"
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

describe("Stock Transfers Management Integration Tests", () => {
    let product, sourceWH, destWH;

    beforeEach(async () => {
        product = await Product.create({ name: "Widget A", sku: "WDG-A", organizationId: orgId });
        sourceWH = await Warehouse.create({ name: "Source Warehouse", code: "SWH", organizationId: orgId });
        destWH = await Warehouse.create({ name: "Destination Warehouse", code: "DWH", organizationId: orgId });
    });

    describe("POST /api/stock-transfers/:transferId/approve", () => {
        it("should successfully approve a pending stock transfer and move stock", async () => {
            // Seed inventory in source warehouse
            await Inventory.create({
                organizationId: orgId,
                productId: product._id,
                warehouseId: sourceWH._id,
                quantity: 15
            });

            // Create pending stock transfer
            const transfer = await StockTransfer.create({
                organizationId: orgId,
                fromWarehouseId: sourceWH._id,
                toWarehouseId: destWH._id,
                productId: product._id,
                quantity: 5,
                status: "pending"
            });

            const res = await request(app)
                .post(`/api/stock-transfers/${transfer._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe("completed");

            // Verify source inventory decremented
            const srcInv = await Inventory.findOne({ productId: product._id, warehouseId: sourceWH._id });
            expect(srcInv.quantity).toBe(10);

            // Verify dest inventory incremented
            const destInv = await Inventory.findOne({ productId: product._id, warehouseId: destWH._id });
            expect(destInv.quantity).toBe(5);

            // Verify stock movement logs
            const movements = await StockMovement.find({ referenceId: transfer._id });
            expect(movements.length).toBe(2);

            const outMov = movements.find(m => m.type === "out");
            expect(outMov.warehouseId.toString()).toBe(sourceWH._id.toString());
            expect(outMov.quantity).toBe(5);

            const inMov = movements.find(m => m.type === "in");
            expect(inMov.warehouseId.toString()).toBe(destWH._id.toString());
            expect(inMov.quantity).toBe(5);
        });

        it("should return bad request (400) if source warehouse has insufficient stock", async () => {
            // Seed insufficient inventory in source warehouse (only 3 items, trying to transfer 5)
            await Inventory.create({
                organizationId: orgId,
                productId: product._id,
                warehouseId: sourceWH._id,
                quantity: 3
            });

            // Create pending stock transfer
            const transfer = await StockTransfer.create({
                organizationId: orgId,
                fromWarehouseId: sourceWH._id,
                toWarehouseId: destWH._id,
                productId: product._id,
                quantity: 5,
                status: "pending"
            });

            const res = await request(app)
                .post(`/api/stock-transfers/${transfer._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("Insufficient stock");
        });

        it("should return bad request (400) if transfer is already completed", async () => {
            // Seed inventory in source warehouse
            await Inventory.create({
                organizationId: orgId,
                productId: product._id,
                warehouseId: sourceWH._id,
                quantity: 15
            });

            // Create pending stock transfer
            const transfer = await StockTransfer.create({
                organizationId: orgId,
                fromWarehouseId: sourceWH._id,
                toWarehouseId: destWH._id,
                productId: product._id,
                quantity: 5,
                status: "pending"
            });

            // Approve once
            await request(app)
                .post(`/api/stock-transfers/${transfer._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            // Try to approve again
            const res = await request(app)
                .post(`/api/stock-transfers/${transfer._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(400);
        });

        it("should return forbidden (403) if user is not authorized", async () => {
            const transfer = await StockTransfer.create({
                organizationId: orgId,
                fromWarehouseId: sourceWH._id,
                toWarehouseId: destWH._id,
                productId: product._id,
                quantity: 5,
                status: "pending"
            });

            const res = await request(app)
                .post(`/api/stock-transfers/${transfer._id}/approve`)
                .set("Authorization", `Bearer ${userWithoutPermToken}`);

            expect(res.status).toBe(403);
        });
    });

});
