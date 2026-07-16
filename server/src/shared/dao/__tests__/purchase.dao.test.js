import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import PurchaseDao from "../purchase.dao.js";
import VendorDao from "../vendor.dao.js";
import OrganizationDao from "../organization.dao.js";

const purchaseDao = new PurchaseDao();
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

describe("Purchase DAO Tests", () => {
    let org, vendor;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        vendor = await vendorDao.create({ organizationId: org._id, name: "Supplier Inc" });
    });

    it("should create a purchase bill successfully", async () => {
        const purchaseData = {
            organizationId: org._id,
            vendorId: vendor._id,
            purchaseNumber: "BILL-2026-001",
            purchaseDate: new Date(),
            subTotal: 1000.00,
            taxTotal: 180.00,
            grandTotal: 1180.00,
            status: "billed"
        };
        const purchase = await purchaseDao.create(purchaseData);
        expect(purchase).toBeDefined();
        expect(purchase.purchaseNumber).toBe("BILL-2026-001");
        expect(purchase.grandTotal).toBe(1180.00);
        expect(purchase.status).toBe("billed");
    });

    it("should fail to create duplicate purchase number in same organization", async () => {
        const p1 = {
            organizationId: org._id,
            vendorId: vendor._id,
            purchaseNumber: "BILL-2026-001",
            purchaseDate: new Date(),
            subTotal: 100,
            taxTotal: 18,
            grandTotal: 118
        };
        const p2 = {
            organizationId: org._id,
            vendorId: vendor._id,
            purchaseNumber: "BILL-2026-001",
            purchaseDate: new Date(),
            subTotal: 200,
            taxTotal: 36,
            grandTotal: 236
        };

        await purchaseDao.create(p1);
        await expect(purchaseDao.create(p2)).rejects.toThrow();
    });

    it("should allow same purchase number in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });
        const vendor2 = await vendorDao.create({ organizationId: org2._id, name: "Supplier Inc 2" });

        const p1 = {
            organizationId: org._id,
            vendorId: vendor._id,
            purchaseNumber: "BILL-2026-001",
            purchaseDate: new Date(),
            subTotal: 100,
            taxTotal: 18,
            grandTotal: 118
        };
        const p2 = {
            organizationId: org2._id,
            vendorId: vendor2._id,
            purchaseNumber: "BILL-2026-001",
            purchaseDate: new Date(),
            subTotal: 100,
            taxTotal: 18,
            grandTotal: 118
        };

        const bill1 = await purchaseDao.create(p1);
        const bill2 = await purchaseDao.create(p2);
        expect(bill1).toBeDefined();
        expect(bill2).toBeDefined();
    });

    it("should find purchase bill by id and populate relationship", async () => {
        const purchase = await purchaseDao.create({
            organizationId: org._id,
            vendorId: vendor._id,
            purchaseNumber: "BILL-2026-001",
            purchaseDate: new Date(),
            subTotal: 100,
            taxTotal: 18,
            grandTotal: 118
        });

        const found = await purchaseDao.findById(purchase._id);
        expect(found).toBeDefined();
        expect(found.vendorId.name).toBe("Supplier Inc");
    });

    it("should update purchase bill details", async () => {
        const purchase = await purchaseDao.create({
            organizationId: org._id,
            vendorId: vendor._id,
            purchaseNumber: "BILL-2026-001",
            purchaseDate: new Date(),
            subTotal: 100,
            taxTotal: 18,
            grandTotal: 118
        });

        const updated = await purchaseDao.updateById(purchase._id, { status: "paid" });
        expect(updated.status).toBe("paid");
    });

    it("should delete purchase bill by id", async () => {
        const purchase = await purchaseDao.create({
            organizationId: org._id,
            vendorId: vendor._id,
            purchaseNumber: "BILL-2026-001",
            purchaseDate: new Date(),
            subTotal: 100,
            taxTotal: 18,
            grandTotal: 118
        });

        await purchaseDao.deleteById(purchase._id);
        const found = await purchaseDao.findById(purchase._id);
        expect(found).toBeNull();
    });
});
