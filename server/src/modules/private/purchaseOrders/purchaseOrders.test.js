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
const { default: Vendor } = await import("../../../shared/models/vendor.model.js");
const { default: PurchaseOrder } = await import("../../../shared/models/purchaseOrder.model.js");

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
        name: "Create Purchase Orders",
        code: "PURCHASEORDERS.CREATE",
        module: "purchaseOrders"
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

describe("Purchase Orders Management Integration Tests", () => {
    let vendor;

    beforeEach(async () => {
        vendor = await Vendor.create({ name: "Supplier Inc", organizationId: orgId });
    });

    describe("POST /api/purchase-orders", () => {
        it("should successfully create a purchase order", async () => {
            const res = await request(app)
                .post("/api/purchase-orders")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    vendorId: vendor._id,
                    poNumber: "PO-2026-001",
                    poDate: "2026-07-17",
                    grandTotal: 1500,
                    status: "draft"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.poNumber).toBe("PO-2026-001");
            expect(res.body.data.vendorId.toString()).toBe(vendor._id.toString());
            expect(res.body.data.status).toBe("draft");
            expect(res.body.data.organizationId.toString()).toBe(orgId.toString());
        });

        it("should return conflict if PO number already exists in same organization", async () => {
            await PurchaseOrder.create({
                vendorId: vendor._id,
                poNumber: "PO-2026-001",
                poDate: new Date(),
                grandTotal: 1500,
                organizationId: orgId
            });

            const res = await request(app)
                .post("/api/purchase-orders")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    vendorId: vendor._id,
                    poNumber: "PO-2026-001",
                    poDate: "2026-07-17",
                    grandTotal: 1500
                });

            expect(res.status).toBe(409);
        });

        it("should allow duplicate PO number across different organizations", async () => {
            await PurchaseOrder.create({
                vendorId: vendor._id,
                poNumber: "PO-2026-001",
                poDate: new Date(),
                grandTotal: 1500,
                organizationId: orgId
            });

            const foreignOrg = await Organization.create({ name: "Foreign Corp", code: "FRGN" });
            const foreignUser = await User.create({ name: "Foreign User", email: "foreign@example.com", password: "password123", isVerified: true });

            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({ email: "foreign@example.com", password: "password123" });

            const onboardRes = await request(app)
                .post("/api/organization")
                .set("Authorization", `Bearer ${loginRes.body.data.accessToken}`)
                .send({
                    name: "Foreign Corp Org",
                    code: "FCORP",
                    firstName: "Foreign",
                    lastName: "User"
                });

            const foreignToken = onboardRes.body.data.accessToken;
            const foreignOrgId = onboardRes.body.data.organization._id;
            const foreignVendor = await Vendor.create({ name: "Foreign Vendor", organizationId: foreignOrgId });

            const res = await request(app)
                .post("/api/purchase-orders")
                .set("Authorization", `Bearer ${foreignToken}`)
                .send({
                    vendorId: foreignVendor._id,
                    poNumber: "PO-2026-001",
                    poDate: "2026-07-17",
                    grandTotal: 1500
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it("should return forbidden if user does not have PURCHASEORDERS.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/purchase-orders")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    vendorId: vendor._id,
                    poNumber: "PO-2026-001",
                    poDate: "2026-07-17",
                    grandTotal: 1500
                });

            expect(res.status).toBe(403);
        });
    });

});
