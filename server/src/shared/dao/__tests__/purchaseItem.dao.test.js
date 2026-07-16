import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import PurchaseItemDao from "../purchaseItem.dao.js";
import PurchaseDao from "../purchase.dao.js";
import ProductDao from "../product.dao.js";
import VendorDao from "../vendor.dao.js";
import OrganizationDao from "../organization.dao.js";

const purchaseItemDao = new PurchaseItemDao();
const purchaseDao = new PurchaseDao();
const productDao = new ProductDao();
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

describe("PurchaseItem DAO Tests", () => {
    let org, vendor, product, purchase;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        vendor = await vendorDao.create({ organizationId: org._id, name: "Supplier Inc" });
        product = await productDao.create({ organizationId: org._id, name: "Widget A", sku: "WDG-A" });
        purchase = await purchaseDao.create({
            organizationId: org._id,
            vendorId: vendor._id,
            purchaseNumber: "BILL-2026-001",
            purchaseDate: new Date(),
            subTotal: 100,
            taxTotal: 18,
            grandTotal: 118
        });
    });

    it("should create purchase item successfully", async () => {
        const item = await purchaseItemDao.create({
            purchaseId: purchase._id,
            productId: product._id,
            quantity: 2,
            unitPrice: 50.00,
            taxAmount: 9.00,
            total: 109.00
        });
        expect(item).toBeDefined();
        expect(item.purchaseId.toString()).toBe(purchase._id.toString());
        expect(item.productId.toString()).toBe(product._id.toString());
        expect(item.quantity).toBe(2);
        expect(item.unitPrice).toBe(50.00);
        expect(item.total).toBe(109.00);
    });

    it("should fail to create purchase item with quantity < 1", async () => {
        await expect(purchaseItemDao.create({
            purchaseId: purchase._id,
            productId: product._id,
            quantity: 0,
            unitPrice: 50.00,
            total: 0
        })).rejects.toThrow();
    });

    it("should find and populate purchase item details", async () => {
        const item = await purchaseItemDao.create({
            purchaseId: purchase._id,
            productId: product._id,
            quantity: 2,
            unitPrice: 50.00,
            total: 100
        });

        const found = await purchaseItemDao.findById(item._id);
        expect(found).toBeDefined();
        expect(found.productId.name).toBe("Widget A");
        expect(found.purchaseId.purchaseNumber).toBe("BILL-2026-001");
    });

    it("should update purchase item quantity", async () => {
        const item = await purchaseItemDao.create({
            purchaseId: purchase._id,
            productId: product._id,
            quantity: 2,
            unitPrice: 50.00,
            total: 100
        });

        const updated = await purchaseItemDao.updateById(item._id, { quantity: 3, total: 150 });
        expect(updated.quantity).toBe(3);
        expect(updated.total).toBe(150);
    });

    it("should delete purchase item by id", async () => {
        const item = await purchaseItemDao.create({
            purchaseId: purchase._id,
            productId: product._id,
            quantity: 2,
            unitPrice: 50.00,
            total: 100
        });

        await purchaseItemDao.deleteById(item._id);
        const found = await purchaseItemDao.findById(item._id);
        expect(found).toBeNull();
    });
});
