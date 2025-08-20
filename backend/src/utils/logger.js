import winston from 'winston';

const { combine, timestamp, json, printf, colorize, errors } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta)}`;
    }

    if (stack) {
        logMessage += `\n${stack}`;
    }

    return logMessage;
});

// Production format (JSON)
const prodFormat = combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
);

// Development format (readable)
const developmentFormat = combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize(),
    errors({ stack: true }),
    devFormat
);

// Create logger
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? prodFormat : developmentFormat,
    defaultMeta: { service: 'helpdesk-api' },
    transports: [
        new winston.transports.Console({
            handleExceptions: true,
            handleRejections: true
        })
    ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        handleExceptions: true
    }));

    logger.add(new winston.transports.File({
        filename: 'logs/combined.log',
        handleExceptions: true
    }));
}

// Stream for morgan middleware
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

export default logger;
