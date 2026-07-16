import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import OrganizationDao from "../organization.dao.js";

const organizationDao = new OrganizationDao();

beforeAll(async () => {
    await connectTestDB();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearTestDB();
});

describe("Organization DAO Tests", () => {
    it("should create an organization successfully", async () => {
        const orgData = {
            name: "Test Corp",
            code: "TCORP",
            address: "123 Test St",
            logo: "logo.png"
        };
        const org = await organizationDao.create(orgData);
        expect(org).toBeDefined();
        expect(org.name).toBe(orgData.name);
        expect(org.code).toBe(orgData.code);
        expect(org.status).toBe("active");
        expect(org._id).toBeDefined();
    });

    it("should fail to create organization without required fields", async () => {
        await expect(organizationDao.create({ code: "TCORP" })).rejects.toThrow();
        await expect(organizationDao.create({ name: "Test Corp" })).rejects.toThrow();
    });

    it("should find an organization by id", async () => {
        const org = await organizationDao.create({ name: "Test Corp", code: "TCORP" });
        const found = await organizationDao.findById(org._id);
        expect(found).toBeDefined();
        expect(found.name).toBe("Test Corp");
    });

    it("should find one organization by filter", async () => {
        await organizationDao.create({ name: "Test Corp", code: "TCORP" });
        const found = await organizationDao.findOne({ code: "TCORP" });
        expect(found).toBeDefined();
        expect(found.name).toBe("Test Corp");
    });

    it("should find multiple organizations matching filter", async () => {
        await organizationDao.create({ name: "Test Corp 1", code: "TC1" });
        await organizationDao.create({ name: "Test Corp 2", code: "TC2" });
        const results = await organizationDao.find();
        expect(results.length).toBe(2);
    });

    it("should update organization details by id", async () => {
        const org = await organizationDao.create({ name: "Test Corp", code: "TCORP" });
        const updated = await organizationDao.updateById(org._id, { name: "Updated Corp" });
        expect(updated.name).toBe("Updated Corp");
    });

    it("should delete organization by id", async () => {
        const org = await organizationDao.create({ name: "Test Corp", code: "TCORP" });
        await organizationDao.deleteById(org._id);
        const found = await organizationDao.findById(org._id);
        expect(found).toBeNull();
    });
});
