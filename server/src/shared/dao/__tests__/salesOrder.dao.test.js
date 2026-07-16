import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import SalesOrderDao from "../salesOrder.dao.js";
import CustomerDao from "../customer.dao.js";
import OrganizationDao from "../organization.dao.js";

const salesOrderDao = new SalesOrderDao();
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

describe("SalesOrder DAO Tests", () => {
    let org, customer;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        customer = await customerDao.create({ organizationId: org._id, name: "John Doe" });
    });

    it("should create a sales order successfully", async () => {
        const orderData = {
            organizationId: org._id,
            customerId: customer._id,
            orderNumber: "SO-2026-001",
            orderDate: new Date(),
            grandTotal: 500.00,
            status: "draft"
        };
        const order = await salesOrderDao.create(orderData);
        expect(order).toBeDefined();
        expect(order.orderNumber).toBe("SO-2026-001");
        expect(order.grandTotal).toBe(500.00);
        expect(order.status).toBe("draft");
    });

    it("should fail to create duplicate order number in same organization", async () => {
        const o1 = {
            organizationId: org._id,
            customerId: customer._id,
            orderNumber: "SO-2026-001",
            orderDate: new Date(),
            grandTotal: 100
        };
        const o2 = {
            organizationId: org._id,
            customerId: customer._id,
            orderNumber: "SO-2026-001",
            orderDate: new Date(),
            grandTotal: 200
        };

        await salesOrderDao.create(o1);
        await expect(salesOrderDao.create(o2)).rejects.toThrow();
    });

    it("should allow same order number in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });
        const customer2 = await customerDao.create({ organizationId: org2._id, name: "Jane Smith" });

        const o1 = {
            organizationId: org._id,
            customerId: customer._id,
            orderNumber: "SO-2026-001",
            orderDate: new Date(),
            grandTotal: 100
        };
        const o2 = {
            organizationId: org2._id,
            customerId: customer2._id,
            orderNumber: "SO-2026-001",
            orderDate: new Date(),
            grandTotal: 100
        };

        const order1 = await salesOrderDao.create(o1);
        const order2 = await salesOrderDao.create(o2);
        expect(order1).toBeDefined();
        expect(order2).toBeDefined();
    });

    it("should find sales order by id and populate relationship", async () => {
        const order = await salesOrderDao.create({
            organizationId: org._id,
            customerId: customer._id,
            orderNumber: "SO-2026-001",
            orderDate: new Date(),
            grandTotal: 100
        });

        const found = await salesOrderDao.findById(order._id);
        expect(found).toBeDefined();
        expect(found.customerId.name).toBe("John Doe");
    });

    it("should update sales order status", async () => {
        const order = await salesOrderDao.create({
            organizationId: org._id,
            customerId: customer._id,
            orderNumber: "SO-2026-001",
            orderDate: new Date(),
            grandTotal: 100
        });

        const updated = await salesOrderDao.updateById(order._id, { status: "pending" });
        expect(updated.status).toBe("pending");
    });

    it("should delete sales order by id", async () => {
        const order = await salesOrderDao.create({
            organizationId: org._id,
            customerId: customer._id,
            orderNumber: "SO-2026-001",
            orderDate: new Date(),
            grandTotal: 100
        });

        await salesOrderDao.deleteById(order._id);
        const found = await salesOrderDao.findById(order._id);
        expect(found).toBeNull();
    });
});
