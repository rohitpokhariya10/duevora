import { Queue } from "bullmq";
import { createQueueConnection } from "../config/redis.config.js";

const invoiceAutomationQueue = new Queue("invoice-automation", {
    connection: createQueueConnection(),
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
    },
});

export default invoiceAutomationQueue;
