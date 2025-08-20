import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireAgent, requireUser } from '../middleware/auth.js';
import { AuditLog } from '../models/AuditLog.js';
import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import agentService from '../services/agentService.js';
import { addTriageJob } from '../services/queueService.js';
import { logger } from '../utils/logger.js';
import {
    assignTicketSchema,
    createTicketSchema,
    replySchema,
    ticketQuerySchema,
    validate,
    validateQuery
} from '../utils/validation.js';

const router = express.Router();

/**
 * GET /api/tickets
 * List tickets with filtering and pagination
 */
router.get('/', authenticateToken, requireUser, validateQuery(ticketQuerySchema), async (req, res) => {
    try {
        const { page, limit, sort, search, status, category, assignee, createdBy, my } = req.query;

        // Build query based on user role and filters
        const query = {};

        // Role-based filtering
        if (req.user.role === 'user') {
            query.createdBy = req.user.id;
        } else if (my && (req.user.role === 'agent' || req.user.role === 'admin')) {
            query.assignee = req.user.id;
        }

        // Apply filters
        if (status) query.status = status;
        if (category) query.category = category;
        if (assignee) query.assignee = assignee;
        if (createdBy && req.user.role !== 'user') query.createdBy = createdBy;

        // Text search
        if (search) {
            query.$text = { $search: search };
        }

        // Pagination
        const skip = (page - 1) * limit;

        const [tickets, total] = await Promise.all([
            Ticket.find(query)
                .populate('createdBy', 'name email')
                .populate('assignee', 'name email')
                .populate('agentSuggestionId')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Ticket.countDocuments(query)
        ]);

        res.json({
            tickets,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('List tickets error:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

/**
 * GET /api/tickets/:id
 * Get a specific ticket with full details
 */
router.get('/:id', authenticateToken, requireUser, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate('createdBy', 'name email role')
            .populate('assignee', 'name email role')
            .populate('agentSuggestionId')
            .populate('replies.author', 'name email role');

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Check permissions
        if (req.user.role === 'user' && !ticket.createdBy._id.equals(req.user.id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(ticket);
    } catch (error) {
        logger.error('Get ticket error:', error);
        res.status(500).json({ error: 'Failed to get ticket' });
    }
});

/**
 * POST /api/tickets
 * Create a new ticket
 */
router.post('/', authenticateToken, requireUser, validate(createTicketSchema), async (req, res) => {
    try {
        const { title, description, category, attachments } = req.body;

        const ticket = new Ticket({
            title,
            description,
            category: category || 'other',
            createdBy: req.user.id,
            attachments: attachments || []
        });

        await ticket.save();
        await ticket.populate('createdBy', 'name email');

        // Generate trace ID for this ticket's workflow
        const traceId = uuidv4();

        // Log ticket creation
        const auditLog = new AuditLog({
            ticketId: ticket._id,
            traceId,
            actor: 'user',
            actorId: req.user.id,
            action: 'TICKET_CREATED',
            meta: {
                title: ticket.title,
                category: ticket.category
            }
        });
        await auditLog.save();

        // Queue for triage
        await addTriageJob(ticket._id.toString(), traceId);

        logger.info(`Ticket created: ${title}`, {
            ticketId: ticket._id,
            userId: req.user.id,
            traceId
        });

        res.status(201).json({
            message: 'Ticket created successfully',
            ticket,
            traceId
        });
    } catch (error) {
        logger.error('Create ticket error:', error);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});

/**
 * POST /api/tickets/:id/reply
 * Add a reply to a ticket
 */
router.post('/:id/reply', authenticateToken, requireAgent, validate(replySchema), async (req, res) => {
    try {
        const { content, isInternal } = req.body;

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Add reply
        const reply = {
            author: req.user.id,
            content,
            isInternal: isInternal || false
        };

        ticket.replies.push(reply);

        // Update ticket status if it was resolved/closed
        if (ticket.status === 'resolved' || ticket.status === 'closed') {
            ticket.status = 'waiting_human';
        }

        await ticket.save();
        await ticket.populate('replies.author', 'name email role');

        // Log the reply
        const traceId = uuidv4();
        const auditLog = new AuditLog({
            ticketId: ticket._id,
            traceId,
            actor: 'agent',
            actorId: req.user.id,
            action: 'REPLY_SENT',
            meta: {
                isInternal,
                replyLength: content.length
            }
        });
        await auditLog.save();

        logger.info(`Reply added to ticket ${ticket._id}`, {
            ticketId: ticket._id,
            agentId: req.user.id,
            isInternal
        });

        res.json({
            message: 'Reply added successfully',
            reply: ticket.replies[ticket.replies.length - 1]
        });
    } catch (error) {
        logger.error('Add reply error:', error);
        res.status(500).json({ error: 'Failed to add reply' });
    }
});

/**
 * POST /api/tickets/:id/assign
 * Assign ticket to an agent
 */
router.post('/:id/assign', authenticateToken, requireAgent, validate(assignTicketSchema), async (req, res) => {
    try {
        const { assigneeId } = req.body;

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Validate assignee
        if (assigneeId) {
            const assignee = await User.findById(assigneeId);
            if (!assignee || !['agent', 'admin'].includes(assignee.role)) {
                return res.status(400).json({ error: 'Invalid assignee' });
            }
            ticket.assignee = assigneeId;
        } else {
            ticket.assignee = undefined;
        }

        // Update status if needed
        if (ticket.status === 'open') {
            ticket.status = 'triaged';
        }

        await ticket.save();
        await ticket.populate('assignee', 'name email');

        // Log the assignment
        const traceId = uuidv4();
        const auditLog = new AuditLog({
            ticketId: ticket._id,
            traceId,
            actor: 'agent',
            actorId: req.user.id,
            action: 'TICKET_ASSIGNED',
            meta: {
                assigneeId: assigneeId || null,
                assigneeName: ticket.assignee?.name || 'Unassigned',
                assignedBy: req.user.name
            }
        });
        await auditLog.save();

        logger.info(`Ticket ${ticket._id} assigned`, {
            ticketId: ticket._id,
            assigneeId,
            assignedBy: req.user.id
        });

        res.json({
            message: 'Ticket assigned successfully',
            ticket: {
                id: ticket._id,
                assignee: ticket.assignee,
                status: ticket.status
            }
        });
    } catch (error) {
        logger.error('Assign ticket error:', error);
        res.status(500).json({ error: 'Failed to assign ticket' });
    }
});

/**
 * PATCH /api/tickets/:id/status
 * Update ticket status
 */
router.patch('/:id/status', authenticateToken, requireAgent, async (req, res) => {
    try {
        const { status } = req.body;

        const validStatuses = ['open', 'triaged', 'waiting_human', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                validStatuses
            });
        }

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const oldStatus = ticket.status;
        ticket.status = status;

        // Set timestamps for status changes
        if (status === 'resolved') {
            ticket.resolvedAt = new Date();
        } else if (status === 'closed') {
            ticket.closedAt = new Date();
        }

        await ticket.save();

        // Log status change
        const traceId = uuidv4();
        const auditLog = new AuditLog({
            ticketId: ticket._id,
            traceId,
            actor: 'agent',
            actorId: req.user.id,
            action: 'STATUS_CHANGED',
            meta: {
                oldStatus,
                newStatus: status,
                changedBy: req.user.name
            }
        });
        await auditLog.save();

        logger.info(`Ticket ${ticket._id} status changed: ${oldStatus} → ${status}`, {
            ticketId: ticket._id,
            agentId: req.user.id
        });

        res.json({
            message: 'Status updated successfully',
            ticket: {
                id: ticket._id,
                status: ticket.status,
                resolvedAt: ticket.resolvedAt,
                closedAt: ticket.closedAt
            }
        });
    } catch (error) {
        logger.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

/**
 * POST /api/tickets/:id/reopen
 * Reopen a closed/resolved ticket
 */
router.post('/:id/reopen', authenticateToken, requireUser, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Check permissions
        if (req.user.role === 'user' && !ticket.createdBy.equals(req.user.id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!['resolved', 'closed'].includes(ticket.status)) {
            return res.status(400).json({ error: 'Ticket is not closed or resolved' });
        }

        ticket.status = 'waiting_human';
        ticket.resolvedAt = undefined;
        ticket.closedAt = undefined;
        await ticket.save();

        // Log reopening
        const traceId = uuidv4();
        const auditLog = new AuditLog({
            ticketId: ticket._id,
            traceId,
            actor: req.user.role === 'user' ? 'user' : 'agent',
            actorId: req.user.id,
            action: 'TICKET_REOPENED',
            meta: {
                reopenedBy: req.user.name,
                reason: req.body.reason || 'No reason provided'
            }
        });
        await auditLog.save();

        logger.info(`Ticket ${ticket._id} reopened`, {
            ticketId: ticket._id,
            userId: req.user.id
        });

        res.json({
            message: 'Ticket reopened successfully',
            ticket: {
                id: ticket._id,
                status: ticket.status
            }
        });
    } catch (error) {
        logger.error('Reopen ticket error:', error);
        res.status(500).json({ error: 'Failed to reopen ticket' });
    }
});

export default router;
