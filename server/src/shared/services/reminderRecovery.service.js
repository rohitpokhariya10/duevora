import env from "../config/env.config.js";
import logger from "../config/logger.config.js";
import Reminder from "../models/reminder.model.js";
import reminderQueueService from "./reminderQueue.service.js";

const RECOVERABLE_REMINDER_STATUSES = ["scheduled", "queued"];
const RECOVERABLE_QUEUE_STATUSES = ["pending", "failed"];

class ReminderRecoveryService {
    constructor({
        config = env,
        loggerInstance = logger,
        ReminderModel = Reminder,
        queueService = reminderQueueService,
        setIntervalImpl = setInterval,
        clearIntervalImpl = clearInterval,
    } = {}) {
        this.config = config;
        this.logger = loggerInstance;
        this.ReminderModel = ReminderModel;
        this.queueService = queueService;
        this.setIntervalImpl = setIntervalImpl;
        this.clearIntervalImpl = clearIntervalImpl;
        this.running = false;
        this.timer = null;
    }

    recover = async () => {
        if (this.running) {
            return { skipped: true, scanned: 0, enqueued: 0, failed: 0 };
        }

        this.running = true;

        try {
            // This indexed, bounded query repairs only Mongo records whose queue
            // insertion failed; BullMQ remains the primary scheduler.
            const reminders = await this.ReminderModel.find({
                status: { $in: RECOVERABLE_REMINDER_STATUSES },
                queueStatus: { $in: RECOVERABLE_QUEUE_STATUSES },
                scheduledFor: { $exists: true },
            })
                .sort({ scheduledFor: 1 })
                .limit(this.config.REMINDER_RECOVERY_BATCH_SIZE)
                .select("_id scheduledFor")
                .lean();

            let enqueued = 0;
            let failed = 0;

            for (const reminder of reminders) {
                const reminderId = reminder._id.toString();

                try {
                    await this.queueService.enqueueReminder({
                        reminderId,
                        scheduledFor: reminder.scheduledFor,
                        replaceExisting: false,
                    });
                    enqueued += 1;
                } catch {
                    failed += 1;
                    this.logger.warn({ reminderId }, "Reminder recovery enqueue failed");
                }
            }

            return {
                skipped: false,
                scanned: reminders.length,
                enqueued,
                failed,
            };
        } finally {
            this.running = false;
        }
    };

    start = async () => {
        if (
            this.config.NODE_ENV === "test"
            || !this.config.REMINDER_QUEUE_ENABLED
            || this.timer
        ) {
            return this.timer;
        }

        await this.recover();
        this.timer = this.setIntervalImpl(() => {
            void this.recover().catch(() => {
                this.logger.warn({ status: "failed" }, "Reminder recovery cycle failed");
            });
        }, this.config.REMINDER_RECOVERY_INTERVAL_MS);

        if (typeof this.timer?.unref === "function") this.timer.unref();
        return this.timer;
    };

    stop = () => {
        if (this.timer) this.clearIntervalImpl(this.timer);
        this.timer = null;
    };
}

const reminderRecoveryService = new ReminderRecoveryService();

const recoverReminderQueue = () => reminderRecoveryService.recover();
const startReminderRecovery = () => reminderRecoveryService.start();
const stopReminderRecovery = () => reminderRecoveryService.stop();

export {
    RECOVERABLE_QUEUE_STATUSES,
    RECOVERABLE_REMINDER_STATUSES,
    ReminderRecoveryService,
    recoverReminderQueue,
    startReminderRecovery,
    stopReminderRecovery,
};
export default reminderRecoveryService;
