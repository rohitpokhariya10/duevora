import crypto from "node:crypto";
import env from "../config/env.config.js";
import PaymentLink from "../models/paymentLink.model.js";
import Invoice from "../models/invoice.model.js";
import Customer from "../models/customer.model.js";
import BadRequest from "../errors/BadRequest.error.js";
import BadGateway from "../errors/BadGateway.error.js";
import Conflict from "../errors/Conflict.error.js";
import NotFound from "../errors/NotFound.error.js";
import razorpayService from "./razorpay.service.js";
import { calculateInvoiceBalance } from "./invoiceBalance.service.js";
import { fromPaise } from "../utils/money.util.js";
import { normalizePhone } from "../utils/phone.util.js";

const REUSABLE_STATUSES = ["created", "partially_paid"];
const CANCELLABLE_STATUSES = ["created", "partially_paid"];
const ALLOWED_INVOICE_STATUSES = ["sent", "partially_paid"];
const READY_WAIT_ATTEMPTS = 20;
const READY_WAIT_MS = 50;

function safeFailureReason(error) {
    if (typeof error?.providerCode === "string") {
        return `Razorpay error: ${error.providerCode}`.slice(0, 240);
    }

    return "Razorpay payment link creation failed.";
}

function toCleanPaymentLink(paymentLink, balance = null) {
    const data = paymentLink.toObject ? paymentLink.toObject() : paymentLink;
    const outstandingPaise = balance?.outstandingPaise ?? data.amountDuePaise;

    return {
        paymentLinkId: data._id,
        paymentUrl: data.shortUrl,
        status: data.status,
        currency: data.currency,
        outstandingAmount: fromPaise(outstandingPaise),
        amountPaid: fromPaise(data.amountPaidPaise),
        expiresAt: data.expiresAt,
    };
}

class PaymentLinkService {

    constructor(provider = razorpayService) {
        this.provider = provider;
    }

    createOrReusePaymentLink = async ({ organizationId, invoiceId }) => {
        const { invoice, customer, balance } = await this.loadInvoiceContext({
            organizationId,
            invoiceId,
            requirePayable: true,
        });

        let existing = await PaymentLink.findOne({
            organizationId,
            invoiceId,
            active: true,
        });

        if (this.isReusable(existing, balance.outstandingPaise)) {
            return toCleanPaymentLink(existing, balance);
        }

        if (existing?.status === "creating") {
            existing = await this.waitForConcurrentPaymentLink({ organizationId, invoiceId });

            if (this.isReusable(existing, balance.outstandingPaise)) {
                return toCleanPaymentLink(existing, balance);
            }

            if (existing?.status === "creating") {
                throw new Conflict("A payment link is already being created for this invoice.");
            }
        }

        if (existing) {
            await this.retireStalePaymentLink(existing);
        }

        const referenceId = this.createReferenceId(invoice._id);
        let localPaymentLink;

        try {
            // Reserving the unique active slot before the provider call prevents duplicate links.
            localPaymentLink = await PaymentLink.create({
                organizationId,
                invoiceId: invoice._id,
                customerId: customer._id,
                referenceId,
                amountPaise: balance.outstandingPaise,
                amountPaidPaise: 0,
                amountDuePaise: balance.outstandingPaise,
                acceptPartial: true,
                status: "creating",
                active: true,
                expiresAt: this.calculateExpiry(invoice.dueDate),
            });
        } catch (error) {
            if (error?.code !== 11000) throw error;

            const concurrent = await this.waitForConcurrentPaymentLink({ organizationId, invoiceId });
            if (this.isReusable(concurrent, balance.outstandingPaise)) {
                return toCleanPaymentLink(concurrent, balance);
            }

            throw new Conflict("A payment link is already being created for this invoice.");
        }

        try {
            // Provider communication deliberately occurs without an active MongoDB transaction.
            const providerResponse = await this.provider.createPaymentLink(
                this.buildProviderPayload({ localPaymentLink, invoice, customer })
            );

            if (!providerResponse.id || !providerResponse.short_url) {
                throw new BadGateway("Unable to create payment link at this time.");
            }

            const providerCreatedAt = providerResponse.created_at
                ? new Date(providerResponse.created_at * 1000)
                : new Date();

            const updated = await PaymentLink.findOneAndUpdate({
                _id: localPaymentLink._id,
                active: true,
                status: "creating",
            }, {
                $set: {
                    providerPaymentLinkId: providerResponse.id,
                    shortUrl: providerResponse.short_url,
                    status: providerResponse.status === "partially_paid" ? "partially_paid" : "created",
                    providerCreatedAt,
                    providerUpdatedAt: providerCreatedAt,
                    lastSyncedAt: new Date(),
                },
            }, {
                returnDocument: "after",
                runValidators: true,
            });

            if (!updated) {
                throw new Conflict("Payment link creation state changed. Please try again.");
            }

            return toCleanPaymentLink(updated, balance);
        } catch (error) {
            await PaymentLink.updateOne({
                _id: localPaymentLink._id,
                status: "creating",
            }, {
                $set: {
                    status: "failed",
                    active: false,
                    failureReason: safeFailureReason(error),
                    providerUpdatedAt: new Date(),
                },
            });

            throw error;
        }
    };

