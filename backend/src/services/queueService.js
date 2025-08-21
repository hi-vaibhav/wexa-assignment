import { Queue, Worker } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { triageTicket } from './agentService.js';

let triageQueue;
let triageWorker;

export const initializeQueues = async () => {
    const redisConnection = getRedisClient();

    if (!redisConnection) {
        logger.warn('Redis not available, queues will not be initialized');
        return;
    }

    // Initialize triage queue
    triageQueue = new Queue('triage', {
        connection: redisConnection,
        defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        },
    });

    // Initialize triage worker
    triageWorker = new Worker('triage',
        async (job) => {
            const { ticketId, traceId } = job.data;
            logger.info(`Processing triage job for ticket ${ticketId}`, { traceId });

            try {
                await triageTicket(ticketId, traceId);
                logger.info(`Triage completed for ticket ${ticketId}`, { traceId });
            } catch (error) {
                logger.error(`Triage failed for ticket ${ticketId}`, { traceId, error: error.message });
                throw error;
            }
        },
        {
            connection: redisConnection,
            concurrency: 5,
        }
    );

    // Event handlers
    triageWorker.on('completed', (job) => {
        logger.info(`Triage job completed: ${job.id}`);
    });

    triageWorker.on('failed', (job, err) => {
        logger.error(`Triage job failed: ${job.id}`, { error: err.message });
    });

    triageWorker.on('error', (err) => {
        logger.error('Triage worker error:', err);
    });

    logger.info('Job queues initialized successfully');
};

export const addTriageJob = async (ticketId, traceId) => {
    if (!triageQueue) {
        logger.info('Redis queue not available, processing ticket synchronously', { ticketId, traceId });
        // Process ticket immediately without queue
        try {
            logger.info(`Starting synchronous triage for ticket ${ticketId}`, { ticketId, traceId });
            await triageTicket(ticketId, traceId);
            logger.info(`✅ Ticket triaged synchronously: ${ticketId}`, { ticketId, traceId });
        } catch (error) {
            logger.error(`❌ Synchronous triage failed for ticket ${ticketId}:`, { error: error.message, ticketId, traceId });
            throw error;
        }
        return;
    }

    const job = await triageQueue.add('process-ticket', {
        ticketId,
        traceId,
    }, {
        jobId: `triage-${ticketId}-${Date.now()}`,
        delay: 1000, // Small delay to ensure ticket is fully saved
    });

    logger.info(`Triage job queued: ${job.id}`, { ticketId, traceId });
    return job;
};

export const getTriageQueue = () => triageQueue;
export const getTriageWorker = () => triageWorker;

// Graceful shutdown
export const shutdownQueues = async () => {
    if (triageWorker) {
        await triageWorker.close();
        logger.info('Triage worker shut down');
    }

    if (triageQueue) {
        await triageQueue.close();
        logger.info('Triage queue shut down');
    }
};
