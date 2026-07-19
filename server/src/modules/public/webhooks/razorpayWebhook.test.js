import { jest } from "@jest/globals";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";

process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-test-secret";
jest.setTimeout(30000);

jest.unstable_mockModule("../../../shared/utils/sendMail.util.js", () => ({
    __esModule: true,
    default: jest.fn(),
}));

const mockRemoveReminderJob = jest.fn().mockResolvedValue(true);
const reminderQueueMock = {
    enqueueReminder: jest.fn(),
    enqueueImmediateReminder: jest.fn(),
    removeReminderJob: mockRemoveReminderJob,
    getReminderJob: jest.fn(),
};

jest.unstable_mockModule("../../../shared/services/reminderQueue.service.js", () => ({
    __esModule: true,
    ...reminderQueueMock,
    default: reminderQueueMock,
}));

const { default: createApp } = await import("../../../app.js");
const { default: Account } = await import("../../../shared/models/account.model.js");
const { default: Customer } = await import("../../../shared/models/customer.model.js");
const { default: Invoice } = await import("../../../shared/models/invoice.model.js");
const { default: JournalEntry } = await import("../../../shared/models/journalEntry.model.js");
const { default: JournalEntryLine } = await import("../../../shared/models/journalEntryLine.model.js");
const { default: LedgerEntry } = await import("../../../shared/models/ledgerEntry.model.js");
const { default: Organization } = await import("../../../shared/models/organization.model.js");
const { default: PaymentLink } = await import("../../../shared/models/paymentLink.model.js");
const { default: Receipt } = await import("../../../shared/models/receipt.model.js");
const { default: Reminder } = await import("../../../shared/models/reminder.model.js");
const { default: WebhookEvent } = await import("../../../shared/models/webhookEvent.model.js");

let app;
let mongoServer;
let organization;
let customer;
let invoice;
let paymentLink;

function buildPayload({
    event = "payment_link.partially_paid",
    paymentId = "pay_test_1",
    amountPaise = 40000,
    amountPaidPaise = amountPaise,
    notes = {},
} = {}) {
    return {
        event,
        payload: {
            payment_link: {
                entity: {
                    id: paymentLink.providerPaymentLinkId,
                    amount: paymentLink.amountPaise,
                    amount_paid: amountPaidPaise,
                    currency: "INR",
                    notes,
                },
            },
            ...(event === "payment_link.paid" || event === "payment_link.partially_paid" ? {
                payment: {
                    entity: {
                        id: paymentId,
                        amount: amountPaise,
                        currency: "INR",
                        created_at: 1784428200,
                        order_id: "order_test_1",
                    },
                },
            } : {}),
        },
    };
}

function signedWebhook(payload, eventId = "event_test_1") {
    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");

    return request(app)
        .post("/api/webhooks/razorpay")
        .set("Content-Type", "application/json")
        .set("X-Razorpay-Signature", signature)
        .set("x-razorpay-event-id", eventId)
        .send(rawBody.toString("utf8"));
}

beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({
        replSet: { storageEngine: "wiredTiger" },
    });
    await mongoose.connect(mongoServer.getUri());
    await Promise.all([
        PaymentLink.syncIndexes(),
        Receipt.syncIndexes(),
        WebhookEvent.syncIndexes(),
    ]);
    app = createApp();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    jest.clearAllMocks();

    for (const collection of Object.values(mongoose.connection.collections)) {
        await collection.deleteMany({});
    }

    organization = await Organization.create({ name: "Webhook Org", code: "WEBHOOK" });
    customer = await Customer.create({
        organizationId: organization._id,
        name: "Webhook Customer",
        email: "customer@example.com",
    });
    invoice = await Invoice.create({
        organizationId: organization._id,
        customerId: customer._id,
        invoiceNumber: "INV-WEBHOOK-1",
        invoiceDate: new Date("2026-07-01T00:00:00.000Z"),
        subTotal: 1000,
        taxTotal: 0,
        grandTotal: 1000,
        status: "sent",
    });
    paymentLink = await PaymentLink.create({
        organizationId: organization._id,
        invoiceId: invoice._id,
        customerId: customer._id,
        providerPaymentLinkId: "plink_webhook_1",
        referenceId: "DVL-WEBHOOK-1",
        shortUrl: "https://rzp.io/i/webhook",
        amountPaise: 100000,
        amountPaidPaise: 0,
        amountDuePaise: 100000,
        status: "created",
        active: true,
    });
});

