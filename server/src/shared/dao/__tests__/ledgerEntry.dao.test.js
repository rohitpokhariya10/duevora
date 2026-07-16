import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import LedgerEntryDao from "../ledgerEntry.dao.js";
import JournalEntryDao from "../journalEntry.dao.js";
import AccountDao from "../account.dao.js";
import OrganizationDao from "../organization.dao.js";

const ledgerEntryDao = new LedgerEntryDao();
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

describe("LedgerEntry DAO Tests", () => {
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

    it("should create a ledger entry successfully", async () => {
        const ledger = await ledgerEntryDao.create({
            organizationId: org._id,
            accountId: account._id,
            journalEntryId: entry._id,
            date: new Date(),
            debit: 500,
            credit: 0
        });
        expect(ledger).toBeDefined();
        expect(ledger.organizationId.toString()).toBe(org._id.toString());
        expect(ledger.accountId.toString()).toBe(account._id.toString());
        expect(ledger.journalEntryId.toString()).toBe(entry._id.toString());
        expect(ledger.debit).toBe(500);
        expect(ledger.credit).toBe(0);
    });

    it("should fail to create ledger entry without date", async () => {
        await expect(ledgerEntryDao.create({
            organizationId: org._id,
            accountId: account._id,
            journalEntryId: entry._id,
            debit: 500
        })).rejects.toThrow();
    });

    it("should find and populate ledger entry details", async () => {
        const ledger = await ledgerEntryDao.create({
            organizationId: org._id,
            accountId: account._id,
            journalEntryId: entry._id,
            date: new Date(),
            debit: 500,
            credit: 0
        });

        const found = await ledgerEntryDao.findById(ledger._id);
        expect(found).toBeDefined();
        expect(found.accountId.name).toBe("Cash");
        expect(found.journalEntryId.entryNumber).toBe("JV-2026-001");
    });

    it("should update ledger entry values", async () => {
        const ledger = await ledgerEntryDao.create({
            organizationId: org._id,
            accountId: account._id,
            journalEntryId: entry._id,
            date: new Date(),
            debit: 500,
            credit: 0
        });

        const updated = await ledgerEntryDao.updateById(ledger._id, { debit: 0, credit: 500 });
        expect(updated.debit).toBe(0);
        expect(updated.credit).toBe(500);
    });

    it("should delete ledger entry by id", async () => {
        const ledger = await ledgerEntryDao.create({
            organizationId: org._id,
            accountId: account._id,
            journalEntryId: entry._id,
            date: new Date(),
            debit: 500,
            credit: 0
        });

        await ledgerEntryDao.deleteById(ledger._id);
        const found = await ledgerEntryDao.findById(ledger._id);
        expect(found).toBeNull();
    });
});
