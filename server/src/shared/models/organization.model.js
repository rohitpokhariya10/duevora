import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        minlength: [2, "Name must be at least 2 characters long"],
    },
    code: {
        type: String,
        required: [true, "Code is required"],
        unique: true,
        uppercase: true,
        trim: true,
    },
    address: {
        type: String,
    },
    logo: {
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

const Organization = mongoose.model("Organization", organizationSchema);

export default Organization;
