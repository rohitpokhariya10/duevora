import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import UnitDao from "../unit.dao.js";
import OrganizationDao from "../organization.dao.js";

const unitDao = new UnitDao();
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

describe("Unit DAO Tests", () => {
    let org;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
    });

    it("should create a unit successfully", async () => {
        const unitData = {
            organizationId: org._id,
            name: "Kilogram",
            code: "KG"
        };
        const unit = await unitDao.create(unitData);
        expect(unit).toBeDefined();
        expect(unit.name).toBe("Kilogram");
        expect(unit.code).toBe("KG");
    });

    it("should fail to create duplicate unit code in same organization", async () => {
        const unit1 = {
            organizationId: org._id,
            name: "Kilogram",
            code: "KG"
        };
        const unit2 = {
            organizationId: org._id,
            name: "Kilo",
            code: "KG"
        };

        await unitDao.create(unit1);
        await expect(unitDao.create(unit2)).rejects.toThrow();
    });

    it("should allow same unit code in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });

        const unit1 = {
            organizationId: org._id,
            name: "Kilogram",
            code: "KG"
        };
        const unit2 = {
            organizationId: org2._id,
            name: "Kilogram",
            code: "KG"
        };

        const u1 = await unitDao.create(unit1);
        const u2 = await unitDao.create(unit2);
        expect(u1).toBeDefined();
        expect(u2).toBeDefined();
    });

    it("should find unit by id", async () => {
        const unit = await unitDao.create({
            organizationId: org._id,
            name: "Kilogram",
            code: "KG"
        });

        const found = await unitDao.findById(unit._id);
        expect(found).toBeDefined();
        expect(found.organizationId._id.toString()).toBe(org._id.toString());
    });

    it("should update unit details", async () => {
        const unit = await unitDao.create({
            organizationId: org._id,
            name: "Kilogram",
            code: "KG"
        });

        const updated = await unitDao.updateById(unit._id, { name: "Kilos" });
        expect(updated.name).toBe("Kilos");
    });

    it("should delete unit by id", async () => {
        const unit = await unitDao.create({
            organizationId: org._id,
            name: "Kilogram",
            code: "KG"
        });

        await unitDao.deleteById(unit._id);
        const found = await unitDao.findById(unit._id);
        expect(found).toBeNull();
    });
});
