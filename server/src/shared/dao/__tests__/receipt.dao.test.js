import { connectTestDB, disconnectTestDB, clearTestDB } from "./testDb.helper.js";
import mongoose from "mongoose";
import ReceiptDao from "../receipt.dao.js";
import CustomerDao from "../customer.dao.js";
import InvoiceDao from "../invoice.dao.js";
import OrganizationDao from "../organization.dao.js";

const receiptDao = new ReceiptDao();
const customerDao = new CustomerDao();
const invoiceDao = new InvoiceDao();
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

describe("Receipt DAO Tests", () => {
    let org, customer, invoice, mockAccountId;

    beforeEach(async () => {
        org = await organizationDao.create({ name: "Acme Corp", code: "ACME" });
        customer = await customerDao.create({ organizationId: org._id, name: "John Doe" });
        invoice = await invoiceDao.create({
            organizationId: org._id,
            customerId: customer._id,
            invoiceNumber: "INV-2026-001",
            invoiceDate: new Date(),
            subTotal: 100,
            taxTotal: 18,
            grandTotal: 118
        });
        const AccountModel = mongoose.model("Account");
        const account = await new AccountModel({ name: "Cash Account" }).save();
        mockAccountId = account._id;
    });

    it("should create a receipt successfully", async () => {
        const receiptData = {
            organizationId: org._id,
            customerId: customer._id,
            invoiceId: invoice._id,
            receiptNumber: "RCT-2026-001",
            receiptDate: new Date(),
            amount: 118.00,
            paymentMethod: "Bank Transfer",
            accountId: mockAccountId
        };
        const receipt = await receiptDao.create(receiptData);
        expect(receipt).toBeDefined();
        expect(receipt.receiptNumber).toBe("RCT-2026-001");
        expect(receipt.amount).toBe(118.00);
        expect(receipt.paymentMethod).toBe("Bank Transfer");
    });

    it("should fail to create duplicate receipt number in same organization", async () => {
        const r1 = {
            organizationId: org._id,
            receiptNumber: "RCT-2026-001",
            receiptDate: new Date(),
            amount: 100,
            paymentMethod: "Cash",
            accountId: mockAccountId
        };
        const r2 = {
            organizationId: org._id,
            receiptNumber: "RCT-2026-001",
            receiptDate: new Date(),
            amount: 200,
            paymentMethod: "Cash",
            accountId: mockAccountId
        };

        await receiptDao.create(r1);
        await expect(receiptDao.create(r2)).rejects.toThrow();
    });

    it("should allow same receipt number in different organizations", async () => {
        const org2 = await organizationDao.create({ name: "Beta Corp", code: "BETA" });

        const r1 = {
            organizationId: org._id,
            receiptNumber: "RCT-2026-001",
            receiptDate: new Date(),
            amount: 100,
            paymentMethod: "Cash",
            accountId: mockAccountId
        };
        const r2 = {
            organizationId: org2._id,
            receiptNumber: "RCT-2026-001",
            receiptDate: new Date(),
            amount: 100,
            paymentMethod: "Cash",
            accountId: mockAccountId
        };

        const rct1 = await receiptDao.create(r1);
        const rct2 = await receiptDao.create(r2);
        expect(rct1).toBeDefined();
        expect(rct2).toBeDefined();
    });

    it("should find receipt by id and populate relationships", async () => {
        const receipt = await receiptDao.create({
            organizationId: org._id,
            customerId: customer._id,
            invoiceId: invoice._id,
            receiptNumber: "RCT-2026-001",
            receiptDate: new Date(),
            amount: 100,
            paymentMethod: "Cash",
            accountId: mockAccountId
        });

        const found = await receiptDao.findById(receipt._id);
        expect(found).toBeDefined();
        expect(found.customerId.name).toBe("John Doe");
        expect(found.invoiceId.invoiceNumber).toBe("INV-2026-001");
        expect(found.accountId.name).toBe("Cash Account");
    });

    it("should update receipt details", async () => {
        const receipt = await receiptDao.create({
            organizationId: org._id,
            receiptNumber: "RCT-2026-001",
            receiptDate: new Date(),
            amount: 100,
            paymentMethod: "Cash",
            accountId: mockAccountId
        });

        const updated = await receiptDao.updateById(receipt._id, { amount: 150 });
        expect(updated.amount).toBe(150);
    });

    it("should delete receipt by id", async () => {
        const receipt = await receiptDao.create({
            organizationId: org._id,
            receiptNumber: "RCT-2026-001",
            receiptDate: new Date(),
            amount: 100,
            paymentMethod: "Cash",
            accountId: mockAccountId
        });

        await receiptDao.deleteById(receipt._id);
        const found = await receiptDao.findById(receipt._id);
        expect(found).toBeNull();
    });
});
