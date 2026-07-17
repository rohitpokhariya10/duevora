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
const { default: Permission } = await import("../../../shared/models/permission.model.js");
const { default: Category } = await import("../../../shared/models/category.model.js");
const { default: Unit } = await import("../../../shared/models/unit.model.js");
const { default: Product } = await import("../../../shared/models/product.model.js");

let mongoServer;
let app;
let orgId;
let adminUserToken;
let userWithoutPermToken;

beforeAll(async () => {
    // MongoMemoryReplSet replica set is required for transactions to work
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
    await Permission.create({
        name: "Create Products",
        code: "PRODUCTS.CREATE",
        module: "products"
    });

    await Permission.create({
        name: "View Products",
        code: "PRODUCTS.VIEW",
        module: "products"
    });

    await Permission.create({
        name: "Update Products",
        code: "PRODUCTS.UPDATE",
        module: "products"
    });

    await Permission.create({
        name: "Delete Products",
        code: "PRODUCTS.DELETE",
        module: "products"
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

describe("Products Management Integration Tests", () => {

    describe("POST /api/products", () => {
        let category, unit;

        beforeEach(async () => {
            category = await Category.create({ name: "Electronics", code: "ELEC", organizationId: orgId });
            unit = await Unit.create({ name: "Pieces", code: "PCS", organizationId: orgId });
        });

        it("should successfully create a product with valid details", async () => {
            const res = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "MacBook Pro",
                    sku: "MAC-PRO-16",
                    description: "16-inch high-performance laptop",
                    categoryId: category._id,
                    unitId: unit._id,
                    price: 2499,
                    cost: 1800,
                    status: "active"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("MacBook Pro");
            expect(res.body.data.sku).toBe("MAC-PRO-16");
            expect(res.body.data.price).toBe(2499);
            expect(res.body.data.cost).toBe(1800);
            expect(res.body.data.categoryId.toString()).toBe(category._id.toString());
            expect(res.body.data.unitId.toString()).toBe(unit._id.toString());
            expect(res.body.data.organizationId.toString()).toBe(orgId.toString());
        });

        it("should return conflict if SKU code already exists in same organization", async () => {
            await Product.create({
                name: "MacBook Pro",
                sku: "MAC-PRO-16",
                organizationId: orgId
            });

            const res = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "Alternative MacBook Pro",
                    sku: "MAC-PRO-16"
                });

            expect(res.status).toBe(409);
        });

        it("should return 404 if categoryId belongs to a foreign organization", async () => {
            const foreignOrg = await Organization.create({ name: "Foreign", code: "FRGN" });
            const foreignCategory = await Category.create({ name: "Foreign Elec", code: "FELE", organizationId: foreignOrg._id });

            const res = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "MacBook Pro",
                    sku: "MAC-PRO-16",
                    categoryId: foreignCategory._id
                });

            expect(res.status).toBe(404);
        });

        it("should return 404 if unitId belongs to a foreign organization", async () => {
            const foreignOrg = await Organization.create({ name: "Foreign", code: "FRGN" });
            const foreignUnit = await Unit.create({ name: "Foreign Unit", code: "FUNT", organizationId: foreignOrg._id });

            const res = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "MacBook Pro",
                    sku: "MAC-PRO-16",
                    unitId: foreignUnit._id
                });

            expect(res.status).toBe(404);
        });

        it("should return forbidden if user does not have PRODUCTS.CREATE permission", async () => {
            const res = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${userWithoutPermToken}`)
                .send({
                    name: "Unauthorized Product",
                    sku: "UNAUTH-SKU"
                });

            expect(res.status).toBe(403);
        });
    });

    describe("GET /api/products", () => {
        beforeEach(async () => {
            await Product.create([
                { name: "iPhone 14", sku: "IPHONE-14", price: 999, organizationId: orgId },
                { name: "MacBook Pro 14", sku: "MAC-PRO-14", price: 1999, organizationId: orgId },
                { name: "iPad Air", sku: "IPAD-AIR", price: 599, organizationId: orgId }
            ]);
        });

        it("should successfully list products with default pagination", async () => {
            const res = await request(app)
                .get("/api/products")
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBe(3);
            expect(res.body.pagination.total).toBe(3);
        });

        it("should filter products by search keyword", async () => {
            const res = await request(app)
                .get("/api/products?search=ipad")
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].name).toBe("iPad Air");
        });

        it("should sort products by price ascending", async () => {
            const res = await request(app)
                .get("/api/products?sortBy=price&sortOrder=asc")
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data[0].name).toBe("iPad Air");
            expect(res.body.data[1].name).toBe("iPhone 14");
            expect(res.body.data[2].name).toBe("MacBook Pro 14");
        });
    });

    describe("GET /api/products/:productId", () => {
        let product;

        beforeEach(async () => {
            product = await Product.create({ name: "iPhone 14", sku: "IPHONE-14", organizationId: orgId });
        });

        it("should successfully retrieve product details", async () => {
            const res = await request(app)
                .get(`/api/products/${product._id}`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("iPhone 14");
        });

        it("should return 404 if product belongs to a foreign organization", async () => {
            const foreignOrg = await Organization.create({ name: "Foreign", code: "FRGN" });
            const foreignProduct = await Product.create({ name: "Foreign Phone", sku: "F-PHONE", organizationId: foreignOrg._id });

            const res = await request(app)
                .get(`/api/products/${foreignProduct._id}`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe("PUT /api/products/:productId", () => {
        let product;

        beforeEach(async () => {
            product = await Product.create({ name: "iPhone 14", sku: "IPHONE-14", organizationId: orgId });
        });

        it("should successfully update product details", async () => {
            const res = await request(app)
                .put(`/api/products/${product._id}`)
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    name: "iPhone 14 Updated",
                    price: 1099
                });

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe("iPhone 14 Updated");
            expect(res.body.data.price).toBe(1099);
        });

        it("should return conflict if updated SKU already exists within organization", async () => {
            await Product.create({ name: "iPad Air", sku: "IPAD-AIR", organizationId: orgId });

            const res = await request(app)
                .put(`/api/products/${product._id}`)
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    sku: "IPAD-AIR"
                });

            expect(res.status).toBe(409);
        });
    });

    describe("DELETE /api/products/:productId", () => {
        let product;

        beforeEach(async () => {
            product = await Product.create({ name: "iPhone 14", sku: "IPHONE-14", organizationId: orgId });
        });

        it("should successfully soft delete a product", async () => {
            const res = await request(app)
                .delete(`/api/products/${product._id}`)
                .set("Authorization", `Bearer ${adminUserToken}`);

            expect(res.status).toBe(200);

            // Verify in DB
            const dbProduct = await Product.findById(product._id);
            expect(dbProduct.isDeleted).toBe(true);

            // Retrieval should now fail with 404
            const getRes = await request(app)
                .get(`/api/products/${product._id}`)
                .set("Authorization", `Bearer ${adminUserToken}`);
            expect(getRes.status).toBe(404);
        });
    });

    describe("POST /api/products/bulk-import", () => {
        it("should successfully import multiple products in transaction", async () => {
            const res = await request(app)
                .post("/api/products/bulk-import")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    products: [
                        { name: "Bulk Prod 1", sku: "B-PROD-1" },
                        { name: "Bulk Prod 2", sku: "B-PROD-2" }
                    ]
                });

            expect(res.status).toBe(201);
            expect(res.body.data.length).toBe(2);

            const p1 = await Product.findOne({ sku: "B-PROD-1" });
            expect(p1).toBeDefined();
        });

        it("should fail validation if there are local duplicate SKUs in input payload", async () => {
            const res = await request(app)
                .post("/api/products/bulk-import")
                .set("Authorization", `Bearer ${adminUserToken}`)
                .send({
                    products: [
                        { name: "Bulk Prod A", sku: "DUP-SKU" },
                        { name: "Bulk Prod B", sku: "DUP-SKU" }
                    ]
                });

            expect(res.status).toBe(400);
        });
    });

});
