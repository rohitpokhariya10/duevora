import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import FinancialYearDao from "../financialYear.dao.js";
import OrganizationDao from "../organization.dao.js";

const financialYearDao = new FinancialYearDao();
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

describe("FinancialYear DAO Tests", () => {
    let org;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
    });

    it("should create a financial year successfully", async () => {
        const fyData = {
            organizationId: org._id,
            name: "FY 2026-27",
            startDate: new Date("2026-04-01"),
            endDate: new Date("2027-03-31")
        };
        const fy = await financialYearDao.create(fyData);
        expect(fy).toBeDefined();
        expect(fy.name).toBe("FY 2026-27");
        expect(fy.isClosed).toBe(false);
    });

    it("should fail to create financial year without dates", async () => {
        await expect(financialYearDao.create({
            organizationId: org._id,
            name: "FY 2026-27"
        })).rejects.toThrow();
    });

    it("should find financial year by id", async () => {
        const fy = await financialYearDao.create({
            organizationId: org._id,
            name: "FY 2026-27",
            startDate: new Date("2026-04-01"),
            endDate: new Date("2027-03-31")
        });

        const found = await financialYearDao.findById(fy._id);
        expect(found).toBeDefined();
        expect(found.organizationId._id.toString()).toBe(org._id.toString());
    });

    it("should update financial year closed status", async () => {
        const fy = await financialYearDao.create({
            organizationId: org._id,
            name: "FY 2026-27",
            startDate: new Date("2026-04-01"),
            endDate: new Date("2027-03-31")
        });

        const updated = await financialYearDao.updateById(fy._id, { isClosed: true });
        expect(updated.isClosed).toBe(true);
    });

    it("should delete financial year by id", async () => {
        const fy = await financialYearDao.create({
            organizationId: org._id,
            name: "FY 2026-27",
            startDate: new Date("2026-04-01"),
            endDate: new Date("2027-03-31")
        });

        await financialYearDao.deleteById(fy._id);
        const found = await financialYearDao.findById(fy._id);
        expect(found).toBeNull();
    });
});
