import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import InvoiceItemDao from "../invoiceItem.dao.js";
import InvoiceDao from "../invoice.dao.js";
import ProductDao from "../product.dao.js";
import CustomerDao from "../customer.dao.js";
import OrganizationDao from "../organization.dao.js";

const invoiceItemDao = new InvoiceItemDao();
const invoiceDao = new InvoiceDao();
const productDao = new ProductDao();
const customerDao = new CustomerDao();
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

describe("InvoiceItem DAO Tests", () => {
    let org, customer, product, invoice;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        customer = await customerDao.create({ organizationId: org._id, name: "John Doe" });
        product = await productDao.create({ organizationId: org._id, name: "Widget A", sku: "WDG-A" });
        invoice = await invoiceDao.create({
            organizationId: org._id,
            customerId: customer._id,
            invoiceNumber: "INV-2026-001",
            invoiceDate: new Date(),
            subTotal: 100,
            taxTotal: 18,
            grandTotal: 118
        });
    });

    it("should create invoice item successfully", async () => {
        const item = await invoiceItemDao.create({
            invoiceId: invoice._id,
            productId: product._id,
            quantity: 2,
            unitPrice: 50.00,
            taxAmount: 9.00,
            total: 109.00
        });
        expect(item).toBeDefined();
        expect(item.invoiceId.toString()).toBe(invoice._id.toString());
        expect(item.productId.toString()).toBe(product._id.toString());
        expect(item.quantity).toBe(2);
        expect(item.unitPrice).toBe(50.00);
        expect(item.total).toBe(109.00);
    });

    it("should fail to create invoice item with quantity < 1", async () => {
        await expect(invoiceItemDao.create({
            invoiceId: invoice._id,
            productId: product._id,
            quantity: 0,
            unitPrice: 50.00,
            total: 0
        })).rejects.toThrow();
    });

    it("should find and populate invoice item details", async () => {
        const item = await invoiceItemDao.create({
            invoiceId: invoice._id,
            productId: product._id,
            quantity: 2,
            unitPrice: 50.00,
            total: 100
        });

        const found = await invoiceItemDao.findById(item._id);
        expect(found).toBeDefined();
        expect(found.productId.name).toBe("Widget A");
        expect(found.invoiceId.invoiceNumber).toBe("INV-2026-001");
    });

    it("should update invoice item quantity", async () => {
        const item = await invoiceItemDao.create({
            invoiceId: invoice._id,
            productId: product._id,
            quantity: 2,
            unitPrice: 50.00,
            total: 100
        });

        const updated = await invoiceItemDao.updateById(item._id, { quantity: 3, total: 150 });
        expect(updated.quantity).toBe(3);
        expect(updated.total).toBe(150);
    });

    it("should delete invoice item by id", async () => {
        const item = await invoiceItemDao.create({
            invoiceId: invoice._id,
            productId: product._id,
            quantity: 2,
            unitPrice: 50.00,
            total: 100
        });

        await invoiceItemDao.deleteById(item._id);
        const found = await invoiceItemDao.findById(item._id);
        expect(found).toBeNull();
    });
});
