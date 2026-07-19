import { jest } from "@jest/globals";
import { ReminderRecoveryService } from "../reminderRecovery.service.js";

function createQuery(reminders) {
    const query = {
        sort: jest.fn(() => query),
        limit: jest.fn(() => query),
        select: jest.fn(() => query),
        lean: jest.fn().mockResolvedValue(reminders),
    };
    return query;
}

describe("ReminderRecoveryService", () => {
    const config = {
        NODE_ENV: "development",
        REMINDER_QUEUE_ENABLED: true,
        REMINDER_RECOVERY_BATCH_SIZE: 2,
        REMINDER_RECOVERY_INTERVAL_MS: 60000,
    };

    it("loads a bounded indexed batch and re-enqueues without replacement", async () => {
        const reminders = [
            { _id: "reminder-1", scheduledFor: new Date("2026-07-20T10:00:00Z") },
            { _id: "reminder-2", scheduledFor: new Date("2026-07-21T10:00:00Z") },
        ];
        const query = createQuery(reminders);
        const ReminderModel = { find: jest.fn(() => query) };
        const queueService = { enqueueReminder: jest.fn().mockResolvedValue({}) };
        const service = new ReminderRecoveryService({
            config,
            ReminderModel,
            queueService,
            loggerInstance: { warn: jest.fn() },
        });

        const result = await service.recover();

        expect(ReminderModel.find).toHaveBeenCalledWith({
            status: { $in: ["scheduled", "queued"] },
            queueStatus: { $in: ["pending", "failed"] },
            scheduledFor: { $exists: true },
        });
        expect(query.sort).toHaveBeenCalledWith({ scheduledFor: 1 });
        expect(query.limit).toHaveBeenCalledWith(2);
        expect(queueService.enqueueReminder).toHaveBeenNthCalledWith(1, {
            reminderId: "reminder-1",
            scheduledFor: reminders[0].scheduledFor,
            replaceExisting: false,
        });
        expect(result).toEqual({ skipped: false, scanned: 2, enqueued: 2, failed: 0 });
    });

    it("prevents overlapping recovery runs", async () => {
        let release;
        const pending = new Promise((resolve) => { release = resolve; });
        const query = createQuery([{ _id: "reminder-1", scheduledFor: new Date() }]);
        const service = new ReminderRecoveryService({
            config,
            ReminderModel: { find: jest.fn(() => query) },
            queueService: { enqueueReminder: jest.fn(() => pending) },
            loggerInstance: { warn: jest.fn() },
        });

        const firstRun = service.recover();
        await Promise.resolve();
        const overlapping = await service.recover();
        release({});
        await firstRun;

        expect(overlapping).toEqual({ skipped: true, scanned: 0, enqueued: 0, failed: 0 });
    });

    it("never starts an interval in the test environment", async () => {
        const setIntervalImpl = jest.fn();
        const service = new ReminderRecoveryService({
            config: { ...config, NODE_ENV: "test" },
            ReminderModel: { find: jest.fn() },
            queueService: { enqueueReminder: jest.fn() },
            loggerInstance: { warn: jest.fn() },
            setIntervalImpl,
        });

        await expect(service.start()).resolves.toBeNull();
        expect(setIntervalImpl).not.toHaveBeenCalled();
    });
});
