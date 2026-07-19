// Importing module
import mongoose from "mongoose";

// Importing module

// defining the schema for the receipt model
// defining the schema for the receipt model
const receiptSchema = new mongoose.Schema({

    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: [true, "Organization is required"],
    },

    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
    },

    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
    },

    receiptNumber: {
        type: String,
        required: [true, "Receipt number is required"],
        trim: true,
    },

    receiptDate: {
        type: Date,
        required: [true, "Receipt date is required"],
    },

    amount: {
        type: Number,
        required: [true, "Receipt amount is required"],
        min: [0.01, "Amount must be greater than zero"],
    },

    paymentMethod: {
        type: String,
        required: [true, "Payment method is required"],
        trim: true,
    },

    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        required: [true, "Account reference is required"],
    },

    provider: {
        type: String,
        enum: ["manual", "razorpay"],
        default: "manual",
    },

    providerPaymentId: {
        type: String,
        trim: true,
    },

    providerPaymentLinkId: {
        type: String,
        trim: true,
    },

    providerOrderId: {
        type: String,
        trim: true,
    }

}, {
    timestamps: true
});

// adding index for the receipt schema
receiptSchema.index({ organizationId: 1, receiptNumber: 1 }, { unique: true });
receiptSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });
receiptSchema.index({ organizationId: 1, invoiceId: 1, receiptDate: 1 });

// making the model for the receipt schema
const Receipt = mongoose.model("Receipt", receiptSchema);

// exporting the receipt model
export default Receipt;
