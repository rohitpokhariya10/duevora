import mongoose from "mongoose";
import PaymentLinkDao from "../paymentLink.dao.js";
import WebhookEventDao from "../webhookEvent.dao.js";
import PaymentLink from "../../models/paymentLink.model.js";
import WebhookEvent from "../../models/webhookEvent.model.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "./testDb.helper.js";

const paymentLinkDao = new PaymentLinkDao();
const webhookEventDao = new WebhookEventDao();

beforeAll(async () => {
    await connectTestDB();
    await PaymentLink.init();
    await WebhookEvent.init();
});

afterAll(async () => {
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearTestDB();
});

function paymentLinkData(overrides = {}) {
    return {
        organizationId: new mongoose.Types.ObjectId(),
        invoiceId: new mongoose.Types.ObjectId(),
        customerId: new mongoose.Types.ObjectId(),
        referenceId: `reference-${new mongoose.Types.ObjectId()}`,
        amountPaise: 10000,
        amountDuePaise: 10000,
        ...overrides,
    };
}

describe("PaymentLink DAO", () => {
    it("supports organization-isolated lookup and update operations", async () => {
        const data = paymentLinkData();
        const paymentLink = await paymentLinkDao.create(data);

        const matching = await paymentLinkDao.findByIdForOrganization(
            paymentLink._id,
            data.organizationId
        );
        const foreign = await paymentLinkDao.findByIdForOrganization(
            paymentLink._id,
            new mongoose.Types.ObjectId()
        );
        const deniedUpdate = await paymentLinkDao.updateByIdForOrganization(
            paymentLink._id,
            new mongoose.Types.ObjectId(),
            { status: "cancelled" }
        );

        expect(matching._id).toEqual(paymentLink._id);
        expect(foreign).toBeNull();
        expect(deniedUpdate).toBeNull();
    });

    it("enforces one active link per organization and invoice", async () => {
        const data = paymentLinkData();
        const firstLink = await paymentLinkDao.create(data);

        await expect(paymentLinkDao.create({
            ...data,
            referenceId: "another-reference",
        })).rejects.toMatchObject({ code: 11000 });

        await paymentLinkDao.updateById(firstLink._id, {
            active: false,
            status: "failed",
        });

        await expect(paymentLinkDao.create({
            ...data,
            referenceId: "replacement-reference",
        })).resolves.toBeDefined();
    });

    it("supports sorting, pagination and an optional database session", async () => {
        const organizationId = new mongoose.Types.ObjectId();
        const session = await mongoose.startSession();

        try {
            await paymentLinkDao.create(paymentLinkData({
                organizationId,
                referenceId: "reference-a",
                amountPaise: 100,
                amountDuePaise: 100,
            }), session);
            await paymentLinkDao.create(paymentLinkData({
                organizationId,
                referenceId: "reference-b",
                amountPaise: 200,
                amountDuePaise: 200,
            }), session);

            const results = await paymentLinkDao.findForOrganization(
                organizationId,
                {},
                { sort: { amountPaise: -1 }, skip: 0, limit: 1 },
                session
            );

            expect(results).toHaveLength(1);
            expect(results[0].amountPaise).toBe(200);
        } finally {
            await session.endSession();
        }
    });
});

describe("WebhookEvent DAO", () => {
    it("enforces idempotency for a provider event ID", async () => {
        const webhookEvent = {
            provider: "razorpay",
            eventId: "payment-event-1",
            eventType: "payment.captured",
            payloadHash: "a".repeat(64),
        };

        await webhookEventDao.create(webhookEvent);
        await expect(webhookEventDao.create(webhookEvent)).rejects.toMatchObject({ code: 11000 });
    });

    it("updates processing state without storing the provider payload", async () => {
        const webhookEvent = await webhookEventDao.create({
            provider: "razorpay",
            eventId: "payment-event-2",
            eventType: "payment.captured",
            payloadHash: "b".repeat(64),
            payload: { sensitive: true },
        });

        const processedAt = new Date();
        const updated = await webhookEventDao.updateById(webhookEvent._id, {
            status: "processed",
            processedAt,
        });

        expect(updated.status).toBe("processed");
        expect(updated.processedAt).toEqual(processedAt);
        expect(updated.toObject()).not.toHaveProperty("payload");
    });
});
