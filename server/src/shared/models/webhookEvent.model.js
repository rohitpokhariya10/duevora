import mongoose from "mongoose";

const ERROR_MESSAGE_MAX_LENGTH = 500;

function sanitizeErrorMessage(value) {
    if (typeof value !== "string") {
        return value;
    }

    return value
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, ERROR_MESSAGE_MAX_LENGTH);
}

const webhookEventSchema = new mongoose.Schema({
    provider: {
        type: String,
        enum: ["razorpay"],
        required: [true, "Webhook provider is required"],
    },

    eventId: {
        type: String,
        required: [true, "Webhook event ID is required"],
        trim: true,
    },

    eventType: {
        type: String,
        required: [true, "Webhook event type is required"],
        trim: true,
    },

    payloadHash: {
        type: String,
        required: [true, "Webhook payload hash is required"],
        trim: true,
    },

    status: {
        type: String,
        enum: ["processing", "processed", "ignored", "failed"],
        default: "processing",
        required: true,
    },

    paymentLinkId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PaymentLink",
    },

    providerPaymentId: {
        type: String,
        trim: true,
    },

    errorMessage: {
        type: String,
        trim: true,
        maxlength: [ERROR_MESSAGE_MAX_LENGTH, "Webhook error message is too long"],
        set: sanitizeErrorMessage,
    },

    processedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

// Persist only event metadata and a body hash; the full provider payload may
// contain customer payment data and is intentionally excluded from this model.
webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
webhookEventSchema.index({ provider: 1, eventType: 1, createdAt: 1 });
webhookEventSchema.index({ status: 1, createdAt: 1 });

const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);

export default WebhookEvent;
