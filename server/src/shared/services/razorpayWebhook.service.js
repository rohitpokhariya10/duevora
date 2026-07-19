import crypto from "node:crypto";
import mongoose from "mongoose";
import env from "../config/env.config.js";
import logger from "../config/logger.config.js";
import Account from "../models/account.model.js";
import PaymentLink from "../models/paymentLink.model.js";
import Receipt from "../models/receipt.model.js";
import Reminder from "../models/reminder.model.js";
import WebhookEvent from "../models/webhookEvent.model.js";
import customerReceiptService from "./customerReceipt.service.js";
import { fromPaise } from "../utils/money.util.js";

const SUPPORTED_EVENTS = new Set([
    "payment_link.paid",
    "payment_link.partially_paid",
    "payment_link.cancelled",
    "payment_link.expired",
]);

const PAYMENT_EVENTS = new Set([
    "payment_link.paid",
    "payment_link.partially_paid",
]);

const COMPLETABLE_REMINDER_STATUSES = [
    "pending",
    "scheduled",
    "queued",
    "processing",
    "failed",
    "partially_sent",
    "action_required",
];

function payloadHash(rawBody) {
    return crypto.createHash("sha256").update(rawBody).digest("hex");
}

function safeEventId(eventId, hash) {
    if (typeof eventId === "string" && eventId.trim()) {
        return eventId.trim().slice(0, 200);
    }

    // Razorpay always supplies an event ID in production. The hash fallback eases local fixtures only.
    if (env.NODE_ENV !== "production") {
        return `payload-${hash}`;
    }

    return null;
}

