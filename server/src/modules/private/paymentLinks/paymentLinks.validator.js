import mongoose from "mongoose";
import { param } from "express-validator";
import validateErrors from "../../../shared/utils/validateErrors.util.js";

const invoicePaymentLinkValidators = [
    param("invoiceId")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Invoice ID"),
    validateErrors,
];

const cancelPaymentLinkValidators = [
    param("paymentLinkId")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Payment Link ID"),
    validateErrors,
];

export { cancelPaymentLinkValidators, invoicePaymentLinkValidators };
