import paymentReminderQueue from "../queues/paymentReminder.queue.js";
import Invoice from "../models/invoice.model.js";
import logger from "../config/logger.config.js";

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function checkDueInvoices() {
    logger.info("[Job] Running due invoice check...");

    const now = new Date();

    const overdueInvoices = await Invoice.find({
        status: { $in: ["sent", "partially_paid"] },
        dueDate: { $exists: true, $lte: now },
    }).populate("customerId organizationId");

    let enqueued = 0;

    for (const invoice of overdueInvoices) {
        const jobId = `reminder-${invoice._id.toString()}`;

        const existingJobs = await paymentReminderQueue.getJobs(["waiting", "active", "delayed"]);
        const alreadyQueued = existingJobs.some((j) => j.data.invoiceId === invoice._id.toString());

        if (alreadyQueued) {
            continue;
        }

        await paymentReminderQueue.add(
            "send-reminder",
            {
                invoiceId: invoice._id.toString(),
                type: "reminder",
            },
            {
                jobId,
                delay: 0,
            }
        );

        enqueued++;
    }

    const upcomingInvoices = await Invoice.find({
        status: { $in: ["sent", "partially_paid"] },
        dueDate: {
            $exists: true,
            $gt: now,
            $lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        },
    }).populate("customerId organizationId");

    for (const invoice of upcomingInvoices) {
        const jobId = `upcoming-${invoice._id.toString()}`;

        const existingJobs = await paymentReminderQueue.getJobs(["waiting", "active", "delayed"]);
        const alreadyQueued = existingJobs.some((j) => j.data.invoiceId === invoice._id.toString());

        if (alreadyQueued) {
            continue;
        }

        await paymentReminderQueue.add(
            "send-reminder",
            {
                invoiceId: invoice._id.toString(),
                type: "reminder",
            },
            {
                jobId,
                delay: 0,
            }
        );

        enqueued++;
    }

    logger.info(`[Job] Due invoice check complete. Enqueued ${enqueued} reminders (${overdueInvoices.length} overdue, ${upcomingInvoices.length} upcoming).`);
    return { overdue: overdueInvoices.length, upcoming: upcomingInvoices.length, enqueued };
}
