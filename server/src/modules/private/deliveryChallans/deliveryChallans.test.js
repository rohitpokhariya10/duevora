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
const { default: DeliveryChallan } = await import("../../../shared/models/deliveryChallan.model.js");

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
        name: "Create Delivery Challans",
        code: "DELIVERYCHALLANS.CREATE",
        module: "deliveryChallans"
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

describe("Delivery Challans Management Integration Tests", () => {
    let customer;

    beforeEach(async () => {
        customer = await Customer.create({ name: "John Doe", organizationId: orgId });
    });

    describe("POST /api/delivery-challans", () => {
        it("should successfully create a delivery challan", async () => {
            const res = await request(app)
                .post("/api/delivery-challans")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    customerId: customer._id,
                    challanNumber: "DC-2026-001",
                    challanDate: "2026-07-17",
                    status: "draft"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.challanNumber).toBe("DC-2026-001");
            expect(res.body.data.customerId.toString()).toBe(customer._id.toString());
            expect(res.body.data.status).toBe("draft");
            expect(res.body.data.organizationId.toString()).toBe(orgId.toString());
        });

        it("should return conflict if challan number already exists in same organization", async () => {
            await DeliveryChallan.create({
                customerId: customer._id,
                challanNumber: "DC-2026-001",
                challanDate: new Date(),
                organizationId: orgId
            });

            const res = await request(app)
                .post("/api/delivery-challans")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    customerId: customer._id,
                    challanNumber: "DC-2026-001",
                    challanDate: "2026-07-17"
                });

            expect(res.status).toBe(409);
        });

        it("should allow duplicate challan number across different organizations", async () => {
            await DeliveryChallan.create({
                customerId: customer._id,
                challanNumber: "DC-2026-001",
                challanDate: new Date(),
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
            const foreignCustomer = await Customer.create({ name: "Foreign Customer", organizationId: foreignOrgId });

            const res = await request(app)
                .post("/api/delivery-challans")
                .set("Authorization", `Bearer ${foreignToken}`)
                .send({
                    customerId: foreignCustomer._id,
                    challanNumber: "DC-2026-001",
                    challanDate: "2026-07-17"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it("should return forbidden if user does not have DELIVERYCHALLANS.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/delivery-challans")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    customerId: customer._id,
                    challanNumber: "DC-2026-001",
                    challanDate: "2026-07-17"
                });

            expect(res.status).toBe(403);
        });
    });

});
