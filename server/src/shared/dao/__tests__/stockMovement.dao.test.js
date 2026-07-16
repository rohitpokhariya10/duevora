import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import StockMovementDao from "../stockMovement.dao.js";
import ProductDao from "../product.dao.js";
import WarehouseDao from "../warehouse.dao.js";
import OrganizationDao from "../organization.dao.js";

const stockMovementDao = new StockMovementDao();
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

describe("StockMovement DAO Tests", () => {
    let org, product, warehouse;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        product = await productDao.create({ organizationId: org._id, name: "Widget A", sku: "WDG-A" });
        warehouse = await warehouseDao.create({ organizationId: org._id, name: "Central", code: "CWH" });
    });

    it("should create stock movement successfully", async () => {
        const movement = await stockMovementDao.create({
            organizationId: org._id,
            productId: product._id,
            warehouseId: warehouse._id,
            quantity: 50,
            type: "in",
            referenceType: "Purchase",
            referenceId: product._id // Dummy ObjectId
        });
        expect(movement).toBeDefined();
        expect(movement.productId.toString()).toBe(product._id.toString());
        expect(movement.quantity).toBe(50);
        expect(movement.type).toBe("in");
    });

    it("should fail to create stock movement without type", async () => {
        await expect(stockMovementDao.create({
            organizationId: org._id,
            productId: product._id,
            warehouseId: warehouse._id,
            quantity: 50
        })).rejects.toThrow();
    });

    it("should find and populate stock movement", async () => {
        const movement = await stockMovementDao.create({
            organizationId: org._id,
            productId: product._id,
            warehouseId: warehouse._id,
            quantity: 50,
            type: "in"
        });

        const found = await stockMovementDao.findById(movement._id);
        expect(found).toBeDefined();
        expect(found.productId.name).toBe("Widget A");
        expect(found.warehouseId.name).toBe("Central");
    });

    it("should update stock movement quantity", async () => {
        const movement = await stockMovementDao.create({
            organizationId: org._id,
            productId: product._id,
            warehouseId: warehouse._id,
            quantity: 50,
            type: "in"
        });

        const updated = await stockMovementDao.updateById(movement._id, { quantity: 100 });
        expect(updated.quantity).toBe(100);
    });

    it("should delete stock movement", async () => {
        const movement = await stockMovementDao.create({
            organizationId: org._id,
            productId: product._id,
            warehouseId: warehouse._id,
            quantity: 50,
            type: "in"
        });

        await stockMovementDao.deleteById(movement._id);
        const found = await stockMovementDao.findById(movement._id);
        expect(found).toBeNull();
    });
});
