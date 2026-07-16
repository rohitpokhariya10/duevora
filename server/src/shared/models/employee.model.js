import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: [true, "Organization is required"],
    },
    employeeCode: {
        type: String,
        required: [true, "Employee code is required"],
        trim: true,
    },
    firstName: {
        type: String,
        required: [true, "First name is required"],
    },
    lastName: {
        type: String,
        required: [true, "Last name is required"],
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        match: [/\S+@\S+\.\S+/, "Email is invalid"],
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
    },
    joiningDate: {
        type: Date,
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
    }
}, {
    timestamps: true
});

// Compound index to ensure employeeCode is unique within an organization
employeeSchema.index({ organizationId: 1, employeeCode: 1 }, { unique: true });

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
