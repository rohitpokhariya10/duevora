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
const { default: Customer } = await import("../../../shared/models/customer.model.js");
const { default: SalesOrder } = await import("../../../shared/models/salesOrder.model.js");

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
        name: "Update Sales Orders",
        code: "SALESORDERS.UPDATE",
        module: "salesOrders"
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

describe("Sales Orders Management Integration Tests", () => {
    let customer;

    beforeEach(async () => {
        customer = await Customer.create({ name: "Jane Doe", organizationId: orgId });
    });

    describe("POST /api/sales-orders/:orderId/approve", () => {
        it("should successfully approve a draft sales order", async () => {
            const order = await SalesOrder.create({
                organizationId: orgId,
                customerId: customer._id,
                orderNumber: "SO-2026-001",
                orderDate: new Date(),
                grandTotal: 1500,
                status: "draft"
            });

            const res = await request(app)
                .post(`/api/sales-orders/${order._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe("processing");
        });

        it("should return bad request if sales order is not in draft status", async () => {
            const order = await SalesOrder.create({
                organizationId: orgId,
                customerId: customer._id,
                orderNumber: "SO-2026-002",
                orderDate: new Date(),
                grandTotal: 1500,
                status: "processing"
            });

            const res = await request(app)
                .post(`/api/sales-orders/${order._id}/approve`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(400);
        });

        it("should return forbidden if user does not have SALESORDERS.UPDATE permission", async () => {
            const order = await SalesOrder.create({
                organizationId: orgId,
                customerId: customer._id,
                orderNumber: "SO-2026-003",
                orderDate: new Date(),
                grandTotal: 1500,
                status: "draft"
            });

            const res = await request(app)
                .post(`/api/sales-orders/${order._id}/approve`)
                .set("Authorization", `Bearer ${userWithoutPermToken}`);

            expect(res.status).toBe(403);
        });
    });

});
