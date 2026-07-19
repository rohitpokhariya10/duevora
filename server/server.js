// Trigger restart after fixing Redis URI in env
import createApp from "./src/app.js";
import connectDB from "./src/shared/config/db.config.js";
import logger from "./src/shared/config/logger.config.js";
import env from "./src/shared/config/env.config.js";
import seedPermissions from "./src/shared/seeds/permission.seed.js";
import paymentReminderWorker from "./src/shared/workers/paymentReminder.worker.js";
import { checkDueInvoices } from "./src/shared/jobs/checkDueInvoices.js";
import paymentReminderQueue from "./src/shared/queues/paymentReminder.queue.js";

async function startServer() {
    const app = createApp();

    await connectDB();
    await seedPermissions();

    paymentReminderWorker.on("ready", () => {
        logger.info("[Server] Payment reminder worker is listening for jobs");
    });

    const DUE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

    setTimeout(async () => {
        try {
            await checkDueInvoices();
        } catch (err) {
            logger.error(`[Server] Initial due invoice check failed: ${err.message}`);
        }
    }, 10_000);

    setInterval(async () => {
        try {
            await checkDueInvoices();
        } catch (err) {
            logger.error(`[Server] Scheduled due invoice check failed: ${err.message}`);
        }
    }, DUE_CHECK_INTERVAL_MS);

    logger.info(`[Server] Due invoice checker scheduled every ${DUE_CHECK_INTERVAL_MS / 1000}s`);

    app.listen(env.PORT, () => {
        logger.info(`Server is running on port ${env.PORT}`);
    });
}

startServer();
