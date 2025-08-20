import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 5000
    },
    isInternal: {
        type: Boolean,
        default: false
    },
    attachments: [{
        url: String,
        filename: String,
        contentType: String
    }]
}, {
    timestamps: true
});

const ticketSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 5000
    },
    category: {
        type: String,
        enum: ['billing', 'tech', 'shipping', 'other'],
        default: 'other'
    },
    status: {
        type: String,
        enum: ['open', 'triaged', 'waiting_human', 'resolved', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    agentSuggestionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AgentSuggestion'
    },
    replies: [replySchema],
    attachments: [{
        url: String,
        filename: String,
        contentType: String
    }],
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    slaBreached: {
        type: Boolean,
        default: false
    },
    slaDeadline: {
        type: Date
    },
    resolvedAt: {
        type: Date
    },
    closedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for performance
ticketSchema.index({ status: 1 });
ticketSchema.index({ category: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ assignee: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ updatedAt: -1 });
ticketSchema.index({ slaDeadline: 1 });

// Text search index
ticketSchema.index({
    title: 'text',
    description: 'text'
});

export const Ticket = mongoose.model('Ticket', ticketSchema);
