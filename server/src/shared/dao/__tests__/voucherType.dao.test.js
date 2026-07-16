import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import VoucherTypeDao from "../voucherType.dao.js";
import OrganizationDao from "../organization.dao.js";

const voucherTypeDao = new VoucherTypeDao();
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

describe("VoucherType DAO Tests", () => {
    let org;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
    });

    it("should create a voucher type successfully", async () => {
        const vtData = {
            organizationId: org._id,
            name: "Sales Voucher",
            code: "SAL"
        };
        const vt = await voucherTypeDao.create(vtData);
        expect(vt).toBeDefined();
        expect(vt.name).toBe("Sales Voucher");
        expect(vt.code).toBe("SAL");
    });

    it("should fail to create duplicate voucher type code in same organization", async () => {
        const vt1 = {
            organizationId: org._id,
            name: "Sales Voucher",
            code: "SAL"
        };
        const vt2 = {
            organizationId: org._id,
            name: "Retail Sales",
            code: "SAL"
        };

        await voucherTypeDao.create(vt1);
        await expect(voucherTypeDao.create(vt2)).rejects.toThrow();
    });

    it("should allow same voucher type code in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });

        const vt1 = {
            organizationId: org._id,
            name: "Sales Voucher",
            code: "SAL"
        };
        const vt2 = {
            organizationId: org2._id,
            name: "Sales Voucher",
            code: "SAL"
        };

        const v1 = await voucherTypeDao.create(vt1);
        const v2 = await voucherTypeDao.create(vt2);
        expect(v1).toBeDefined();
        expect(v2).toBeDefined();
    });

    it("should find voucher type by id", async () => {
        const vt = await voucherTypeDao.create({
            organizationId: org._id,
            name: "Sales Voucher",
            code: "SAL"
        });

        const found = await voucherTypeDao.findById(vt._id);
        expect(found).toBeDefined();
        expect(found.organizationId._id.toString()).toBe(org._id.toString());
    });

    it("should update voucher type details", async () => {
        const vt = await voucherTypeDao.create({
            organizationId: org._id,
            name: "Sales Voucher",
            code: "SAL"
        });

        const updated = await voucherTypeDao.updateById(vt._id, { name: "Sales Invoice" });
        expect(updated.name).toBe("Sales Invoice");
    });

    it("should delete voucher type by id", async () => {
        const vt = await voucherTypeDao.create({
            organizationId: org._id,
            name: "Sales Voucher",
            code: "SAL"
        });

        await voucherTypeDao.deleteById(vt._id);
        const found = await voucherTypeDao.findById(vt._id);
        expect(found).toBeNull();
    });
});
