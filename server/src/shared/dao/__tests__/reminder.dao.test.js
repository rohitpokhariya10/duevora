import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import mongoose from "mongoose";
import ReminderDao from "../reminder.dao.js";
import InvoiceDao from "../invoice.dao.js";
import CustomerDao from "../customer.dao.js";
import OrganizationDao from "../organization.dao.js";

const reminderDao = new ReminderDao();
const invoiceDao = new InvoiceDao();
const customerDao = new CustomerDao();
const organizationDao = new OrganizationDao();

beforeAll(async () => {
    await connectTestDB();
    // Register dummy Account schema so populate works in isolation
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

describe("Reminder DAO Tests", () => {
    let org, customer, invoice;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        customer = await customerDao.create({ organizationId: org._id, name: "Customer A" });
        invoice = await invoiceDao.create({
            organizationId: org._id,
            customerId: customer._id,
            invoiceNumber: "INV-2026-001",
            invoiceDate: new Date(),
            subTotal: 100,
            taxTotal: 18,
            grandTotal: 118
        });
    });

    it("should create a reminder successfully", async () => {
        const reminder = await reminderDao.create({
            organizationId: org._id,
            title: "Follow up on INV-2026-001",
            dueDate: new Date(),
            invoiceId: invoice._id,
            description: "Send email reminder to client"
        });
        expect(reminder).toBeDefined();
        expect(reminder.title).toBe("Follow up on INV-2026-001");
        expect(reminder.status).toBe("pending");
    });

    it("should fail to create reminder without title or dueDate", async () => {
        await expect(reminderDao.create({
            organizationId: org._id,
            dueDate: new Date()
        })).rejects.toThrow();

        await expect(reminderDao.create({
            organizationId: org._id,
            title: "Follow up"
        })).rejects.toThrow();
    });

    it("should find and populate reminder details", async () => {
        const reminder = await reminderDao.create({
            organizationId: org._id,
            title: "Follow up on INV-2026-001",
            dueDate: new Date(),
            invoiceId: invoice._id
        });

        const found = await reminderDao.findById(reminder._id);
        expect(found).toBeDefined();
        expect(found.invoiceId.invoiceNumber).toBe("INV-2026-001");
    });

    it("should update reminder status", async () => {
        const reminder = await reminderDao.create({
            organizationId: org._id,
            title: "Follow up on INV-2026-001",
            dueDate: new Date()
        });

        const updated = await reminderDao.updateById(reminder._id, { status: "completed" });
        expect(updated.status).toBe("completed");
    });

    it("should delete reminder by id", async () => {
        const reminder = await reminderDao.create({
            organizationId: org._id,
            title: "Follow up on INV-2026-001",
            dueDate: new Date()
        });

        await reminderDao.deleteById(reminder._id);
        const found = await reminderDao.findById(reminder._id);
        expect(found).toBeNull();
    });
});
