import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema({
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
        default: 0,
    }
}, {
    timestamps: true
});

// Ensure a single inventory record exists per product per warehouse
inventorySchema.index({ productId: 1, warehouseId: 1 }, { unique: true });

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory;
