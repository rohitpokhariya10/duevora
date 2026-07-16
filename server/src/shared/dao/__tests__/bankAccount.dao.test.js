import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import BankAccountDao from "../bankAccount.dao.js";
import AccountDao from "../account.dao.js";
import OrganizationDao from "../organization.dao.js";

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

describe("BankAccount DAO Tests", () => {
    let org, account;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        account = await accountDao.create({ organizationId: org._id, name: "Chase Checking", code: "1000", type: "asset" });
    });

    it("should create a bank account successfully", async () => {
        const bankData = {
            organizationId: org._id,
            bankName: "JPMorgan Chase",
            accountNumber: "1234567890",
            ifscCode: "CHAS0001",
            branch: "Midtown",
            accountId: account._id
        };
        const bank = await bankAccountDao.create(bankData);
        expect(bank).toBeDefined();
        expect(bank.bankName).toBe("JPMorgan Chase");
        expect(bank.accountNumber).toBe("1234567890");
    });

    it("should fail to create duplicate account number in same organization", async () => {
        const b1 = {
            organizationId: org._id,
            bankName: "JPMorgan Chase",
            accountNumber: "1234567890",
            accountId: account._id
        };
        const b2 = {
            organizationId: org._id,
            bankName: "Citi Bank",
            accountNumber: "1234567890",
            accountId: account._id
        };

        await bankAccountDao.create(b1);
        await expect(bankAccountDao.create(b2)).rejects.toThrow();
    });

    it("should allow same account number in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });
        const account2 = await accountDao.create({ organizationId: org2._id, name: "Citi Checking", code: "1000", type: "asset" });

        const b1 = {
            organizationId: org._id,
            bankName: "JPMorgan Chase",
            accountNumber: "1234567890",
            accountId: account._id
        };
        const b2 = {
            organizationId: org2._id,
            bankName: "JPMorgan Chase",
            accountNumber: "1234567890",
            accountId: account2._id
        };

        const bank1 = await bankAccountDao.create(b1);
        const bank2 = await bankAccountDao.create(b2);
        expect(bank1).toBeDefined();
        expect(bank2).toBeDefined();
    });

    it("should find bank account by id and populate relationships", async () => {
        const bank = await bankAccountDao.create({
            organizationId: org._id,
            bankName: "JPMorgan Chase",
            accountNumber: "1234567890",
            accountId: account._id
        });

        const found = await bankAccountDao.findById(bank._id);
        expect(found).toBeDefined();
        expect(found.accountId.name).toBe("Chase Checking");
    });

    it("should update bank account details", async () => {
        const bank = await bankAccountDao.create({
            organizationId: org._id,
            bankName: "JPMorgan Chase",
            accountNumber: "1234567890",
            accountId: account._id
        });

        const updated = await bankAccountDao.updateById(bank._id, { branch: "Downtown" });
        expect(updated.branch).toBe("Downtown");
    });

    it("should delete bank account by id", async () => {
        const bank = await bankAccountDao.create({
            organizationId: org._id,
            bankName: "JPMorgan Chase",
            accountNumber: "1234567890",
            accountId: account._id
        });

        await bankAccountDao.deleteById(bank._id);
        const found = await bankAccountDao.findById(bank._id);
        expect(found).toBeNull();
    });
});
