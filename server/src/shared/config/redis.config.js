import IORedis from "ioredis";
import env from "./env.config.js";
import logger from "./logger.config.js";

const redisConnections = new Set();

function getRedisConnectionOptions() {
    return {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: true,
    };
}

function createRedisConnection(connectionName = "bullmq") {
    const connection = new IORedis(env.REDIS_URL, {
        ...getRedisConnectionOptions(),
        connectionName,
    });

    redisConnections.add(connection);

    connection.on("connect", () => {
        logger.debug({ connectionName }, "Redis connection established");
    });

    connection.on("error", (error) => {
        // Redis URLs and command payloads may contain credentials or PII.
        logger.warn({ connectionName, errorName: error.name }, "Redis connection error");
    });

    connection.on("end", () => {
        redisConnections.delete(connection);
    });

    return connection;
}

async function closeRedisConnection(connection) {
    if (!connection) return;

    redisConnections.delete(connection);

    try {
        if (["ready", "connect", "connecting"].includes(connection.status)) {
            await connection.quit();
        } else {
            connection.disconnect();
        }
    } catch {
        connection.disconnect();
    }
}

async function closeRedisConnections() {
    await Promise.allSettled(
        Array.from(redisConnections, (connection) => closeRedisConnection(connection))
    );
}

export {
    closeRedisConnection,
    closeRedisConnections,
    createRedisConnection,
    getRedisConnectionOptions,
};
