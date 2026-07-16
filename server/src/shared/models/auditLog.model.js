import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: [true, "Organization is required"],
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User reference is required"],
    },
    action: {
        type: String,
        required: [true, "Action is required"],
        trim: true,
    },
    entityType: {
        type: String,
        required: [true, "Entity type is required"],
        trim: true,
    },
    entityId: {
        type: String,
        required: [true, "Entity ID is required"],
        trim: true,
    },
    oldValues: {
        type: mongoose.Schema.Types.Mixed,
    },
    newValues: {
        type: mongoose.Schema.Types.Mixed,
    }
}, {
    timestamps: true
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