    getCurrentPaymentLink = async ({ organizationId, invoiceId }) => {
        const { invoice, balance } = await this.loadInvoiceContext({ organizationId, invoiceId });

        if (!ALLOWED_INVOICE_STATUSES.includes(invoice.status) || balance.outstandingPaise <= 0) {
            throw new NotFound("No valid active payment link was found for this invoice.");
        }

        const paymentLink = await PaymentLink.findOne({
            organizationId,
            invoiceId,
            active: true,
        });

        if (!this.isReusable(paymentLink, balance.outstandingPaise)) {
            throw new NotFound("No valid active payment link was found for this invoice.");
        }

        return toCleanPaymentLink(paymentLink, balance);
    };

    cancelPaymentLink = async ({ organizationId, paymentLinkId }) => {
        let paymentLink = await PaymentLink.findOne({ _id: paymentLinkId, organizationId });

        if (!paymentLink) {
            throw new NotFound("Payment link not found in your organization.");
        }

        if (paymentLink.status === "cancelled" && !paymentLink.active) {
            return toCleanPaymentLink(paymentLink);
        }

        if (!paymentLink.active || !CANCELLABLE_STATUSES.includes(paymentLink.status)) {
            throw new BadRequest("Only active payment links can be cancelled.");
        }

        const providerStatus = await this.cancelProviderLinkOrReconcile(paymentLink);

        // A concurrent paid webhook wins over cancellation and must never be downgraded.
        paymentLink = await PaymentLink.findOneAndUpdate({
            _id: paymentLink._id,
            organizationId,
            active: true,
            status: { $in: CANCELLABLE_STATUSES },
        }, {
            $set: {
                status: providerStatus,
                active: false,
                providerUpdatedAt: new Date(),
                lastSyncedAt: new Date(),
            },
        }, {
            returnDocument: "after",
            runValidators: true,
        }) || await PaymentLink.findOne({ _id: paymentLink._id, organizationId });

        return toCleanPaymentLink(paymentLink);
    };

    reconcileAfterReceipt = async ({ organizationId, invoiceId }) => {
        const { balance } = await this.loadInvoiceContext({ organizationId, invoiceId });
        const paymentLink = await PaymentLink.findOne({
            organizationId,
            invoiceId,
            active: true,
        });

        if (!paymentLink || this.isReusable(paymentLink, balance.outstandingPaise)) {
            return { retired: false };
        }

        await this.retireStalePaymentLink(paymentLink);
        return { retired: true, paymentLinkId: paymentLink._id };
    };

    loadInvoiceContext = async ({ organizationId, invoiceId, requirePayable = false }) => {
        const invoice = await Invoice.findOne({ _id: invoiceId, organizationId }).lean();

        if (!invoice) {
            throw new NotFound("Invoice not found in your organization.");
        }

        if (requirePayable && !ALLOWED_INVOICE_STATUSES.includes(invoice.status)) {
            throw new BadRequest("Payment links can only be created for sent or partially paid invoices.");
        }

        const customer = await Customer.findOne({
            _id: invoice.customerId,
            organizationId,
            isDeleted: { $ne: true },
        }).lean();

        if (!customer) {
            throw new NotFound("Invoice customer not found in your organization.");
        }

        const balance = await calculateInvoiceBalance({
            organizationId,
            invoiceId: invoice._id,
            invoiceTotal: invoice.grandTotal,
        });

        if (requirePayable && balance.outstandingPaise <= 0) {
            throw new BadRequest("This invoice has no outstanding amount.");
        }

        return { invoice, customer, balance };
    };

