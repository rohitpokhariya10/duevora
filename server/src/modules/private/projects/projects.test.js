import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

jest.unstable_mockModule("../../../shared/utils/sendMail.util.js", () => ({
    __esModule: true,
    default: jest.fn(),
}));

const { default: createApp } = await import("../../../app.js");
const { default: User } = await import("../../../shared/models/user.model.js");
const { default: Employee } = await import("../../../shared/models/employee.model.js");
const { default: Permission } = await import("../../../shared/models/permission.model.js");
const { default: Customer } = await import("../../../shared/models/customer.model.js");
const { default: Project } = await import("../../../shared/models/project.model.js");

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
    for (const key in mongoose.connection.collections) {
        await mongoose.connection.collections[key].deleteMany({});
    }

    await Permission.create({ name: "Create Projects", code: "PROJECTS.CREATE", module: "projects" });

    const adminUser = await User.create({ name: "Admin User", email: "admin@example.com", password: "password123", isVerified: true });
    const loginRes = await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "password123" });
    const token = loginRes.body.data.accessToken;

    const onboardRes = await request(app).post("/api/organization").set("Authorization", `Bearer ${token}`)
        .send({ name: "Test Corp", code: "TCORP", firstName: "Admin", lastName: "User" });
    adminUserToken = onboardRes.body.data.accessToken;
    orgId = onboardRes.body.data.organization._id;

    const normalUser = await User.create({ name: "Normal User", email: "normal@example.com", password: "password123", isVerified: true });
    await Employee.create({ userId: normalUser._id, organizationId: orgId, employeeCode: "EMP-002", firstName: "Normal", lastName: "User", email: "normal@example.com", status: "active" });
    const normalLogin = await request(app).post("/api/auth/login").send({ email: "normal@example.com", password: "password123" });
    userWithoutPermToken = normalLogin.body.data.accessToken;
});

describe("Projects Management Integration Tests", () => {
    let customer;

    beforeEach(async () => {
        customer = await Customer.create({ name: "Client A", organizationId: orgId });
    });

    describe("POST /api/projects", () => {
        it("should successfully create a project with a linked customer", async () => {
            const res = await request(app)
                .post("/api/projects")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ name: "Website Redesign", code: "web_01", customerId: customer._id });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.code).toBe("WEB_01");
            expect(res.body.data.status).toBe("active");
        });

        it("should return conflict if project code already exists", async () => {
            await Project.create({ name: "Website Redesign", code: "WEB_01", organizationId: orgId });
            const res = await request(app)
                .post("/api/projects")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({ name: "Another Project", code: "web_01" });
            expect(res.status).toBe(409);
        });

        it("should return forbidden without permission", async () => {
            const res = await request(app)
                .post("/api/projects")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({ name: "Secret Project", code: "sec_01" });
            expect(res.status).toBe(403);
        });
    });
});
