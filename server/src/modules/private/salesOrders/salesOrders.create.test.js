import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

jest.unstable_mockModule("../../../shared/utils/sendMail.util.js", () => ({ __esModule: true, default: jest.fn() }));

const { default: createApp } = await import("../../../app.js");
const { default: User } = await import("../../../shared/models/user.model.js");
const { default: Employee } = await import("../../../shared/models/employee.model.js");
const { default: Permission } = await import("../../../shared/models/permission.model.js");
const { default: Customer } = await import("../../../shared/models/customer.model.js");
const { default: SalesOrder } = await import("../../../shared/models/salesOrder.model.js");

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
    await Permission.create({ name: "Create Sales Orders", code: "SALESORDERS.CREATE", module: "salesOrders" });
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

describe("Sales Orders Create Integration Tests", () => {
    let customer;

    beforeEach(async () => {
        customer = await Customer.create({ name: "Test Customer", organizationId: orgId });
    });

    describe("POST /api/sales-orders", () => {
        it("should create a sales order successfully", async () => {
            const res = await request(app)
                .post("/api/sales-orders")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ customerId: customer._id, orderNumber: "SO-2026-001", orderDate: "2026-07-17", grandTotal: 5000 });
            expect(res.status).toBe(201);
            expect(res.body.data.orderNumber).toBe("SO-2026-001");
            expect(res.body.data.status).toBe("draft");
        });

        it("should return conflict if order number already exists", async () => {
            await SalesOrder.create({ organizationId: orgId, customerId: customer._id, orderNumber: "SO-2026-001", orderDate: new Date(), grandTotal: 5000 });
            const res = await request(app)
                .post("/api/sales-orders")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ customerId: customer._id, orderNumber: "so-2026-001", orderDate: "2026-07-17", grandTotal: 5000 });
            expect(res.status).toBe(409);
        });

        it("should return forbidden without permission", async () => {
            const res = await request(app).post("/api/sales-orders").set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({ customerId: customer._id, orderNumber: "SO-X", orderDate: "2026-07-17", grandTotal: 100 });
            expect(res.status).toBe(403);
        });
    });
});