describe("Razorpay webhook", () => {
    it("rejects an invalid signature without accounting side effects", async () => {
        const response = await request(app)
            .post("/api/webhooks/razorpay")
            .set("Content-Type", "application/json")
            .set("X-Razorpay-Signature", "0".repeat(64))
            .set("x-razorpay-event-id", "event_invalid")
            .send(JSON.stringify(buildPayload()));

        expect(response.status).toBe(400);
        expect(await Receipt.countDocuments()).toBe(0);
        expect(await JournalEntry.countDocuments()).toBe(0);
        expect(await WebhookEvent.countDocuments()).toBe(0);
    });

    it("records a partial customer receipt and balanced accounting entries", async () => {
        const response = await signedWebhook(buildPayload());

        expect(response.status).toBe(200);
        const receipt = await Receipt.findOne({ providerPaymentId: "pay_test_1" });
        expect(receipt.amount).toBe(400);
        expect(receipt.provider).toBe("razorpay");

        const updatedInvoice = await Invoice.findById(invoice._id);
        expect(updatedInvoice.status).toBe("partially_paid");

        const journal = await JournalEntry.findOne({ organizationId: organization._id });
        const lines = await JournalEntryLine.find({ journalEntryId: journal._id }).populate("accountId");
        const ledgers = await LedgerEntry.find({ journalEntryId: journal._id });
        expect(lines).toHaveLength(2);
        expect(ledgers).toHaveLength(2);
        expect(lines.find((line) => line.accountId.code === "RAZORPAY_CLEARING").debit).toBe(400);
        expect(lines.find((line) => line.accountId.code === "ACCOUNTS_RECEIVABLE").credit).toBe(400);
    });

    it("marks a fully settled invoice and payment link paid", async () => {
        const response = await signedWebhook(buildPayload({
            event: "payment_link.paid",
            amountPaise: 100000,
            amountPaidPaise: 100000,
        }), "event_paid");

        expect(response.status).toBe(200);
        expect((await Invoice.findById(invoice._id)).status).toBe("paid");
        const updatedLink = await PaymentLink.findById(paymentLink._id);
        expect(updatedLink.status).toBe("paid");
        expect(updatedLink.active).toBe(false);
    });

    it("completes pending reminders after full payment", async () => {
        const reminder = await Reminder.create({
            organizationId: organization._id,
            customerId: customer._id,
            invoiceId: invoice._id,
            paymentLinkId: paymentLink._id,
            title: "Pay invoice",
            scheduledFor: new Date(),
            channels: ["email"],
            status: "queued",
        });

        await signedWebhook(buildPayload({
            event: "payment_link.paid",
            amountPaise: 100000,
            amountPaidPaise: 100000,
        }), "event_complete_reminder");

        const updated = await Reminder.findById(reminder._id);
        expect(updated.status).toBe("completed");
        expect(updated.queueStatus).toBe("completed");
        expect(updated.completedAt).toBeInstanceOf(Date);
        expect(mockRemoveReminderJob).toHaveBeenCalledWith(reminder._id.toString());
    });

    it("creates the Razorpay Clearing account only once", async () => {
        await signedWebhook(buildPayload({ amountPaise: 40000 }), "event_partial_1");
        await signedWebhook(buildPayload({
            paymentId: "pay_test_2",
            amountPaise: 60000,
            amountPaidPaise: 100000,
            event: "payment_link.paid",
        }), "event_partial_2");

        expect(await Account.countDocuments({
            organizationId: organization._id,
            code: "RAZORPAY_CLEARING",
        })).toBe(1);
    });

    it("deduplicates repeated event IDs", async () => {
        const payload = buildPayload();
        const first = await signedWebhook(payload, "event_duplicate");
        const second = await signedWebhook(payload, "event_duplicate");

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(second.body.data.duplicate).toBe(true);
        expect(await Receipt.countDocuments({ providerPaymentId: "pay_test_1" })).toBe(1);
    });

    it("deduplicates a provider payment delivered under another event ID", async () => {
        const payload = buildPayload();
        await signedWebhook(payload, "event_provider_1");
        await signedWebhook(payload, "event_provider_2");

        expect(await Receipt.countDocuments({ providerPaymentId: "pay_test_1" })).toBe(1);
        expect(await JournalEntry.countDocuments()).toBe(1);
    });

    it("records unsupported events as ignored without storing the payload", async () => {
        const response = await signedWebhook({
            event: "payment_link.some_future_event",
            payload: { secretLookingData: "must-not-be-stored" },
        }, "event_unsupported");

        expect(response.status).toBe(200);
        const event = await WebhookEvent.findOne({ eventId: "event_unsupported" }).lean();
        expect(event.status).toBe("ignored");
        expect(JSON.stringify(event)).not.toContain("must-not-be-stored");
    });

    it.each([
        ["payment_link.cancelled", "cancelled"],
        ["payment_link.expired", "expired"],
    ])("handles %s without creating a Receipt", async (event, expectedStatus) => {
        const response = await signedWebhook(buildPayload({ event }), `event_${expectedStatus}`);

        expect(response.status).toBe(200);
        const updated = await PaymentLink.findById(paymentLink._id);
        expect(updated.status).toBe(expectedStatus);
        expect(updated.active).toBe(false);
        expect(await Receipt.countDocuments()).toBe(0);
    });

    it("does not let a late cancellation regress a paid link", async () => {
        await signedWebhook(buildPayload({
            event: "payment_link.paid",
            amountPaise: 100000,
            amountPaidPaise: 100000,
        }), "event_terminal_paid");
        await signedWebhook(buildPayload({ event: "payment_link.cancelled" }), "event_late_cancel");

        expect((await PaymentLink.findById(paymentLink._id)).status).toBe("paid");
        expect((await Invoice.findById(invoice._id)).status).toBe("paid");
    });

    it("uses the internal PaymentLink instead of provider notes as authority", async () => {
        const otherOrganization = await Organization.create({ name: "Other", code: "OTHER-WH" });
        const otherCustomer = await Customer.create({
            organizationId: otherOrganization._id,
            name: "Other Customer",
        });
        const otherInvoice = await Invoice.create({
            organizationId: otherOrganization._id,
            customerId: otherCustomer._id,
            invoiceNumber: "INV-OTHER",
            invoiceDate: new Date(),
            subTotal: 500,
            taxTotal: 0,
            grandTotal: 500,
            status: "sent",
        });

        await signedWebhook(buildPayload({
            notes: {
                organizationId: otherOrganization._id.toString(),
                invoiceId: otherInvoice._id.toString(),
                customerId: otherCustomer._id.toString(),
            },
        }), "event_untrusted_notes");

        const receipt = await Receipt.findOne({ providerPaymentId: "pay_test_1" });
        expect(receipt.organizationId.toString()).toBe(organization._id.toString());
        expect(receipt.invoiceId.toString()).toBe(invoice._id.toString());
        expect((await Invoice.findById(otherInvoice._id)).status).toBe("sent");
    });
});
