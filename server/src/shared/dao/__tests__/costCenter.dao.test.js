import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import CostCenterDao from "../costCenter.dao.js";
import OrganizationDao from "../organization.dao.js";

const costCenterDao = new CostCenterDao();
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

describe("CostCenter DAO Tests", () => {
    let org;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
    });

    it("should create a cost center successfully", async () => {
        const ccData = {
            organizationId: org._id,
            name: "Marketing",
            code: "MKT"
        };
        const cc = await costCenterDao.create(ccData);
        expect(cc).toBeDefined();
        expect(cc.name).toBe("Marketing");
        expect(cc.code).toBe("MKT");
        expect(cc.status).toBe("active");
    });

    it("should fail to create duplicate cost center code in same organization", async () => {
        const cc1 = {
            organizationId: org._id,
            name: "Marketing",
            code: "MKT"
        };
        const cc2 = {
            organizationId: org._id,
            name: "Digital Marketing",
            code: "MKT"
        };

        await costCenterDao.create(cc1);
        await expect(costCenterDao.create(cc2)).rejects.toThrow();
    });

    it("should allow same cost center code in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });

        const cc1 = {
            organizationId: org._id,
            name: "Marketing",
            code: "MKT"
        };
        const cc2 = {
            organizationId: org2._id,
            name: "Marketing",
            code: "MKT"
        };

        const c1 = await costCenterDao.create(cc1);
        const c2 = await costCenterDao.create(cc2);
        expect(c1).toBeDefined();
        expect(c2).toBeDefined();
    });

    it("should find cost center by id", async () => {
        const cc = await costCenterDao.create({
            organizationId: org._id,
            name: "Marketing",
            code: "MKT"
        });

        const found = await costCenterDao.findById(cc._id);
        expect(found).toBeDefined();
        expect(found.organizationId._id.toString()).toBe(org._id.toString());
    });

    it("should update cost center details", async () => {
        const cc = await costCenterDao.create({
            organizationId: org._id,
            name: "Marketing",
            code: "MKT"
        });

        const updated = await costCenterDao.updateById(cc._id, { status: "inactive" });
        expect(updated.status).toBe("inactive");
    });

    it("should delete cost center by id", async () => {
        const cc = await costCenterDao.create({
            organizationId: org._id,
            name: "Marketing",
            code: "MKT"
        });

        await costCenterDao.deleteById(cc._id);
        const found = await costCenterDao.findById(cc._id);
        expect(found).toBeNull();
    });
});
