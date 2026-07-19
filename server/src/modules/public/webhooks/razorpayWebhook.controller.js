import BadRequest from "../../../shared/errors/BadRequest.error.js";
import Ok from "../../../shared/responses/Ok.response.js";
import razorpayWebhookService, {
    verifyRazorpaySignature,
} from "../../../shared/services/razorpayWebhook.service.js";
import { removeReminderJob } from "../../../shared/services/reminderQueue.service.js";

class RazorpayWebhookController {

    handle = async (req, res) => {
        const rawBody = req.body;
        const signature = req.get("X-Razorpay-Signature");

        if (!Buffer.isBuffer(rawBody) || !verifyRazorpaySignature(rawBody, signature)) {
            throw new BadRequest("Invalid Razorpay webhook signature.");
        }

        let eventPayload;
        try {
            eventPayload = JSON.parse(rawBody.toString("utf8"));
        } catch {
            throw new BadRequest("Invalid Razorpay webhook payload.");
        }

        let result;
        try {
            result = await razorpayWebhookService.processEvent({
                rawBody,
                eventId: req.get("x-razorpay-event-id"),
                eventPayload,
            });
        } catch (error) {
            if (error.statusCode === 400) throw new BadRequest(error.message);

            const safeError = new Error("Payment webhook could not be processed.");
            safeError.statusCode = 500;
            throw safeError;
        }

        if (result?.invalidPayment) {
            throw new BadRequest("Invalid Razorpay payment data.");
        }

        // Redis operations run only after the payment/accounting transaction has committed.
        if (result?.completedReminderIds?.length) {
            await Promise.allSettled(
                result.completedReminderIds.map((reminderId) => removeReminderJob(reminderId))
            );
        }

        return Ok(res, "Razorpay webhook received", {
            received: true,
            duplicate: Boolean(result?.duplicate),
        });
    };

}

export default RazorpayWebhookController;
