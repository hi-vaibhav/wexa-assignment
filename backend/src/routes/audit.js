import express from 'express';
import { authenticateToken, requireUser } from '../middleware/auth.js';
import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';
import { paginationSchema, validateQuery } from '../utils/validation.js';

const router = express.Router();

/**
 * GET /api/tickets/:ticketId/audit
 * Get audit trail for a specific ticket
 */
router.get('/tickets/:ticketId/audit', authenticateToken, requireUser, validateQuery(paginationSchema), async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { page, limit, sort } = req.query;

        // Check if user has access to this ticket
        const { Ticket } = await import('../models/Ticket.js');
        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Check permissions
        if (req.user.role === 'user' && !ticket.createdBy.equals(req.user.id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get audit logs
        const skip = (page - 1) * limit;

        const [auditLogs, total] = await Promise.all([
            AuditLog.find({ ticketId })
                .populate('actorId', 'name email role')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLog.countDocuments({ ticketId })
        ]);

        res.json({
            ticketId,
            auditLogs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Get audit trail error:', error);
        res.status(500).json({ error: 'Failed to get audit trail' });
    }
});

/**
 * GET /api/audit/trace/:traceId
 * Get all audit logs for a specific trace ID
 */
router.get('/trace/:traceId', authenticateToken, requireUser, async (req, res) => {
    try {
        const { traceId } = req.params;

        const auditLogs = await AuditLog.find({ traceId })
            .populate('actorId', 'name email role')
            .sort({ timestamp: 1 })
            .lean();

        if (auditLogs.length === 0) {
            return res.status(404).json({ error: 'No audit logs found for this trace ID' });
        }

        // Check permissions for the ticket
        const ticketId = auditLogs[0].ticketId;
        const { Ticket } = await import('../models/Ticket.js');
        const ticket = await Ticket.findById(ticketId);

        if (req.user.role === 'user' && ticket && !ticket.createdBy.equals(req.user.id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({
            traceId,
            ticketId,
            auditLogs,
            summary: {
                startTime: auditLogs[0].timestamp,
                endTime: auditLogs[auditLogs.length - 1].timestamp,
                duration: auditLogs[auditLogs.length - 1].timestamp - auditLogs[0].timestamp,
                stepCount: auditLogs.length
            }
        });
    } catch (error) {
        logger.error('Get trace audit error:', error);
        res.status(500).json({ error: 'Failed to get trace audit' });
    }
});

/**
 * GET /api/audit/actions
 * Get audit logs by action type
 */
router.get('/actions', authenticateToken, requireUser, validateQuery(paginationSchema), async (req, res) => {
    try {
        const { page, limit, sort } = req.query;
        const { action, actor, startDate, endDate } = req.query;

        // Build query
        const query = {};

        if (action) {
            query.action = action;
        }

        if (actor) {
            query.actor = actor;
        }

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        // For regular users, only show their own ticket audit logs
        if (req.user.role === 'user') {
            const { Ticket } = await import('../models/Ticket.js');
            const userTickets = await Ticket.find({ createdBy: req.user.id }).select('_id');
            query.ticketId = { $in: userTickets.map(t => t._id) };
        }

        const skip = (page - 1) * limit;

        const [auditLogs, total] = await Promise.all([
            AuditLog.find(query)
                .populate('actorId', 'name email role')
                .populate('ticketId', 'title status')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLog.countDocuments(query)
        ]);

        res.json({
            auditLogs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            filters: {
                action,
                actor,
                startDate,
                endDate
            }
        });
    } catch (error) {
        logger.error('Get audit actions error:', error);
        res.status(500).json({ error: 'Failed to get audit actions' });
    }
});

/**
 * GET /api/audit/stats
 * Get audit statistics
 */
router.get('/stats', authenticateToken, requireUser, async (req, res) => {
    try {
        const { timeframe = '7d' } = req.query;

        // Calculate date range
        const now = new Date();
        const days = timeframe === '30d' ? 30 : timeframe === '1d' ? 1 : 7;
        const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

        let matchStage = { timestamp: { $gte: startDate } };

        // For regular users, only show their own ticket audit logs
        if (req.user.role === 'user') {
            const { Ticket } = await import('../models/Ticket.js');
            const userTickets = await Ticket.find({ createdBy: req.user.id }).select('_id');
            matchStage.ticketId = { $in: userTickets.map(t => t._id) };
        }

        const [
            actionCounts,
            actorCounts,
            dailyActivity,
            totalEvents
        ] = await Promise.all([
            // Action type breakdown
            AuditLog.aggregate([
                { $match: matchStage },
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),

            // Actor type breakdown
            AuditLog.aggregate([
                { $match: matchStage },
                { $group: { _id: '$actor', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),

            // Daily activity
            AuditLog.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),

            // Total events count
            AuditLog.countDocuments(matchStage)
        ]);

        const stats = {
            timeframe,
            period: {
                start: startDate,
                end: now
            },
            total: totalEvents,
            byAction: actionCounts.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byActor: actorCounts.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            dailyActivity: dailyActivity.map(item => ({
                date: item._id,
                count: item.count
            }))
        };

        res.json(stats);
    } catch (error) {
        logger.error('Get audit stats error:', error);
        res.status(500).json({ error: 'Failed to get audit statistics' });
    }
});

/**
 * GET /api/audit/export
 * Export audit logs as NDJSON
 */
router.get('/export', authenticateToken, requireUser, async (req, res) => {
    try {
        const { startDate, endDate, format = 'ndjson' } = req.query;

        // Build query
        const query = {};
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        // For regular users, only export their own ticket audit logs
        if (req.user.role === 'user') {
            const { Ticket } = await import('../models/Ticket.js');
            const userTickets = await Ticket.find({ createdBy: req.user.id }).select('_id');
            query.ticketId = { $in: userTickets.map(t => t._id) };
        }

        const auditLogs = await AuditLog.find(query)
            .populate('actorId', 'name email role')
            .populate('ticketId', 'title status')
            .sort({ timestamp: 1 })
            .lean();

        if (format === 'ndjson') {
            res.setHeader('Content-Type', 'application/x-ndjson');
            res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.ndjson"`);

            auditLogs.forEach(log => {
                res.write(JSON.stringify(log) + '\n');
            });
            res.end();
        } else {
            res.json(auditLogs);
        }

        logger.info('Audit logs exported', {
            userId: req.user.id,
            count: auditLogs.length,
            format,
            startDate,
            endDate
        });
    } catch (error) {
        logger.error('Export audit logs error:', error);
        res.status(500).json({ error: 'Failed to export audit logs' });
    }
});

export default router;
