import paymentLinkService from "../../../shared/services/paymentLink.service.js";
import Created from "../../../shared/responses/Created.response.js";
import Ok from "../../../shared/responses/Ok.response.js";

class PaymentLinksController {

    createPaymentLink = async (req, res) => {
        const paymentLink = await paymentLinkService.createOrReusePaymentLink({
            organizationId: req.user.organizationId,
            invoiceId: req.params.invoiceId,
        });

        return Created(res, "Payment link is ready", paymentLink);
    };

    getPaymentLink = async (req, res) => {
        const paymentLink = await paymentLinkService.getCurrentPaymentLink({
            organizationId: req.user.organizationId,
            invoiceId: req.params.invoiceId,
        });

        return Ok(res, "Payment link retrieved successfully", paymentLink);
    };

    cancelPaymentLink = async (req, res) => {
        const paymentLink = await paymentLinkService.cancelPaymentLink({
            organizationId: req.user.organizationId,
            paymentLinkId: req.params.paymentLinkId,
        });

        return Ok(res, "Payment link cancelled successfully", paymentLink);
    };

}

export default PaymentLinksController;
