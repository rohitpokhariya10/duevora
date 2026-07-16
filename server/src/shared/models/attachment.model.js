import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: [true, "Organization is required"],
    },
    filename: {
        type: String,
        required: [true, "Filename is required"],
        trim: true,
    },
    fileUrl: {
        type: String,
        required: [true, "File URL is required"],
        trim: true,
    },
    fileType: {
        type: String,
        trim: true,
    },
    fileSize: {
        type: Number,
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Uploader user reference is required"],
    }
}, {
    timestamps: true
});

const Attachment = mongoose.model("Attachment", attachmentSchema);

export default Attachment;
