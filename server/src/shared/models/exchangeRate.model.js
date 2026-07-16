import mongoose from "mongoose";

const exchangeRateSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: [true, "Organization is required"],
    },
    currencyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Currency",
        required: [true, "Currency reference is required"],
    },
    rate: {
        type: Number,
        required: [true, "Exchange rate is required"],
        min: [0.000001, "Rate must be greater than zero"],
    },
    effectiveDate: {
        type: Date,
        required: [true, "Effective date is required"],
    }
}, {
    timestamps: true
});

const ExchangeRate = mongoose.model("ExchangeRate", exchangeRateSchema);

export default ExchangeRate;
