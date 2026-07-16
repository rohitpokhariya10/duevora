import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Permission name is required"],
        unique: true,
        trim: true,
    },
    code: {
        type: String,
        required: [true, "Permission code is required"],
        unique: true,
        trim: true,
        uppercase: true,
    },
    module: {
        type: String,
        required: [true, "Module is required"],
        trim: true,
    },
    description: {
        type: String,
    }
}, {
    timestamps: true
});

const Permission = mongoose.model("Permission", permissionSchema);

export default Permission;
