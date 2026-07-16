import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import InventoryDao from "../inventory.dao.js";
import ProductDao from "../product.dao.js";
import WarehouseDao from "../warehouse.dao.js";
import OrganizationDao from "../organization.dao.js";

const inventoryDao = new InventoryDao();
const productDao = new ProductDao();
const warehouseDao = new WarehouseDao();
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

describe("Inventory DAO Tests", () => {
    let org, product, warehouse;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        product = await productDao.create({ organizationId: org._id, name: "Widget A", sku: "WDG-A" });
        warehouse = await warehouseDao.create({ organizationId: org._id, name: "Central", code: "CWH" });
    });

    it("should create inventory record successfully", async () => {
        const inv = await inventoryDao.create({
            organizationId: org._id,
            productId: product._id,
            warehouseId: warehouse._id,
            quantity: 100
        });
        expect(inv).toBeDefined();
        expect(inv.productId.toString()).toBe(product._id.toString());
        expect(inv.warehouseId.toString()).toBe(warehouse._id.toString());
        expect(inv.quantity).toBe(100);
    });

    it("should fail to create duplicate inventory record for same product and warehouse", async () => {
        await inventoryDao.create({
            organizationId: org._id,
            productId: product._id,
            warehouseId: warehouse._id,
            quantity: 100
        });

        await expect(inventoryDao.create({
            organizationId: org._id,
            productId: product._id,
            warehouseId: warehouse._id,
            quantity: 50
        })).rejects.toThrow();
    });

    it("should find and populate inventory record", async () => {
        const inv = await inventoryDao.create({
            organizationId: org._id,
            productId: product._id,
            warehouseId: warehouse._id,
            quantity: 100
        });

        const found = await inventoryDao.findById(inv._id);
        expect(found).toBeDefined();
        expect(found.productId.name).toBe("Widget A");
        expect(found.warehouseId.name).toBe("Central");
    });

    it("should update quantity in inventory", async () => {
        const inv = await inventoryDao.create({
            organizationId: org._id,
            productId: product._id,
            warehouseId: warehouse._id,
            quantity: 100
        });

        const updated = await inventoryDao.updateById(inv._id, { quantity: 150 });
        expect(updated.quantity).toBe(150);
    });

    it("should delete inventory record", async () => {
        const inv = await inventoryDao.create({
            organizationId: org._id,
            productId: product._id,
            warehouseId: warehouse._id,
            quantity: 100
        });

        await inventoryDao.deleteById(inv._id);
        const found = await inventoryDao.findById(inv._id);
        expect(found).toBeNull();
    });
});
