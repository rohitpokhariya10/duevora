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
const { default: Category } = await import("../../../shared/models/category.model.js");

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
        name: "Create Categories",
        code: "CATEGORIES.CREATE",
        module: "categories"
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

describe("Categories Management Integration Tests", () => {

    describe("POST /api/categories", () => {
        it("should successfully create a parent category", async () => {
            const res = await request(app)
                .post("/api/categories")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Electronics",
                    code: "ELEC"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("Electronics");
            expect(res.body.data.code).toBe("ELEC");
            expect(res.body.data.parentId).toBeUndefined();
            expect(res.body.data.organizationId.toString()).toBe(orgId.toString());
        });

        it("should successfully create a subcategory with a valid parentId", async () => {
            const parent = await Category.create({
                name: "Electronics",
                code: "ELEC",
                organizationId: orgId
            });

            const res = await request(app)
                .post("/api/categories")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Laptops",
                    code: "LAP",
                    parentId: parent._id
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("Laptops");
            expect(res.body.data.code).toBe("LAP");
            expect(res.body.data.parentId.toString()).toBe(parent._id.toString());
        });

        it("should return conflict if category code already exists in same organization", async () => {
            await Category.create({
                name: "Electronics",
                code: "ELEC",
                organizationId: orgId
            });

            const res = await request(app)
                .post("/api/categories")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Consumer Electronics",
                    code: "elec" // case-insensitive check
                });

            expect(res.status).toBe(409);
        });

        it("should allow duplicate category code across different organizations", async () => {
            await Category.create({
                name: "Org1 Category",
                code: "ELEC",
                organizationId: orgId
            });

            const foreignOrg = await Organization.create({ name: "Foreign Corp", code: "FRGN" });
            const foreignUser = await User.create({ name: "Foreign User", email: "foreign@example.com", password: "password123" });

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

            const res = await request(app)
                .post("/api/categories")
                .set("Authorization", `Bearer ${foreignToken}`)
                .send({
                    name: "Org2 Category",
                    code: "ELEC"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it("should return 404 not found if parentId does not exist", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .post("/api/categories")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Laptops",
                    code: "LAP",
                    parentId: fakeId
                });

            expect(res.status).toBe(404);
        });

        it("should return 404 not found if parentId belongs to a foreign organization", async () => {
            const foreignOrg = await Organization.create({ name: "Foreign Corp", code: "FRGN" });
            const foreignParent = await Category.create({
                name: "Foreign Parent",
                code: "FRGN-P",
                organizationId: foreignOrg._id
            });

            const res = await request(app)
                .post("/api/categories")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Laptops",
                    code: "LAP",
                    parentId: foreignParent._id
                });

            expect(res.status).toBe(404);
        });

        it("should return forbidden if user does not have CATEGORIES.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/categories")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    name: "Unpermitted",
                    code: "UNPM"
                });

            expect(res.status).toBe(403);
        });
    });

});
