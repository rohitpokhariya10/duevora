import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: [true, "Organization is required"],
    },
    name: {
        type: String,
        required: [true, "Vendor name is required"],
        trim: true,
    },
    email: {
        type: String,
        match: [/\S+@\S+\.\S+/, "Email is invalid"],
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
    },
    address: {
        type: String,
    },
    taxNumber: {
        type: String,
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
    }
}, {
    timestamps: true
});

const Vendor = mongoose.model("Vendor", vendorSchema);

export default Vendor;
