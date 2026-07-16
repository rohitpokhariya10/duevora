import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import JournalEntryDao from "../journalEntry.dao.js";
import OrganizationDao from "../organization.dao.js";

const journalEntryDao = new JournalEntryDao();
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

describe("JournalEntry DAO Tests", () => {
    let org;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
    });

    it("should create a journal entry successfully", async () => {
        const entryData = {
            organizationId: org._id,
            entryNumber: "JV-2026-001",
            date: new Date(),
            narration: "Initial setup",
            status: "draft"
        };
        const entry = await journalEntryDao.create(entryData);
        expect(entry).toBeDefined();
        expect(entry.entryNumber).toBe("JV-2026-001");
        expect(entry.status).toBe("draft");
    });

    it("should fail to create duplicate entry number in same organization", async () => {
        const e1 = {
            organizationId: org._id,
            entryNumber: "JV-2026-001",
            date: new Date()
        };
        const e2 = {
            organizationId: org._id,
            entryNumber: "JV-2026-001",
            date: new Date()
        };

        await journalEntryDao.create(e1);
        await expect(journalEntryDao.create(e2)).rejects.toThrow();
    });

    it("should allow same entry number in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });

        const e1 = {
            organizationId: org._id,
            entryNumber: "JV-2026-001",
            date: new Date()
        };
        const e2 = {
            organizationId: org2._id,
            entryNumber: "JV-2026-001",
            date: new Date()
        };

        const entry1 = await journalEntryDao.create(e1);
        const entry2 = await journalEntryDao.create(e2);
        expect(entry1).toBeDefined();
        expect(entry2).toBeDefined();
    });

    it("should find journal entry by id", async () => {
        const entry = await journalEntryDao.create({
            organizationId: org._id,
            entryNumber: "JV-2026-001",
            date: new Date()
        });

        const found = await journalEntryDao.findById(entry._id);
        expect(found).toBeDefined();
        expect(found.organizationId._id.toString()).toBe(org._id.toString());
    });

    it("should update journal entry status", async () => {
        const entry = await journalEntryDao.create({
            organizationId: org._id,
            entryNumber: "JV-2026-001",
            date: new Date()
        });

        const updated = await journalEntryDao.updateById(entry._id, { status: "posted" });
        expect(updated.status).toBe("posted");
    });

    it("should delete journal entry by id", async () => {
        const entry = await journalEntryDao.create({
            organizationId: org._id,
            entryNumber: "JV-2026-001",
            date: new Date()
        });

        await journalEntryDao.deleteById(entry._id);
        const found = await journalEntryDao.findById(entry._id);
        expect(found).toBeNull();
    });
});
