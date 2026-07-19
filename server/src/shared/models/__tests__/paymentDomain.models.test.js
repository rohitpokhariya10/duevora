import mongoose from "mongoose";
import PaymentLink from "../paymentLink.model.js";
import Receipt from "../receipt.model.js";
import WebhookEvent from "../webhookEvent.model.js";

function hasIndex(model, expectedFields, expectedOptions = {}) {
    return model.schema.indexes().some(([fields, options]) => (
        JSON.stringify(fields) === JSON.stringify(expectedFields)
        && Object.entries(expectedOptions).every(([key, value]) => (
            JSON.stringify(options[key]) === JSON.stringify(value)
        ))
    ));
}

describe("PaymentLink model", () => {
    const basePaymentLink = {
        organizationId: new mongoose.Types.ObjectId(),
        invoiceId: new mongoose.Types.ObjectId(),
        customerId: new mongoose.Types.ObjectId(),
        referenceId: "duevora-reference-1",
        amountPaise: 25000,
        amountDuePaise: 25000,
    };

    it("applies safe provider and lifecycle defaults", async () => {
        const paymentLink = new PaymentLink(basePaymentLink);
        await expect(paymentLink.validate()).resolves.toBeUndefined();
        expect(paymentLink.provider).toBe("razorpay");
        expect(paymentLink.currency).toBe("INR");
        expect(paymentLink.status).toBe("creating");
        expect(paymentLink.active).toBe(true);
        expect(paymentLink.acceptPartial).toBe(true);
        expect(paymentLink.amountPaidPaise).toBe(0);
    });

    it("requires integer paise values", async () => {
        const paymentLink = new PaymentLink({
            ...basePaymentLink,
            amountPaise: 100.5,
        });

        await expect(paymentLink.validate()).rejects.toThrow("integer number of paise");
    });

    it("declares provider and concurrency safety indexes", () => {
        expect(hasIndex(PaymentLink, { providerPaymentLinkId: 1 }, {
            unique: true,
            sparse: true,
        })).toBe(true);
        expect(hasIndex(PaymentLink, { organizationId: 1, invoiceId: 1 }, {
            unique: true,
            partialFilterExpression: { active: true },
        })).toBe(true);
    });
});

describe("WebhookEvent model", () => {
    it("stores only webhook processing metadata", async () => {
        const webhookEvent = new WebhookEvent({
            provider: "razorpay",
            eventId: "event-1",
            eventType: "payment_link.paid",
            payloadHash: "c".repeat(64),
            payload: { customerEmail: "private@example.com" },
        });

        await expect(webhookEvent.validate()).resolves.toBeUndefined();
        expect(webhookEvent.status).toBe("processing");
        expect(webhookEvent.toObject()).not.toHaveProperty("payload");
        expect(hasIndex(WebhookEvent, { provider: 1, eventId: 1 }, {
            unique: true,
        })).toBe(true);
    });
});

describe("Receipt payment provider fields", () => {
    it("keeps manual receipt creation as the default", () => {
        const receipt = new Receipt();
        expect(receipt.provider).toBe("manual");
    });

    it("declares idempotency and invoice-date indexes", () => {
        expect(hasIndex(Receipt, { providerPaymentId: 1 }, {
            unique: true,
            sparse: true,
        })).toBe(true);
        expect(hasIndex(Receipt, { organizationId: 1, invoiceId: 1, receiptDate: 1 })).toBe(true);
    });
});
