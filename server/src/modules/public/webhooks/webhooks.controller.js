import Invoice from "../../../shared/models/invoice.model.js";
import Customer from "../../../shared/models/customer.model.js";
import sendMail from "../../../shared/utils/sendMail.util.js";
import logger from "../../../shared/config/logger.config.js";
import Ok from "../../../shared/responses/Ok.response.js";

class WebhooksController {

    simulatePayment = async (req, res) => {
        const { invoiceId } = req.body;
        if (!invoiceId) {
            return res.status(400).json({ success: false, message: "invoiceId is required" });
        }

        const invoice = await Invoice.findById(invoiceId).populate("customerId organizationId");
        if (!invoice) {
            return res.status(404).json({ success: false, message: "Invoice not found" });
        }

        if (invoice.status === "paid") {
            return res.status(400).json({ success: false, message: "Invoice is already paid" });
        }

        const previousStatus = invoice.status;
        invoice.status = "paid";
        await invoice.save();

        logger.info(`[MockPayment] Invoice ${invoice.invoiceNumber} marked as PAID (was ${previousStatus})`);

        const customer = invoice.customerId;
        if (customer?.email) {
            const orgName = invoice.organizationId?.name || "Your business";
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #16a34a; color: #fff; padding: 24px; text-align: center;">
                        <h1 style="margin: 0; font-size: 20px;">Payment Successful!</h1>
                        <p style="margin: 4px 0 0; color: #bbf7d0; font-size: 12px;">${orgName}</p>
                    </div>
                    <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
                        <p>Hi ${customer.name},</p>
                        <p>Your payment of <strong>₹${invoice.grandTotal.toLocaleString("en-IN")}</strong> for Invoice <strong>${invoice.invoiceNumber}</strong> has been received successfully.</p>
                        <p style="font-size: 13px; color: #64748b;">
                            Invoice: ${invoice.invoiceNumber}<br>
                            Amount: ₹${invoice.grandTotal.toLocaleString("en-IN")}<br>
                            Date: ${new Date().toLocaleDateString("en-IN")}<br>
                            Status: <span style="color: #16a34a; font-weight: bold;">PAID</span>
                        </p>
                        <p>Thank you for your business!</p>
                    </div>
                    <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
                        This is an automated message from ${orgName} via Duevora.
                    </div>
                </div>
            `;
            sendMail(customer.email, `Payment Confirmation - Invoice ${invoice.invoiceNumber}`, html);
        }

        return Ok(res, "Payment recorded successfully", {
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.grandTotal,
            status: "paid",
            previousStatus,
        });
    };

    sendReminder = async (req, res) => {
        const { invoiceId } = req.body;
        if (!invoiceId) {
            return res.status(400).json({ success: false, message: "invoiceId is required" });
        }

        const invoice = await Invoice.findById(invoiceId).populate("customerId organizationId");
        if (!invoice) {
            return res.status(404).json({ success: false, message: "Invoice not found" });
        }

        if (invoice.status === "paid" || invoice.status === "void") {
            return res.status(400).json({ success: false, message: `Invoice is already ${invoice.status}` });
        }

        const customer = invoice.customerId;
        if (!customer?.email) {
            return res.status(400).json({ success: false, message: "Customer has no email address" });
        }

        const orgName = invoice.organizationId?.name || "Your business";
        const daysUntilDue = invoice.dueDate
            ? Math.ceil((new Date(invoice.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
            : null;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0f172a; color: #fff; padding: 24px; text-align: center;">
                    <h1 style="margin: 0; font-size: 20px;">${orgName}</h1>
                    <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">Payment Reminder</p>
                </div>
                <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
                    <p>Hi ${customer.name},</p>
                    <p>This is a friendly reminder for Invoice <strong>${invoice.invoiceNumber}</strong> for <strong>₹${invoice.grandTotal.toLocaleString("en-IN")}</strong>.
                    ${daysUntilDue !== null
                        ? daysUntilDue <= 0
                            ? ` This invoice is <span style="color: #dc2626; font-weight: bold;">overdue</span>.`
                            : ` Due in <strong>${daysUntilDue} day(s)</strong>.`
                        : ""}</p>
                    <p>Please make the payment at your earliest convenience.</p>
                    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
                        Invoice: ${invoice.invoiceNumber}<br>
                        Amount: ₹${invoice.grandTotal.toLocaleString("en-IN")}<br>
                        ${invoice.dueDate ? `Due: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}` : ""}
                    </p>
                </div>
                <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
                    This is an automated reminder from ${orgName} via Duevora.
                </div>
            </div>
        `;

        sendMail(customer.email, `Payment Reminder - Invoice ${invoice.invoiceNumber}`, html);

        return Ok(res, "Reminder sent", {
            invoiceNumber: invoice.invoiceNumber,
            email: customer.email,
        });
    };

    triggerDueCheck = async (req, res) => {
        try {
            const { checkDueInvoices } = await import("../../../shared/jobs/checkDueInvoices.js");
            const result = await checkDueInvoices();
            return Ok(res, "Due invoice check completed", result);
        } catch (err) {
            logger.error(`[Webhook] Manual due check failed: ${err.message}`);
            return res.status(500).json({ success: false, message: err.message });
        }
    };
}

export default WebhooksController;
