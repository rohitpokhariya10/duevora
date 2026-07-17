import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

jest.unstable_mockModule("../../../shared/utils/sendMail.util.js", () => ({ __esModule: true, default: jest.fn() }));

const { default: createApp } = await import("../../../app.js");
const { default: User } = await import("../../../shared/models/user.model.js");
const { default: Employee } = await import("../../../shared/models/employee.model.js");
const { default: Permission } = await import("../../../shared/models/permission.model.js");
const { default: Product } = await import("../../../shared/models/product.model.js");
const { default: Warehouse } = await import("../../../shared/models/warehouse.model.js");
const { default: Inventory } = await import("../../../shared/models/inventory.model.js");

let mongoServer, app, orgId, adminUserToken, userWithoutPermToken;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    for (const key in mongoose.connection.collections) { await mongoose.connection.collections[key].deleteMany({}); }
    await Permission.create({ name: "Create Stock Transfers", code: "STOCKTRANSFERS.CREATE", module: "stockTransfers" });
    await User.create({ name: "Admin User", email: "admin@example.com", password: "password123", isVerified: true });
    const loginRes = await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "password123" });
    const onboardRes = await request(app).post("/api/organization").set("Authorization", `Bearer ${loginRes.body.data.accessToken}`)
        .send({ name: "Test Corp", code: "TCORP", firstName: "Admin", lastName: "User" });
    adminUserToken = onboardRes.body.data.accessToken;
    orgId = onboardRes.body.data.organization._id;
    const normalUser = await User.create({ name: "Normal User", email: "normal@example.com", password: "password123", isVerified: true });
    await Employee.create({ userId: normalUser._id, organizationId: orgId, employeeCode: "EMP-002", firstName: "Normal", lastName: "User", email: "normal@example.com", status: "active" });
    const normalLogin = await request(app).post("/api/auth/login").send({ email: "normal@example.com", password: "password123" });
    userWithoutPermToken = normalLogin.body.data.accessToken;
});

describe("Stock Transfers Create Integration Tests", () => {
    let product, whFrom, whTo;

    beforeEach(async () => {
        product = await Product.create({ name: "Widget", sku: "WGT-01", organizationId: orgId });
        whFrom = await Warehouse.create({ name: "Mumbai", code: "MUM", organizationId: orgId });
        whTo = await Warehouse.create({ name: "Delhi", code: "DEL", organizationId: orgId });
        await Inventory.create({ organizationId: orgId, productId: product._id, warehouseId: whFrom._id, quantity: 100 });
    });

    describe("POST /api/stock-transfers", () => {
        it("should create a pending stock transfer", async () => {
            const res = await request(app)
                .post("/api/stock-transfers")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ fromWarehouseId: whFrom._id, toWarehouseId: whTo._id, productId: product._id, quantity: 10 });
            expect(res.status).toBe(201);
            expect(res.body.data.status).toBe("pending");
            expect(res.body.data.quantity).toBe(10);
        });

        it("should return 400 if source and destination are the same", async () => {
            const res = await request(app)
                .post("/api/stock-transfers")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ fromWarehouseId: whFrom._id, toWarehouseId: whFrom._id, productId: product._id, quantity: 5 });
            expect(res.status).toBe(400);
        });

        it("should return forbidden without permission", async () => {
            const res = await request(app).post("/api/stock-transfers").set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({ fromWarehouseId: whFrom._id, toWarehouseId: whTo._id, productId: product._id, quantity: 5 });
            expect(res.status).toBe(403);
        });
    });
});
