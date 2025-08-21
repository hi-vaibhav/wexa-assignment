import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import 'express-async-errors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Load environment variables first
dotenv.config();

// Debug environment variables
logger.info('Environment variables loaded:', {
    NODE_ENV: process.env.NODE_ENV,
    STUB_MODE: process.env.STUB_MODE,
    LLM_PROVIDER: process.env.LLM_PROVIDER
});

import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { initializeQueues } from './services/queueService.js';
import { logger } from './utils/logger.js';

// Import routes
import agentRoutes from './routes/agent.js';
import analyticsRoutes from './routes/analytics.js';
import auditRoutes from './routes/audit.js';
import authRoutes from './routes/auth.js';
import configRoutes from './routes/config.js';
import kbRoutes from './routes/kb.js';
import ticketRoutes from './routes/tickets.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // temporarily increased for debugging 
    message: 'Too many authentication attempts, please try again later.'
});

app.use('/api/auth', authLimiter);
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(requestLogger);

// Health check endpoints
app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/readyz', async (req, res) => {
    try {
        // Check database connection
        const mongoose = await import('mongoose');
        if (mongoose.connection.readyState !== 1) {
            throw new Error('Database not ready');
        }

        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (error) {
        logger.error('Readiness check failed:', error);
        res.status(503).json({
            status: 'not ready',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/kb', kbRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/config', configRoutes);
app.use('/api/audit', auditRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
async function startServer() {
    try {
        // Connect to database
        await connectDB();
        logger.info('Connected to MongoDB');

        // Connect to Redis (optional)
        const redisClient = await connectRedis();
        if (redisClient) {
            logger.info('Connected to Redis');
            // Initialize queues only if Redis is available
            await initializeQueues();
            logger.info('Initialized job queues');
        } else {
            logger.warn('Running without Redis - queues will be disabled');
        }

        // Start server
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`Stub Mode: ${process.env.STUB_MODE === 'true' ? 'enabled' : 'disabled'}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

if (process.env.NODE_ENV !== 'test') {
    startServer();
}

export default app;
