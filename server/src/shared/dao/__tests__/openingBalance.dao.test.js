import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import OpeningBalanceDao from "../openingBalance.dao.js";
import FinancialYearDao from "../financialYear.dao.js";
import AccountDao from "../account.dao.js";
import OrganizationDao from "../organization.dao.js";

const openingBalanceDao = new OpeningBalanceDao();
const financialYearDao = new FinancialYearDao();
const accountDao = new AccountDao();
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

describe("OpeningBalance DAO Tests", () => {
    let org, account, fy;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        account = await accountDao.create({ organizationId: org._id, name: "Cash", code: "1000", type: "asset" });
        fy = await financialYearDao.create({
            organizationId: org._id,
            name: "FY 2026-27",
            startDate: new Date("2026-04-01"),
            endDate: new Date("2027-03-31")
        });
    });

    it("should create an opening balance successfully", async () => {
        const ob = await openingBalanceDao.create({
            organizationId: org._id,
            financialYearId: fy._id,
            accountId: account._id,
            debit: 1000,
            credit: 0
        });
        expect(ob).toBeDefined();
        expect(ob.financialYearId.toString()).toBe(fy._id.toString());
        expect(ob.accountId.toString()).toBe(account._id.toString());
        expect(ob.debit).toBe(1000);
        expect(ob.credit).toBe(0);
    });

    it("should fail to create duplicate opening balance for same account and financial year", async () => {
        await openingBalanceDao.create({
            organizationId: org._id,
            financialYearId: fy._id,
            accountId: account._id,
            debit: 1000
        });

        await expect(openingBalanceDao.create({
            organizationId: org._id,
            financialYearId: fy._id,
            accountId: account._id,
            credit: 1000
        })).rejects.toThrow();
    });

    it("should find and populate opening balance details", async () => {
        const ob = await openingBalanceDao.create({
            organizationId: org._id,
            financialYearId: fy._id,
            accountId: account._id,
            debit: 1000
        });

        const found = await openingBalanceDao.findById(ob._id);
        expect(found).toBeDefined();
        expect(found.accountId.name).toBe("Cash");
        expect(found.financialYearId.name).toBe("FY 2026-27");
    });

    it("should update opening balance values", async () => {
        const ob = await openingBalanceDao.create({
            organizationId: org._id,
            financialYearId: fy._id,
            accountId: account._id,
            debit: 1000
        });

        const updated = await openingBalanceDao.updateById(ob._id, { debit: 0, credit: 500 });
        expect(updated.debit).toBe(0);
        expect(updated.credit).toBe(500);
    });

    it("should delete opening balance by id", async () => {
        const ob = await openingBalanceDao.create({
            organizationId: org._id,
            financialYearId: fy._id,
            accountId: account._id,
            debit: 1000
        });

        await openingBalanceDao.deleteById(ob._id);
        const found = await openingBalanceDao.findById(ob._id);
        expect(found).toBeNull();
    });
});
