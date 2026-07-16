import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import mongoose from "mongoose";
import ExpenseDao from "../expense.dao.js";
import CategoryDao from "../category.dao.js";
import OrganizationDao from "../organization.dao.js";

const expenseDao = new ExpenseDao();
const categoryDao = new CategoryDao();
const organizationDao = new OrganizationDao();

beforeAll(async () => {
    await connectTestDB();
    // Dynamically register dummy Account schema so populate works in isolation
    if (!mongoose.models.Account) {
        mongoose.model("Account", new mongoose.Schema({ name: String }));
    }
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearTestDB();
});

describe("Expense DAO Tests", () => {
    let org, category, mockAccountId;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        category = await categoryDao.create({ organizationId: org._id, name: "Office Supplies", code: "SUPP" });
        const AccountModel = mongoose.model("Account");
        const account = await new AccountModel({ name: "Bank Account" }).save();
        mockAccountId = account._id;
    });

    it("should create an expense successfully", async () => {
        const expenseData = {
            organizationId: org._id,
            expenseNumber: "EXP-2026-001",
            date: new Date(),
            amount: 150.00,
            categoryId: category._id,
            accountId: mockAccountId,
            description: "Printer paper and pens"
        };
        const expense = await expenseDao.create(expenseData);
        expect(expense).toBeDefined();
        expect(expense.expenseNumber).toBe("EXP-2026-001");
        expect(expense.amount).toBe(150.00);
        expect(expense.description).toBe("Printer paper and pens");
    });

    it("should fail to create duplicate expense number in same organization", async () => {
        const e1 = {
            organizationId: org._id,
            expenseNumber: "EXP-2026-001",
            date: new Date(),
            amount: 100,
            accountId: mockAccountId
        };
        const e2 = {
            organizationId: org._id,
            expenseNumber: "EXP-2026-001",
            date: new Date(),
            amount: 200,
            accountId: mockAccountId
        };

        await expenseDao.create(e1);
        await expect(expenseDao.create(e2)).rejects.toThrow();
    });

    it("should allow same expense number in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });

        const e1 = {
            organizationId: org._id,
            expenseNumber: "EXP-2026-001",
            date: new Date(),
            amount: 100,
            accountId: mockAccountId
        };
        const e2 = {
            organizationId: org2._id,
            expenseNumber: "EXP-2026-001",
            date: new Date(),
            amount: 100,
            accountId: mockAccountId
        };

        const exp1 = await expenseDao.create(e1);
        const exp2 = await expenseDao.create(e2);
        expect(exp1).toBeDefined();
        expect(exp2).toBeDefined();
    });

    it("should find expense by id and populate relationships", async () => {
        const expense = await expenseDao.create({
            organizationId: org._id,
            expenseNumber: "EXP-2026-001",
            date: new Date(),
            amount: 100,
            categoryId: category._id,
            accountId: mockAccountId
        });

        const found = await expenseDao.findById(expense._id);
        expect(found).toBeDefined();
        expect(found.categoryId.name).toBe("Office Supplies");
        expect(found.accountId.name).toBe("Bank Account");
    });

    it("should update expense details", async () => {
        const expense = await expenseDao.create({
            organizationId: org._id,
            expenseNumber: "EXP-2026-001",
            date: new Date(),
            amount: 100,
            accountId: mockAccountId
        });

        const updated = await expenseDao.updateById(expense._id, { amount: 120 });
        expect(updated.amount).toBe(120);
    });

    it("should delete expense by id", async () => {
        const expense = await expenseDao.create({
            organizationId: org._id,
            expenseNumber: "EXP-2026-001",
            date: new Date(),
            amount: 100,
            accountId: mockAccountId
        });

        await expenseDao.deleteById(expense._id);
        const found = await expenseDao.findById(expense._id);
        expect(found).toBeNull();
    });
});
