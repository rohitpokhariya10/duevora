import mongoose from "mongoose";

const FAILURE_REASON_MAX_LENGTH = 500;

function sanitizeFailureReason(value) {
    if (typeof value !== "string") {
        return value;
    }

    return value
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, FAILURE_REASON_MAX_LENGTH);
}

const paymentLinkSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: [true, "Organization is required"],
    },

    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
        required: [true, "Invoice is required"],
    },

    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: [true, "Customer is required"],
    },

    provider: {
        type: String,
        enum: ["razorpay"],
        default: "razorpay",
        required: true,
    },

    providerPaymentLinkId: {
        type: String,
        trim: true,
    },

    referenceId: {
        type: String,
        required: [true, "Payment link reference is required"],
        trim: true,
    },

    shortUrl: {
        type: String,
        trim: true,
    },

    currency: {
        type: String,
        default: "INR",
        trim: true,
        uppercase: true,
    },

    amountPaise: {
        type: Number,
        required: [true, "Payment link amount is required"],
        min: [1, "Payment link amount must be at least one paise"],
        validate: {
            validator: Number.isInteger,
            message: "Payment link amount must be an integer number of paise",
        },
    },

    amountPaidPaise: {
        type: Number,
        default: 0,
        min: [0, "Paid amount cannot be negative"],
        validate: {
            validator: Number.isInteger,
            message: "Paid amount must be an integer number of paise",
        },
    },

    amountDuePaise: {
        type: Number,
        required: [true, "Payment link amount due is required"],
        min: [0, "Amount due cannot be negative"],
        validate: {
            validator: Number.isInteger,
            message: "Amount due must be an integer number of paise",
        },
    },

    acceptPartial: {
        type: Boolean,
        default: true,
    },

    status: {
        type: String,
        enum: ["creating", "created", "partially_paid", "paid", "cancelled", "expired", "failed"],
        default: "creating",
        required: true,
    },

    active: {
        type: Boolean,
        default: true,
    },

    expiresAt: {
        type: Date,
    },

    providerCreatedAt: {
        type: Date,
    },

    providerUpdatedAt: {
        type: Date,
    },

    lastSyncedAt: {
        type: Date,
    },

    failureReason: {
        type: String,
        trim: true,
        maxlength: [FAILURE_REASON_MAX_LENGTH, "Failure reason is too long"],
        set: sanitizeFailureReason,
    },
}, {
    timestamps: true,
});

paymentLinkSchema.index({ providerPaymentLinkId: 1 }, { unique: true, sparse: true });
paymentLinkSchema.index({ organizationId: 1, referenceId: 1 }, { unique: true });
paymentLinkSchema.index({ organizationId: 1, invoiceId: 1, status: 1 });
paymentLinkSchema.index({ organizationId: 1, active: 1, updatedAt: 1 });

// A partial unique index makes concurrent payment-link requests converge on a
// single active local record while retaining inactive provider history.
paymentLinkSchema.index(
    { organizationId: 1, invoiceId: 1 },
    {
        unique: true,
        partialFilterExpression: { active: true },
        name: "unique_active_payment_link_per_invoice",
    }
);

const PaymentLink = mongoose.model("PaymentLink", paymentLinkSchema);

export default PaymentLink;
