import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import BudgetDao from "../budget.dao.js";
import FinancialYearDao from "../financialYear.dao.js";
import AccountDao from "../account.dao.js";
import OrganizationDao from "../organization.dao.js";

const budgetDao = new BudgetDao();
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

describe("Budget DAO Tests", () => {
    let org, account, fy;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        account = await accountDao.create({ organizationId: org._id, name: "Marketing Expense", code: "5000", type: "expense" });
        fy = await financialYearDao.create({
            organizationId: org._id,
            name: "FY 2026-27",
            startDate: new Date("2026-04-01"),
            endDate: new Date("2027-03-31")
        });
    });

    it("should create a budget successfully", async () => {
        const budget = await budgetDao.create({
            organizationId: org._id,
            financialYearId: fy._id,
            accountId: account._id,
            amount: 50000
        });
        expect(budget).toBeDefined();
        expect(budget.amount).toBe(50000);
    });

    it("should fail to create duplicate budget for same account and financial year", async () => {
        await budgetDao.create({
            organizationId: org._id,
            financialYearId: fy._id,
            accountId: account._id,
            amount: 50000
        });

        await expect(budgetDao.create({
            organizationId: org._id,
            financialYearId: fy._id,
            accountId: account._id,
            amount: 75000
        })).rejects.toThrow();
    });

    it("should find and populate budget details", async () => {
        const budget = await budgetDao.create({
            organizationId: org._id,
            financialYearId: fy._id,
            accountId: account._id,
            amount: 50000
        });

        const found = await budgetDao.findById(budget._id);
        expect(found).toBeDefined();
        expect(found.accountId.name).toBe("Marketing Expense");
        expect(found.financialYearId.name).toBe("FY 2026-27");
    });

    it("should update budget amount", async () => {
        const budget = await budgetDao.create({
            organizationId: org._id,
            financialYearId: fy._id,
            accountId: account._id,
            amount: 50000
        });

        const updated = await budgetDao.updateById(budget._id, { amount: 60000 });
        expect(updated.amount).toBe(60000);
    });

    it("should delete budget by id", async () => {
        const budget = await budgetDao.create({
            organizationId: org._id,
            financialYearId: fy._id,
            accountId: account._id,
            amount: 50000
        });

        await budgetDao.deleteById(budget._id);
        const found = await budgetDao.findById(budget._id);
        expect(found).toBeNull();
    });
});
