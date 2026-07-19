import express from "express";
import PaymentLinksController from "./paymentLinks.controller.js";
import {
    cancelPaymentLinkValidators,
    invoicePaymentLinkValidators,
} from "./paymentLinks.validator.js";
import authMiddleware from "../../../shared/middlewares/auth.middleware.js";
import permissionMiddleware from "../../../shared/middlewares/permission.middleware.js";

const router = express.Router();
const invoicePaymentLinksRouter = express.Router({ mergeParams: true });
const controller = new PaymentLinksController();

invoicePaymentLinksRouter.post(
    "/",
    authMiddleware,
    permissionMiddleware("invoices.update"),
    invoicePaymentLinkValidators,
    controller.createPaymentLink
);

invoicePaymentLinksRouter.get(
    "/",
    authMiddleware,
    permissionMiddleware("invoices.view"),
    invoicePaymentLinkValidators,
    controller.getPaymentLink
);

router.post(
    "/:paymentLinkId/cancel",
    authMiddleware,
    permissionMiddleware("invoices.update"),
    cancelPaymentLinkValidators,
    controller.cancelPaymentLink
);

export { invoicePaymentLinksRouter };
export default router;
