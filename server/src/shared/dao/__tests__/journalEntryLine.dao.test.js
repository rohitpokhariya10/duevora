import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import JournalEntryLineDao from "../journalEntryLine.dao.js";
import JournalEntryDao from "../journalEntry.dao.js";
import AccountDao from "../account.dao.js";
import OrganizationDao from "../organization.dao.js";

const journalEntryLineDao = new JournalEntryLineDao();
const journalEntryDao = new JournalEntryDao();
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

describe("JournalEntryLine DAO Tests", () => {
    let org, account, entry;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        account = await accountDao.create({ organizationId: org._id, name: "Cash", code: "1000", type: "asset" });
        entry = await journalEntryDao.create({
            organizationId: org._id,
            entryNumber: "JV-2026-001",
            date: new Date()
        });
    });

    it("should create a journal entry line successfully", async () => {
        const line = await journalEntryLineDao.create({
            journalEntryId: entry._id,
            accountId: account._id,
            debit: 100,
            credit: 0
        });
        expect(line).toBeDefined();
        expect(line.journalEntryId.toString()).toBe(entry._id.toString());
        expect(line.accountId.toString()).toBe(account._id.toString());
        expect(line.debit).toBe(100);
        expect(line.credit).toBe(0);
    });

    it("should fail to create line without required references", async () => {
        await expect(journalEntryLineDao.create({
            accountId: account._id,
            debit: 100
        })).rejects.toThrow();

        await expect(journalEntryLineDao.create({
            journalEntryId: entry._id,
            debit: 100
        })).rejects.toThrow();
    });

    it("should find and populate journal entry line details", async () => {
        const line = await journalEntryLineDao.create({
            journalEntryId: entry._id,
            accountId: account._id,
            debit: 100,
            credit: 0
        });

        const found = await journalEntryLineDao.findById(line._id);
        expect(found).toBeDefined();
        expect(found.accountId.name).toBe("Cash");
        expect(found.journalEntryId.entryNumber).toBe("JV-2026-001");
    });

    it("should update journal entry line debit/credit values", async () => {
        const line = await journalEntryLineDao.create({
            journalEntryId: entry._id,
            accountId: account._id,
            debit: 100,
            credit: 0
        });

        const updated = await journalEntryLineDao.updateById(line._id, { debit: 0, credit: 100 });
        expect(updated.debit).toBe(0);
        expect(updated.credit).toBe(100);
    });

    it("should delete journal entry line by id", async () => {
        const line = await journalEntryLineDao.create({
            journalEntryId: entry._id,
            accountId: account._id,
            debit: 100,
            credit: 0
        });

        await journalEntryLineDao.deleteById(line._id);
        const found = await journalEntryLineDao.findById(line._id);
        expect(found).toBeNull();
    });
});
