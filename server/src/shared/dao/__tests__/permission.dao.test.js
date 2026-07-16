import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import PermissionDao from "../permission.dao.js";

const permissionDao = new PermissionDao();

beforeAll(async () => {
    await connectTestDB();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearTestDB();
});

describe("Permission DAO Tests", () => {
    it("should create a permission successfully", async () => {
        const permData = {
            name: "Create Product",
            code: "PRODUCT_CREATE",
            module: "inventory",
            description: "Allows creating products"
        };
        const perm = await permissionDao.create(permData);
        expect(perm).toBeDefined();
        expect(perm.name).toBe("Create Product");
        expect(perm.code).toBe("PRODUCT_CREATE");
    });

    it("should fail to create duplicate permission code", async () => {
        const permData = {
            name: "Create Product",
            code: "PRODUCT_CREATE",
            module: "inventory"
        };
        await permissionDao.create(permData);
        await expect(permissionDao.create({
            name: "Create New Product",
            code: "PRODUCT_CREATE",
            module: "inventory"
        })).rejects.toThrow();
    });

    it("should find permission by id", async () => {
        const perm = await permissionDao.create({
            name: "Create Product",
            code: "PRODUCT_CREATE",
            module: "inventory"
        });
        const found = await permissionDao.findById(perm._id);
        expect(found).toBeDefined();
        expect(found.name).toBe("Create Product");
    });

    it("should update permission details", async () => {
        const perm = await permissionDao.create({
            name: "Create Product",
            code: "PRODUCT_CREATE",
            module: "inventory"
        });
        const updated = await permissionDao.updateById(perm._id, { name: "Add Product" });
        expect(updated.name).toBe("Add Product");
    });

    it("should delete permission by id", async () => {
        const perm = await permissionDao.create({
            name: "Create Product",
            code: "PRODUCT_CREATE",
            module: "inventory"
        });
        await permissionDao.deleteById(perm._id);
        const found = await permissionDao.findById(perm._id);
        expect(found).toBeNull();
    });
});
