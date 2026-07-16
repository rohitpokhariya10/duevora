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

    // Seed permissions
    await Permission.create({
        name: "Create Customers",
        code: "CUSTOMERS.CREATE",
        module: "customers"
    });

    await Permission.create({
        name: "View Customers",
        code: "CUSTOMERS.VIEW",
        module: "customers"
    });

    // Create an Admin user
    const adminUser = await User.create({
        name: "Admin User",
        email: "admin@example.com",
        password: "password123",
        isVerified: true
    });

    // Onboard Admin User to set up Organization and admin role
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

    // Create a secondary user who does NOT have the permissions
    const normalUser = await User.create({
        name: "Normal User",
        email: "normal@example.com",
        password: "password123",
        isVerified: true
    });

    // Add this user as employee without roles
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

describe("Customers Management Integration Tests", () => {

    describe("POST /api/customers", () => {
        it("should successfully create a customer profile", async () => {
            const res = await request(app)
                .post("/api/customers")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Acme Corp",
                    email: "info@acme.com",
                    phone: "1234567890",
                    address: "123 Industrial Way",
                    taxNumber: "TAX-1234",
                    status: "active"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("Acme Corp");
            expect(res.body.data.email).toBe("info@acme.com");
            expect(res.body.data.phone).toBe("1234567890");
            expect(res.body.data.address).toBe("123 Industrial Way");
            expect(res.body.data.taxNumber).toBe("TAX-1234");
            expect(res.body.data.status).toBe("active");
            expect(res.body.data.organizationId.toString()).toBe(orgId.toString());
        });

        it("should fail validation if email is invalid", async () => {
            const res = await request(app)
                .post("/api/customers")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Acme Corp",
                    email: "bad-email"
                });

            expect(res.status).toBe(400);
        });

        it("should return conflict if customer email already exists within same organization", async () => {
            // Create first customer
            await request(app)
                .post("/api/customers")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "First Acme",
                    email: "info@acme.com"
                });

            // Attempt to create second customer with same email
            const res = await request(app)
                .post("/api/customers")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Second Acme",
                    email: "info@acme.com"
                });

            expect(res.status).toBe(409);
        });

        it("should allow duplicate email across different organizations", async () => {
            // Create first customer in org 1
            await request(app)
                .post("/api/customers")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Org1 Acme",
                    email: "info@acme.com"
                });

            // Seed a foreign organization and user/token
            const foreignOrg = await Organization.create({ name: "Foreign Corp", code: "FRGN" });
            const foreignUser = await User.create({ name: "Foreign User", email: "foreign@example.com", password: "password123" });
            
            // Onboard foreign organization
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({ email: "foreign@example.com", password: "password123" });
            
            const token = loginRes.body.data.accessToken;

            const onboardRes = await request(app)
                .post("/api/organization")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "Foreign Corp Org",
                    code: "FCORP",
                    firstName: "Foreign",
                    lastName: "User"
                });

            const foreignUserToken = onboardRes.body.data.accessToken;

            // Create customer in org 2 with same email
            const res = await request(app)
                .post("/api/customers")
                .set("Authorization", `Bearer ${foreignUserToken}`)
                .send({
                    name: "Org2 Acme",
                    email: "info@acme.com" // same email, different org
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it("should return forbidden if user does not have CUSTOMERS.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/customers")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    name: "Unauthorized Customer"
                });

            expect(res.status).toBe(403);
        });

        it("should return unauthorized if access token is missing", async () => {
            const res = await request(app)
                .post("/api/customers")
                .send({
                    name: "Unauthenticated Customer"
                });

            expect(res.status).toBe(401);
        });
    });

    describe("GET /api/customers", () => {
        beforeEach(async () => {
            // Seed multiple customers in organization
            await Customer.create([
                { name: "Acme Corp", email: "info@acme.com", organizationId: orgId },
                { name: "Beta Systems", email: "support@beta.com", organizationId: orgId },
                { name: "Gamma Ltd", email: "sales@gamma.com", organizationId: orgId }
            ]);
        });

        it("should successfully list customers with default pagination", async () => {
            const res = await request(app)
                .get("/api/customers")
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBe(3);
            expect(res.body.pagination.total).toBe(3);
            expect(res.body.pagination.page).toBe(1);
            expect(res.body.pagination.limit).toBe(20);
        });

        it("should list customers with custom limit and page parameters", async () => {
            const res = await request(app)
                .get("/api/customers?page=2&limit=2")
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.pagination.total).toBe(3);
            expect(res.body.pagination.pages).toBe(2);
        });

        it("should filter customers by search keyword", async () => {
            const res = await request(app)
                .get("/api/customers?search=beta")
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].name).toBe("Beta Systems");
        });

        it("should sort customers by sortBy field", async () => {
            const res = await request(app)
                .get("/api/customers?sortBy=name&sortOrder=desc")
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data[0].name).toBe("Gamma Ltd");
            expect(res.body.data[1].name).toBe("Beta Systems");
            expect(res.body.data[2].name).toBe("Acme Corp");
        });

        it("should not return customers from other organizations", async () => {
            // Seed customer in foreign org
            const foreignOrg = await Organization.create({ name: "Foreign", code: "FRGN" });
            await Customer.create({
                name: "Foreign Customer",
                email: "foreign@example.com",
                organizationId: foreignOrg._id
            });

            const res = await request(app)
                .get("/api/customers")
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            // foreign customer should not be in listing
            expect(res.body.data.some(c => c.name === "Foreign Customer")).toBe(false);
            expect(res.body.pagination.total).toBe(3);
        });

        it("should return forbidden if user does not have CUSTOMERS.VIEW permission", async () => {
            const res = await request(app)
                .get("/api/customers")
                .set("Authorization", `Bearer ${userWithoutPermToken}`);

            expect(res.status).toBe(403);
        });
    });

});
