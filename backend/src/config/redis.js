import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let redisClient = null;

export const connectRedis = async () => {
    try {
        const redisUrl = process.env.REDIS_URL;

        // Don't attempt Redis connection if URL not provided
        if (!redisUrl) {
            logger.info('Redis URL not provided, skipping Redis connection');
            return null;
        }

        redisClient = new Redis(redisUrl, {
            retryDelayOnFailover: 100,
            enableReadyCheck: true,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            connectTimeout: 5000,
        });

        redisClient.on('connect', () => {
            logger.info('Connected to Redis');
        });

        redisClient.on('error', (err) => {
            logger.warn('Redis connection error (continuing without Redis):', err.message);
        });

        redisClient.on('close', () => {
            logger.warn('Redis connection closed');
        });

        await redisClient.connect();
        logger.info('Redis connected successfully');
        return redisClient;
    } catch (error) {
        logger.warn('Redis connection failed, continuing without Redis:', error.message);
        redisClient = null;
        return null;
    }
};

export const getRedisClient = () => {
    if (!redisClient) {
        logger.warn('Redis client not available, operations will be skipped');
        return null;
    }
    return redisClient;
};

export { redisClient };

