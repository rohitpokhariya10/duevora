import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
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
    title: {
        type: String,
        required: [true, "Notification title is required"],
        trim: true,
    },
    message: {
        type: String,
        required: [true, "Notification message is required"],
        trim: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    type: {
        type: String,
        trim: true,
        default: "system",
    }
}, {
    timestamps: true
});

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
