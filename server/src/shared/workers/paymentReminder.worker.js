import { Worker } from "bullmq";
import { createQueueConnection } from "../config/redis.config.js";
import InvoiceDao from "../dao/invoice.dao.js";
import CustomerDao from "../dao/customer.dao.js";
import sendMail from "../utils/sendMail.util.js";
import logger from "../config/logger.config.js";

const invoiceDao = new InvoiceDao();
const customerDao = new CustomerDao();

const paymentReminderWorker = new Worker(
    "payment-reminders",
    async (job) => {
        const { invoiceId, type } = job.data;

        logger.info(`[Worker] Processing payment reminder for invoice ${invoiceId}, type: ${type}`);

        const invoice = await invoiceDao.findById(invoiceId);
        if (!invoice) {
            logger.warn(`[Worker] Invoice ${invoiceId} not found. Skipping.`);
            return { skipped: true, reason: "Invoice not found" };
        }

        if (invoice.status === "paid" || invoice.status === "void") {
            logger.info(`[Worker] Invoice ${invoice.invoiceNumber} is ${invoice.status}. Skipping.`);
            return { skipped: true, reason: `Invoice is ${invoice.status}` };
        }

        const customer = await customerDao.findById(invoice.customerId);
        if (!customer) {
            logger.warn(`[Worker] Customer for invoice ${invoice.invoiceNumber} not found. Skipping.`);
            return { skipped: true, reason: "Customer not found" };
        }

        if (!customer.email) {
            logger.warn(`[Worker] Customer for invoice ${invoice.invoiceNumber} has no email. Skipping.`);
            return { skipped: true, reason: "No customer email" };
        }

        const orgName = invoice.organizationId?.name || "Your business";
        const daysUntilDue = invoice.dueDate
            ? Math.ceil((new Date(invoice.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
            : null;

        const urgency =
            daysUntilDue !== null
                ? daysUntilDue <= 0
                    ? "overdue"
                    : daysUntilDue <= 3
                    ? "urgent"
                    : "normal"
                : "normal";

        const subject =
            urgency === "overdue"
                ? `OVERDUE: Payment Required for Invoice ${invoice.invoiceNumber}`
                : urgency === "urgent"
                ? `Reminder: Invoice ${invoice.invoiceNumber} due in ${daysUntilDue} day(s)`
                : `Invoice ${invoice.invoiceNumber} from ${orgName}`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0f172a; color: #fff; padding: 24px; text-align: center;">
                    <h1 style="margin: 0; font-size: 20px;">${orgName}</h1>
                    <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">Payment Reminder</p>
                </div>
                <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
                    <p>Hi ${customer.name},</p>
                    <p>This is a reminder for Invoice <strong>${invoice.invoiceNumber}</strong> for <strong>₹${invoice.grandTotal.toLocaleString("en-IN")}</strong>.
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

        sendMail(customer.email, subject, html);
        logger.info(`[Worker] Payment reminder email sent to ${customer.email} for invoice ${invoice.invoiceNumber}`);

        return {
            success: true,
            invoiceNumber: invoice.invoiceNumber,
            email: customer.email,
            urgency,
        };
    },
    {
        connection: createQueueConnection(),
        concurrency: 5,
    }
);

paymentReminderWorker.on("completed", (job, result) => {
    logger.info(`[Worker] Job ${job.id} completed: ${JSON.stringify(result)}`);
});

paymentReminderWorker.on("failed", (job, err) => {
    logger.error(`[Worker] Job ${job.id} failed: ${err.message}`);
});

paymentReminderWorker.on("ready", () => {
    logger.info("[Worker] Payment reminder worker is ready");
});

export default paymentReminderWorker;
