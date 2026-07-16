import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import BankTransactionDao from "../bankTransaction.dao.js";
import BankAccountDao from "../bankAccount.dao.js";
import AccountDao from "../account.dao.js";
import OrganizationDao from "../organization.dao.js";

const bankTransactionDao = new BankTransactionDao();
const bankAccountDao = new BankAccountDao();
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

describe("BankTransaction DAO Tests", () => {
    let org, account, bankAccount;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        account = await accountDao.create({ organizationId: org._id, name: "Chase Checking", code: "1000", type: "asset" });
        bankAccount = await bankAccountDao.create({
            organizationId: org._id,
            bankName: "JPMorgan Chase",
            accountNumber: "1234567890",
            accountId: account._id
        });
    });

    it("should create a bank transaction successfully", async () => {
        const transactionData = {
            organizationId: org._id,
            bankAccountId: bankAccount._id,
            transactionDate: new Date(),
            amount: 250.00,
            type: "deposit",
            reference: "DEP-001"
        };
        const transaction = await bankTransactionDao.create(transactionData);
        expect(transaction).toBeDefined();
        expect(transaction.amount).toBe(250.00);
        expect(transaction.type).toBe("deposit");
        expect(transaction.reference).toBe("DEP-001");
    });

    it("should fail to create transaction without type", async () => {
        await expect(bankTransactionDao.create({
            organizationId: org._id,
            bankAccountId: bankAccount._id,
            transactionDate: new Date(),
            amount: 250.00
        })).rejects.toThrow();
    });

    it("should find bank transaction by id and populate relationships", async () => {
        const transaction = await bankTransactionDao.create({
            organizationId: org._id,
            bankAccountId: bankAccount._id,
            transactionDate: new Date(),
            amount: 250.00,
            type: "withdrawal"
        });

        const found = await bankTransactionDao.findById(transaction._id);
        expect(found).toBeDefined();
        expect(found.bankAccountId.accountNumber).toBe("1234567890");
    });

    it("should update bank transaction details", async () => {
        const transaction = await bankTransactionDao.create({
            organizationId: org._id,
            bankAccountId: bankAccount._id,
            transactionDate: new Date(),
            amount: 250.00,
            type: "deposit"
        });

        const updated = await bankTransactionDao.updateById(transaction._id, { reference: "Updated Ref" });
        expect(updated.reference).toBe("Updated Ref");
    });

    it("should delete bank transaction by id", async () => {
        const transaction = await bankTransactionDao.create({
            organizationId: org._id,
            bankAccountId: bankAccount._id,
            transactionDate: new Date(),
            amount: 250.00,
            type: "deposit"
        });

        await bankTransactionDao.deleteById(transaction._id);
        const found = await bankTransactionDao.findById(transaction._id);
        expect(found).toBeNull();
    });
});