function verifyRazorpaySignature(rawBody, signature) {
    if (!Buffer.isBuffer(rawBody) || !env.RAZORPAY_WEBHOOK_SECRET) return false;
    if (typeof signature !== "string" || !/^[a-f\d]{64}$/i.test(signature)) return false;

    const expected = crypto
        .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest();
    const received = Buffer.from(signature, "hex");

    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

async function getOrCreateRazorpayClearingAccount(organizationId, session) {
    return await Account.findOneAndUpdate({
        organizationId,
        code: "RAZORPAY_CLEARING",
    }, {
        $setOnInsert: {
            organizationId,
            name: "Razorpay Clearing",
            code: "RAZORPAY_CLEARING",
            type: "asset",
            status: "active",
        },
    }, {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        session,
    });
}

async function calculateLinkPayments(paymentLink, session) {
    const [result] = await Receipt.aggregate([
        {
            $match: {
                organizationId: paymentLink.organizationId,
                provider: "razorpay",
                providerPaymentLinkId: paymentLink.providerPaymentLinkId,
            },
        },
        {
            $group: {
                _id: null,
                totalPaise: {
                    $sum: { $round: [{ $multiply: ["$amount", 100] }, 0] },
                },
            },
        },
    ]).session(session);

    return Number(result?.totalPaise || 0);
}

class RazorpayWebhookService {

    processEvent = async ({ rawBody, eventId, eventPayload }) => {
        const hash = payloadHash(rawBody);
        const resolvedEventId = safeEventId(eventId, hash);

        if (!resolvedEventId) {
            const error = new Error("Razorpay event ID is required.");
            error.statusCode = 400;
            throw error;
        }

        const eventType = typeof eventPayload?.event === "string"
            ? eventPayload.event.slice(0, 120)
            : "unknown";

        const existing = await WebhookEvent.findOne({
            provider: "razorpay",
            eventId: resolvedEventId,
        }).lean();

        if (existing && existing.payloadHash !== hash) {
            const error = new Error("Razorpay event ID does not match the signed payload.");
            error.statusCode = 400;
            throw error;
        }

        if (existing && ["processed", "ignored"].includes(existing.status)) {
            return { duplicate: true, status: existing.status };
        }

        const session = await mongoose.startSession();
        let result;

        try {
            await session.withTransaction(async () => {
                let webhookEvent = await WebhookEvent.findOne({
                    provider: "razorpay",
                    eventId: resolvedEventId,
                }).session(session);

                if (webhookEvent && ["processed", "ignored"].includes(webhookEvent.status)) {
                    result = { duplicate: true, status: webhookEvent.status };
                    return;
                }

                if (webhookEvent && webhookEvent.payloadHash !== hash) {
                    const error = new Error("Razorpay event ID does not match the signed payload.");
                    error.statusCode = 400;
                    throw error;
                }

                if (!webhookEvent) {
                    [webhookEvent] = await WebhookEvent.create([{
                        provider: "razorpay",
                        eventId: resolvedEventId,
                        eventType,
                        payloadHash: hash,
                        status: "processing",
                    }], { session });
                } else {
                    webhookEvent.status = "processing";
                    webhookEvent.errorMessage = undefined;
                    await webhookEvent.save({ session });
                }

                if (!SUPPORTED_EVENTS.has(eventType)) {
                    webhookEvent.status = "ignored";
                    webhookEvent.processedAt = new Date();
                    await webhookEvent.save({ session });
                    result = { status: "ignored" };
                    return;
                }

                const paymentLinkEntity = eventPayload?.payload?.payment_link?.entity;
                const providerPaymentLinkId = paymentLinkEntity?.id;
                const paymentLink = providerPaymentLinkId
                    ? await PaymentLink.findOne({ providerPaymentLinkId }).session(session)
                    : null;

                if (!paymentLink) {
                    webhookEvent.status = "ignored";
                    webhookEvent.errorMessage = "Unknown payment link";
                    webhookEvent.processedAt = new Date();
                    await webhookEvent.save({ session });
                    result = { status: "ignored" };
                    return;
                }

                webhookEvent.paymentLinkId = paymentLink._id;

                if (eventType === "payment_link.cancelled" || eventType === "payment_link.expired") {
                    // A locally confirmed payment is terminal even if provider events arrive out of order.
                    if (paymentLink.status !== "paid") {
                        paymentLink.status = eventType.endsWith("cancelled") ? "cancelled" : "expired";
                        paymentLink.active = false;
                        paymentLink.providerUpdatedAt = new Date();
                        paymentLink.lastSyncedAt = new Date();
                        await paymentLink.save({ session });
                    }

                    webhookEvent.status = "processed";
                    webhookEvent.processedAt = new Date();
                    await webhookEvent.save({ session });
                    result = { status: "processed", paymentLinkStatus: paymentLink.status };
                    return;
                }

                const paymentEntity = eventPayload?.payload?.payment?.entity;
                const orderEntity = eventPayload?.payload?.order?.entity;
                const providerPaymentId = paymentEntity?.id;
                const paymentAmountPaise = paymentEntity?.amount;
                const currency = paymentEntity?.currency;

                if (
                    typeof providerPaymentId !== "string"
                    || !Number.isSafeInteger(paymentAmountPaise)
                    || paymentAmountPaise <= 0
                    || currency !== "INR"
                ) {
                    webhookEvent.status = "failed";
                    webhookEvent.errorMessage = "Invalid Razorpay payment data";
                    await webhookEvent.save({ session });
                    result = { status: "failed", invalidPayment: true };
                    return;
                }

                webhookEvent.providerPaymentId = providerPaymentId.slice(0, 200);

                const clearingAccount = await getOrCreateRazorpayClearingAccount(
                    paymentLink.organizationId,
                    session
                );

                const receiptResult = await customerReceiptService({
                    organizationId: paymentLink.organizationId,
                    customerId: paymentLink.customerId,
                    invoiceId: paymentLink.invoiceId,
                    receiptNumber: `RZP-${providerPaymentId}`,
                    receiptDate: paymentEntity.created_at
                        ? new Date(paymentEntity.created_at * 1000)
                        : new Date(),
                    amount: fromPaise(paymentAmountPaise),
                    paymentMethod: "razorpay",
                    accountId: clearingAccount._id,
                    provider: "razorpay",
                    providerPaymentId,
                    providerPaymentLinkId: paymentLink.providerPaymentLinkId,
                    providerOrderId: paymentEntity.order_id || orderEntity?.id,
                    session,
                });

                const recordedLinkPayments = await calculateLinkPayments(paymentLink, session);
                const providerAmountPaid = Number.isSafeInteger(paymentLinkEntity?.amount_paid)
                    ? paymentLinkEntity.amount_paid
                    : 0;
                paymentLink.amountPaidPaise = Math.min(
                    paymentLink.amountPaise,
                    Math.max(paymentLink.amountPaidPaise, providerAmountPaid, recordedLinkPayments)
                );
                paymentLink.amountDuePaise = Math.max(
                    paymentLink.amountPaise - paymentLink.amountPaidPaise,
                    0
                );

                const invoicePaid = receiptResult.invoice.status === "paid";
                if (paymentLink.status !== "paid") {
                    paymentLink.status = invoicePaid || paymentLink.amountDuePaise === 0
                        ? "paid"
                        : "partially_paid";
                }
                paymentLink.active = paymentLink.status !== "paid";
                paymentLink.providerUpdatedAt = new Date();
                paymentLink.lastSyncedAt = new Date();
                await paymentLink.save({ session });

                let completedReminderIds = [];
                if (invoicePaid) {
                    const reminders = await Reminder.find({
                        organizationId: paymentLink.organizationId,
                        invoiceId: paymentLink.invoiceId,
                        status: { $in: COMPLETABLE_REMINDER_STATUSES },
                    }).select("_id").session(session);
                    completedReminderIds = reminders.map((reminder) => reminder._id.toString());

                    await Reminder.updateMany({
                        _id: { $in: reminders.map((reminder) => reminder._id) },
                    }, {
                        $set: {
                            status: "completed",
                            queueStatus: "completed",
                            completedAt: new Date(),
                            processingLockUntil: null,
                            processingBy: null,
                        },
                    }, { session });
                }

                webhookEvent.status = "processed";
                webhookEvent.processedAt = new Date();
                await webhookEvent.save({ session });

                result = {
                    status: "processed",
                    invoiceStatus: receiptResult.invoice.status,
                    outstandingAmount: receiptResult.outstandingAmount,
                    completedReminderIds,
                };
            });

            return result;
        } catch (error) {
            const duplicate = error?.code === 11000
                ? await WebhookEvent.findOne({
                    provider: "razorpay",
                    eventId: resolvedEventId,
                }).lean()
                : null;

            if (duplicate) {
                return { duplicate: true, status: duplicate.status };
            }

            logger.error({
                provider: "razorpay",
                operation: "webhook",
                eventId: resolvedEventId,
                errorName: error.name,
            }, "Razorpay webhook transaction failed");
            throw error;
        } finally {
            await session.endSession();
        }
    };

}

const razorpayWebhookService = new RazorpayWebhookService();

export { RazorpayWebhookService, payloadHash, verifyRazorpaySignature };
export default razorpayWebhookService;
