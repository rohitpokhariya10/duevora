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
const { default: Role } = await import("../../../shared/models/role.model.js");
const { default: Permission } = await import("../../../shared/models/permission.model.js");
const { default: RolePermission } = await import("../../../shared/models/rolePermission.model.js");

let mongoServer;
let app;
let orgId;
let adminUserToken;
let userWithoutPermToken;
let testRoleId;
let perm1Id;
let perm2Id;

beforeAll(async () => {
    // MongoMemoryReplSet is required for transaction support in tests
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
    const perm1 = await Permission.create({
        name: "Create Roles",
        code: "ROLES.CREATE",
        module: "roles"
    });

    const perm2 = await Permission.create({
        name: "Update Roles",
        code: "ROLES.UPDATE",
        module: "roles"
    });

    perm1Id = perm1._id;
    perm2Id = perm2._id;

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

    // Create a role to bind permissions to
    const role = await Role.create({
        name: "Test Role",
        code: "TEST_ROLE",
        organizationId: orgId
    });
    testRoleId = role._id;

    // Create a secondary user who does NOT have the roles.update permission
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

describe("Roles Management — Create & Bind Permissions Integration Tests", () => {

    describe("POST /api/roles", () => {
        it("should successfully create a role", async () => {
            const res = await request(app)
                .post("/api/roles")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Junior Accountant",
                    code: "JR_ACCT",
                    description: "Entry level accounting role"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("Junior Accountant");
            expect(res.body.data.code).toBe("JR_ACCT");
            expect(res.body.data.description).toBe("Entry level accounting role");
            expect(res.body.data.organizationId.toString()).toBe(orgId.toString());
        });

        it("should fail validation if code is not alphanumeric", async () => {
            const res = await request(app)
                .post("/api/roles")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Manager Role",
                    code: "MGR-01"
                });

            expect(res.status).toBe(400);
        });

        it("should return conflict if role code already exists within same organization", async () => {
            // Create first role
            await request(app)
                .post("/api/roles")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Junior Accountant",
                    code: "JR_ACCT"
                });

            // Attempt to create second role with same code
            const res = await request(app)
                .post("/api/roles")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Second Accountant",
                    code: "jr_acct"
                });

            expect(res.status).toBe(409);
        });

        it("should return forbidden if user does not have ROLES.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/roles")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    name: "Manager",
                    code: "MGR"
                });

            expect(res.status).toBe(403);
        });
    });

    describe("POST /api/roles/:roleId/permissions", () => {
        it("should successfully bind permissions to a role", async () => {
            const res = await request(app)
                .post(`/api/roles/${testRoleId}/permissions`)
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    permissionIds: [perm1Id, perm2Id]
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify in DB
            const dbBindings = await RolePermission.find({ roleId: testRoleId });
            expect(dbBindings.length).toBe(2);
            expect(dbBindings.map(b => b.permissionId.toString())).toContain(perm1Id.toString());
            expect(dbBindings.map(b => b.permissionId.toString())).toContain(perm2Id.toString());
        });

        it("should override existing bindings on consecutive calls", async () => {
            // First bind perm1
            await request(app)
                .post(`/api/roles/${testRoleId}/permissions`)
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    permissionIds: [perm1Id]
                });

            // Consecutively bind perm2
            const res = await request(app)
                .post(`/api/roles/${testRoleId}/permissions`)
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    permissionIds: [perm2Id]
                });

            expect(res.status).toBe(200);

            // Verify in DB: only perm2 should exist now
            const dbBindings = await RolePermission.find({ roleId: testRoleId });
            expect(dbBindings.length).toBe(1);
            expect(dbBindings[0].permissionId.toString()).toBe(perm2Id.toString());
        });

        it("should return 400 bad request if any permission ID is invalid", async () => {
            const res = await request(app)
                .post(`/api/roles/${testRoleId}/permissions`)
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    permissionIds: [perm1Id, new mongoose.Types.ObjectId()] // fake permission id
                });

            expect(res.status).toBe(400);
        });

        it("should return 404 not found if role belongs to another organization", async () => {
            // Seed foreign role
            const foreignOrg = await Organization.create({ name: "Foreign", code: "FRGN" });
            const foreignRole = await Role.create({ name: "Foreign Role", code: "FR", organizationId: foreignOrg._id });

            const res = await request(app)
                .post(`/api/roles/${foreignRole._id}/permissions`)
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    permissionIds: [perm1Id]
                });

            expect(res.status).toBe(404);
        });

        it("should return forbidden if user does not have ROLES.UPDATE permission", async () => {
            const res = await request(app)
                .post(`/api/roles/${testRoleId}/permissions`)
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    permissionIds: [perm1Id]
                });

            expect(res.status).toBe(403);
        });
    });

});
