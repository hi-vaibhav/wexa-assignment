import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    ticketId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket',
        required: true
    },
    traceId: {
        type: String,
        required: true
    },
    actor: {
        type: String,
        enum: ['system', 'agent', 'user'],
        required: true
    },
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    action: {
        type: String,
        required: true,
        enum: [
            'TICKET_CREATED',
            'TRIAGE_STARTED',
            'AGENT_CLASSIFIED',
            'KB_RETRIEVED',
            'DRAFT_GENERATED',
            'AUTO_CLOSED',
            'ASSIGNED_TO_HUMAN',
            'REPLY_SENT',
            'STATUS_CHANGED',
            'TICKET_ASSIGNED',
            'TICKET_REOPENED',
            'SUGGESTION_ACCEPTED',
            'SUGGESTION_REJECTED',
            'TRIAGE_FAILED'
        ]
    },
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false // We use our own timestamp field
});

// Indexes for performance
auditLogSchema.index({ ticketId: 1, timestamp: -1 });
auditLogSchema.index({ traceId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
