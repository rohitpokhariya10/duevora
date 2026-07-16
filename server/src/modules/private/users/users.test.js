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
const { default: Role } = await import("../../../shared/models/role.model.js");
const { default: Permission } = await import("../../../shared/models/permission.model.js");

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

    // Seed permission for listing users
    const viewUsersPerm = await Permission.create({
        name: "View Users",
        code: "USERS.VIEW",
        module: "users"
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

    // Create a secondary user who does NOT have the users.view permission
    const normalUser = await User.create({
        name: "Normal User",
        email: "normal@example.com",
        password: "password123",
        isVerified: true
    });

    // Add this user as employee without USERS.VIEW permission (no roles assigned to them)
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

describe("Users Management — List Users Integration Tests", () => {

    describe("GET /api/users", () => {
        it("should list all users in the organization with pagination metadata", async () => {
            // Seed a third user belonging to the same organization
            const user3 = await User.create({
                name: "Developer Bob",
                email: "bob@example.com",
                password: "password123",
                isVerified: true
            });

            await Employee.create({
                userId: user3._id,
                organizationId: orgId,
                employeeCode: "EMP-003",
                firstName: "Developer",
                lastName: "Bob",
                email: "bob@example.com",
                status: "active"
            });

            const res = await request(app)
                .get("/api/users")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .query({ page: 1, limit: 10 });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBe(3); // admin, normal, bob
            expect(res.body.pagination).toBeDefined();
            expect(res.body.pagination.total).toBe(3);
            expect(res.body.pagination.pages).toBe(1);
        });

        it("should filter users by search keyword", async () => {
            const user3 = await User.create({
                name: "Developer Bob",
                email: "bob@example.com",
                password: "password123",
                isVerified: true
            });

            await Employee.create({
                userId: user3._id,
                organizationId: orgId,
                employeeCode: "EMP-003",
                firstName: "Developer",
                lastName: "Bob",
                email: "bob@example.com",
                status: "active"
            });

            const res = await request(app)
                .get("/api/users")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .query({ search: "bob" });

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].email).toBe("bob@example.com");
        });

        it("should sort users by name in descending order", async () => {
            const res = await request(app)
                .get("/api/users")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .query({ sortBy: "name", sortOrder: "desc" });

            expect(res.status).toBe(200);
            // "Normal User" should come before "Admin User" in descending order
            expect(res.body.data[0].name).toBe("Normal User");
            expect(res.body.data[1].name).toBe("Admin User");
        });

        it("should return forbidden if user does not have USERS.VIEW permission", async () => {
            const res = await request(app)
                .get("/api/users")
                .set("Authorization", `Bearer ${userWithoutPermToken}`);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it("should return unauthorized if access token is missing", async () => {
            const res = await request(app)
                .get("/api/users");

            expect(res.status).toBe(401);
        });
    });

});
