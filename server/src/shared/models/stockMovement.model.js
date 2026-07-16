import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: [true, "Organization is required"],
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: [true, "Product is required"],
    },
    warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: [true, "Warehouse is required"],
    },
    quantity: {
        type: Number,
        required: [true, "Quantity is required"],
    },
    type: {
        type: String,
        enum: ["in", "out"],
        required: [true, "Type (in/out) is required"],
    },
    referenceType: {
        type: String,
        trim: true,
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    date: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true
});

const StockMovement = mongoose.model("StockMovement", stockMovementSchema);

export default StockMovement;
