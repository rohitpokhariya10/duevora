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
let employeeId;

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

    // Seed permission for creating departments
    await Permission.create({
        name: "Create Departments",
        code: "DEPARTMENTS.CREATE",
        module: "departments"
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
    employeeId = onboardRes.body.data.employee._id;

    // Create a secondary user who does NOT have the departments.create permission
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

describe("Departments Management — Create Department Integration Tests", () => {

    describe("POST /api/departments", () => {
        it("should successfully create a department", async () => {
            const res = await request(app)
                .post("/api/departments")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Engineering",
                    code: "ENG",
                    managerId: employeeId
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("Engineering");
            expect(res.body.data.code).toBe("ENG");
            expect(res.body.data.managerId.toString()).toBe(employeeId.toString());
            expect(res.body.data.organizationId.toString()).toBe(orgId.toString());
        });

        it("should fail validation if code is not alphanumeric", async () => {
            const res = await request(app)
                .post("/api/departments")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Engineering Department",
                    code: "ENG-01"
                });

            expect(res.status).toBe(400);
        });

        it("should return conflict if department code already exists within same organization", async () => {
            // Create first department
            await request(app)
                .post("/api/departments")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Engineering",
                    code: "ENG"
                });

            // Attempt to create second department with same code
            const res = await request(app)
                .post("/api/departments")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Software Eng",
                    code: "eng"
                });

            expect(res.status).toBe(409);
        });

        it("should return bad request if manager employee ID is from another organization", async () => {
            // Seed a foreign organization and employee
            const foreignOrg = await Organization.create({ name: "Foreign", code: "FRGN" });
            const foreignUser = await User.create({ name: "Foreign User", email: "foreign@example.com", password: "password123" });
            const foreignEmployee = await Employee.create({
                userId: foreignUser._id,
                organizationId: foreignOrg._id,
                employeeCode: "FEMP-01",
                firstName: "Foreign",
                lastName: "User",
                email: "foreign@example.com",
                status: "active"
            });

            const res = await request(app)
                .post("/api/departments")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Foreign Ops",
                    code: "FOPS",
                    managerId: foreignEmployee._id
                });

            expect(res.status).toBe(400);
        });

        it("should return forbidden if user does not have DEPARTMENTS.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/departments")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    name: "Sales",
                    code: "SLS"
                });

            expect(res.status).toBe(403);
        });

        it("should return unauthorized if access token is missing", async () => {
            const res = await request(app)
                .post("/api/departments")
                .send({
                    name: "Finance",
                    code: "FIN"
                });

            expect(res.status).toBe(401);
        });
    });

});
