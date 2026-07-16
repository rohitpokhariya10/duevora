import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import StockTransferDao from "../stockTransfer.dao.js";
import ProductDao from "../product.dao.js";
import WarehouseDao from "../warehouse.dao.js";
import OrganizationDao from "../organization.dao.js";

const stockTransferDao = new StockTransferDao();
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

describe("StockTransfer DAO Tests", () => {
    let org, product, warehouseA, warehouseB;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        product = await productDao.create({ organizationId: org._id, name: "Widget A", sku: "WDG-A" });
        warehouseA = await warehouseDao.create({ organizationId: org._id, name: "Central", code: "CWH" });
        warehouseB = await warehouseDao.create({ organizationId: org._id, name: "Secondary", code: "SWH" });
    });

    it("should create stock transfer successfully", async () => {
        const transfer = await stockTransferDao.create({
            organizationId: org._id,
            fromWarehouseId: warehouseA._id,
            toWarehouseId: warehouseB._id,
            productId: product._id,
            quantity: 10
        });
        expect(transfer).toBeDefined();
        expect(transfer.fromWarehouseId.toString()).toBe(warehouseA._id.toString());
        expect(transfer.toWarehouseId.toString()).toBe(warehouseB._id.toString());
        expect(transfer.quantity).toBe(10);
        expect(transfer.status).toBe("pending");
    });

    it("should fail to create transfer with negative quantity", async () => {
        await expect(stockTransferDao.create({
            organizationId: org._id,
            fromWarehouseId: warehouseA._id,
            toWarehouseId: warehouseB._id,
            productId: product._id,
            quantity: -5
        })).rejects.toThrow();
    });

    it("should find and populate stock transfer", async () => {
        const transfer = await stockTransferDao.create({
            organizationId: org._id,
            fromWarehouseId: warehouseA._id,
            toWarehouseId: warehouseB._id,
            productId: product._id,
            quantity: 10
        });

        const found = await stockTransferDao.findById(transfer._id);
        expect(found).toBeDefined();
        expect(found.productId.name).toBe("Widget A");
        expect(found.fromWarehouseId.name).toBe("Central");
        expect(found.toWarehouseId.name).toBe("Secondary");
    });

    it("should update stock transfer status", async () => {
        const transfer = await stockTransferDao.create({
            organizationId: org._id,
            fromWarehouseId: warehouseA._id,
            toWarehouseId: warehouseB._id,
            productId: product._id,
            quantity: 10
        });

        const updated = await stockTransferDao.updateById(transfer._id, { status: "completed" });
        expect(updated.status).toBe("completed");
    });

    it("should delete stock transfer", async () => {
        const transfer = await stockTransferDao.create({
            organizationId: org._id,
            fromWarehouseId: warehouseA._id,
            toWarehouseId: warehouseB._id,
            productId: product._id,
            quantity: 10
        });

        await stockTransferDao.deleteById(transfer._id);
        const found = await stockTransferDao.findById(transfer._id);
        expect(found).toBeNull();
    });
});
