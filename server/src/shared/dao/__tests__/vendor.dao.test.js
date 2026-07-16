import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import VendorDao from "../vendor.dao.js";
import OrganizationDao from "../organization.dao.js";

const vendorDao = new VendorDao();
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

describe("Vendor DAO Tests", () => {
    let org;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
    });

    it("should create a vendor successfully", async () => {
        const vendorData = {
            organizationId: org._id,
            name: "Supplier Inc",
            email: "supplier@example.com",
            phone: "0987654321",
            address: "456 Industrial Way",
            taxNumber: "TAX789"
        };
        const vendor = await vendorDao.create(vendorData);
        expect(vendor).toBeDefined();
        expect(vendor.name).toBe("Supplier Inc");
        expect(vendor.email).toBe("supplier@example.com");
        expect(vendor.status).toBe("active");
    });

    it("should fail to create vendor without required fields", async () => {
        await expect(vendorDao.create({ organizationId: org._id })).rejects.toThrow();
        await expect(vendorDao.create({ name: "Supplier Inc" })).rejects.toThrow();
    });

    it("should find vendor by id", async () => {
        const vendor = await vendorDao.create({
            organizationId: org._id,
            name: "Supplier Inc",
            email: "supplier@example.com"
        });

        const found = await vendorDao.findById(vendor._id);
        expect(found).toBeDefined();
        expect(found.organizationId._id.toString()).toBe(org._id.toString());
        expect(found.name).toBe("Supplier Inc");
    });

    it("should update vendor details", async () => {
        const vendor = await vendorDao.create({
            organizationId: org._id,
            name: "Supplier Inc",
            email: "supplier@example.com"
        });

        const updated = await vendorDao.updateById(vendor._id, { name: "Supplier LLC" });
        expect(updated.name).toBe("Supplier LLC");
    });

    it("should delete vendor by id", async () => {
        const vendor = await vendorDao.create({
            organizationId: org._id,
            name: "Supplier Inc",
            email: "supplier@example.com"
        });

        await vendorDao.deleteById(vendor._id);
        const found = await vendorDao.findById(vendor._id);
        expect(found).toBeNull();
    });
});