    isReusable = (paymentLink, outstandingPaise) => {
        if (!paymentLink || !paymentLink.active || !REUSABLE_STATUSES.includes(paymentLink.status)) {
            return false;
        }

        if (!paymentLink.shortUrl || paymentLink.amountDuePaise !== outstandingPaise) {
            return false;
        }

        return !paymentLink.expiresAt || paymentLink.expiresAt.getTime() > Date.now();
    };

    retireStalePaymentLink = async (paymentLink) => {
        const isExpired = paymentLink.expiresAt && paymentLink.expiresAt.getTime() <= Date.now();
        let reconciledProviderStatus = null;

        if (!isExpired && paymentLink.providerPaymentLinkId && CANCELLABLE_STATUSES.includes(paymentLink.status)) {
            reconciledProviderStatus = await this.cancelProviderLinkOrReconcile(paymentLink);
        }

        const nextStatus = isExpired
            ? "expired"
            : reconciledProviderStatus
                || (paymentLink.status === "creating" ? "failed" : "cancelled");
        await PaymentLink.updateOne({
            _id: paymentLink._id,
            active: true,
            status: { $ne: "paid" },
        }, {
            $set: {
                active: false,
                status: nextStatus,
                providerUpdatedAt: new Date(),
            },
        });
    };

    cancelProviderLinkOrReconcile = async (paymentLink) => {
        try {
            await this.provider.cancelPaymentLink(paymentLink.providerPaymentLinkId);
            return "cancelled";
        } catch (cancelError) {
            let providerState;

            try {
                providerState = await this.provider.fetchPaymentLink(paymentLink.providerPaymentLinkId);
            } catch {
                throw cancelError;
            }

            if (["cancelled", "expired"].includes(providerState?.status)) {
                return providerState.status;
            }

            throw cancelError;
        }
    };

    waitForConcurrentPaymentLink = async ({ organizationId, invoiceId }) => {
        for (let attempt = 0; attempt < READY_WAIT_ATTEMPTS; attempt += 1) {
            const paymentLink = await PaymentLink.findOne({
                organizationId,
                invoiceId,
                active: true,
            });

            if (!paymentLink || paymentLink.status !== "creating") return paymentLink;
            await new Promise((resolve) => setTimeout(resolve, READY_WAIT_MS));
        }

        return await PaymentLink.findOne({ organizationId, invoiceId, active: true });
    };

    createReferenceId = (invoiceId) => {
        const entropy = crypto.randomBytes(3).toString("hex");
        return `DVL-${invoiceId.toString().slice(-12)}-${Date.now().toString(36)}-${entropy}`;
    };

    calculateExpiry = (dueDate) => {
        const now = Date.now();
        const fallback = now + (7 * 24 * 60 * 60 * 1000);
        const dueWithGrace = dueDate
            ? new Date(dueDate).getTime() + (7 * 24 * 60 * 60 * 1000)
            : fallback;

        return new Date(dueWithGrace > now + (15 * 60 * 1000) ? dueWithGrace : fallback);
    };

    buildProviderPayload = ({ localPaymentLink, invoice, customer }) => {
        const providerCustomer = { name: customer.name };

        if (customer.email && /^\S+@\S+\.\S+$/.test(customer.email)) {
            providerCustomer.email = customer.email;
        }

        if (customer.phone) {
            try {
                providerCustomer.contact = normalizePhone(customer.phone);
            } catch {
                // A malformed optional phone must not block an otherwise valid email payment flow.
            }
        }

        return {
            amount: localPaymentLink.amountPaise,
            currency: "INR",
            accept_partial: true,
            reference_id: localPaymentLink.referenceId,
            description: `Payment for invoice ${invoice.invoiceNumber}`.slice(0, 255),
            customer: providerCustomer,
            notify: {
                sms: false,
                email: false,
            },
            reminder_enable: false,
            notes: {
                paymentLinkId: localPaymentLink._id.toString(),
                invoiceId: invoice._id.toString(),
                organizationId: invoice.organizationId.toString(),
            },
            callback_url: `${env.APP_BASE_URL.replace(/\/$/, "")}/payment-success`,
            callback_method: "get",
            expire_by: Math.floor(localPaymentLink.expiresAt.getTime() / 1000),
        };
    };

}

const paymentLinkService = new PaymentLinkService();

export { PaymentLinkService, toCleanPaymentLink };
export default paymentLinkService;
