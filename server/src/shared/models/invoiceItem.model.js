import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
        required: [true, "Invoice is required"],
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: [true, "Product is required"],
    },
    quantity: {
        type: Number,
        required: [true, "Quantity is required"],
        min: [1, "Quantity must be at least 1"],
    },
    unitPrice: {
        type: Number,
        required: [true, "Unit price is required"],
        min: [0, "Unit price cannot be negative"],
    },
    taxId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tax",
    },
    taxAmount: {
        type: Number,
        default: 0,
    },
    discountAmount: {
        type: Number,
        default: 0,
    },
    total: {
        type: Number,
        required: [true, "Total is required"],
        default: 0,
    }
}, {
    timestamps: true
});

const InvoiceItem = mongoose.model("InvoiceItem", invoiceItemSchema);

export default InvoiceItem;
