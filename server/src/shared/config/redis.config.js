import Redis from "ioredis";
import env from "./env.config.js";
import logger from "./logger.config.js";

let connection = null;

function createConnection() {
    if (env.REDIS_URL) {
        return new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            tls: env.REDIS_URL.startsWith("rediss") ? {} : undefined,
        });
    }
    return new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        tls: env.REDIS_HOST?.includes("upstash") || env.REDIS_HOST?.includes("redis-cloud") ? {} : undefined,
    });
}

export function getRedisConnection() {
    if (!connection) {
        connection = createConnection();

        connection.on("error", (err) => {
            logger.error(`[Redis] Connection error: ${err.message}`);
        });

        connection.on("connect", () => {
            logger.info("[Redis] Connected successfully");
        });
    }
    return connection;
}

export function createQueueConnection() {
    return createConnection();
}
