import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
    autoCloseEnabled: {
        type: Boolean,
        default: true
    },
    confidenceThreshold: {
        type: Number,
        default: 0.78,
        min: 0,
        max: 1
    },
    slaHours: {
        type: Number,
        default: 24,
        min: 1,
        max: 168 // 1 week max
    },
    maxTicketsPerUser: {
        type: Number,
        default: 10,
        min: 1
    },
    categoryThresholds: {
        billing: {
            type: Number,
            default: 0.75,
            min: 0,
            max: 1
        },
        tech: {
            type: Number,
            default: 0.80,
            min: 0,
            max: 1
        },
        shipping: {
            type: Number,
            default: 0.70,
            min: 0,
            max: 1
        },
        other: {
            type: Number,
            default: 0.85,
            min: 0,
            max: 1
        }
    },
    agentSettings: {
        maxRetries: {
            type: Number,
            default: 3,
            min: 1,
            max: 5
        },
        timeoutMs: {
            type: Number,
            default: 30000,
            min: 5000,
            max: 120000
        },
        enableFallback: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true
});

export const Config = mongoose.model('Config', configSchema);
