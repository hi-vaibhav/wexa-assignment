import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireAgent } from '../middleware/auth.js';
import agentService from '../services/agentService.js';
import { addTriageJob } from '../services/queueService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/agent/triage
 * Manually trigger triage for a ticket
 */
router.post('/triage', authenticateToken, requireAgent, async (req, res) => {
    try {
        const { ticketId } = req.body;

        if (!ticketId) {
            return res.status(400).json({ error: 'Ticket ID is required' });
        }

        const traceId = uuidv4();

        // Add to queue for processing
        const job = await addTriageJob(ticketId, traceId);

        logger.info(`Manual triage triggered for ticket ${ticketId}`, {
            ticketId,
            traceId,
            triggeredBy: req.user._id
        });

        res.json({
            message: 'Triage job queued successfully',
            jobId: job?.id || 'sync-processing',
            traceId
        });
    } catch (error) {
        logger.error('Manual triage trigger error:', error);
        res.status(500).json({ error: 'Failed to trigger triage' });
    }
});

/**
 * GET /api/agent/suggestion/:ticketId
 * Get AI suggestion for a ticket
 */
router.get('/suggestion/:ticketId', authenticateToken, requireAgent, async (req, res) => {
    try {
        const { ticketId } = req.params;

        const suggestion = await agentService.getSuggestion(ticketId);

        if (!suggestion) {
            return res.status(404).json({ error: 'No suggestion found for this ticket' });
        }

        res.json({
            suggestion
        });
    } catch (error) {
        logger.error('Get suggestion error:', error);
        res.status(500).json({ error: 'Failed to get suggestion' });
    }
});

/**
 * POST /api/agent/suggestion/:id/accept
 * Accept an AI suggestion
 */
router.post('/suggestion/:id/accept', authenticateToken, requireAgent, async (req, res) => {
    try {
        const { id } = req.params;

        const suggestion = await agentService.acceptSuggestion(id, req.user._id);

        logger.info(`Suggestion ${id} accepted`, {
            suggestionId: id,
            agentId: req.user._id
        });

        res.json({
            message: 'Suggestion accepted successfully',
            suggestion
        });
    } catch (error) {
        logger.error('Accept suggestion error:', error);
        if (error.message === 'Suggestion not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to accept suggestion' });
    }
});

/**
 * POST /api/agent/suggestion/:id/reject
 * Reject an AI suggestion
 */
router.post('/suggestion/:id/reject', authenticateToken, requireAgent, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const suggestion = await agentService.rejectSuggestion(id, req.user._id, reason);

        logger.info(`Suggestion ${id} rejected`, {
            suggestionId: id,
            agentId: req.user._id,
            reason
        });

        res.json({
            message: 'Suggestion rejected successfully',
            suggestion
        });
    } catch (error) {
        logger.error('Reject suggestion error:', error);
        if (error.message === 'Suggestion not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to reject suggestion' });
    }
});

/**
 * GET /api/agent/stats
 * Get agent performance statistics
 */
router.get('/stats', authenticateToken, requireAgent, async (req, res) => {
    try {
        const { timeframe = '7d' } = req.query;

        // Calculate date range
        const now = new Date();
        const days = timeframe === '30d' ? 30 : timeframe === '1d' ? 1 : 7;
        const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

        // Import models here to avoid circular dependency
        const { AgentSuggestion } = await import('../models/AgentSuggestion.js');
        const { Ticket } = await import('../models/Ticket.js');
        const { AuditLog } = await import('../models/AuditLog.js');

        // Get statistics
        const [
            totalSuggestions,
            acceptedSuggestions,
            autoClosedTickets,
            avgConfidence,
            ticketsTriaged,
            avgResponseTime
        ] = await Promise.all([
            AgentSuggestion.countDocuments({
                createdAt: { $gte: startDate }
            }),
            AgentSuggestion.countDocuments({
                createdAt: { $gte: startDate },
                accepted: true
            }),
            AgentSuggestion.countDocuments({
                createdAt: { $gte: startDate },
                autoClosed: true
            }),
            AgentSuggestion.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $group: { _id: null, avgConfidence: { $avg: '$confidence' } } }
            ]),
            Ticket.countDocuments({
                status: { $in: ['triaged', 'waiting_human', 'resolved', 'closed'] },
                updatedAt: { $gte: startDate }
            }),
            AuditLog.aggregate([
                {
                    $match: {
                        action: 'REPLY_SENT',
                        timestamp: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgResponseTime: { $avg: { $subtract: ['$timestamp', '$createdAt'] } }
                    }
                }
            ])
        ]);

        const stats = {
            timeframe,
            period: {
                start: startDate,
                end: now
            },
            suggestions: {
                total: totalSuggestions,
                accepted: acceptedSuggestions,
                acceptanceRate: totalSuggestions > 0 ? (acceptedSuggestions / totalSuggestions) : 0,
                autoClosed: autoClosedTickets,
                autoCloseRate: totalSuggestions > 0 ? (autoClosedTickets / totalSuggestions) : 0
            },
            confidence: {
                average: avgConfidence[0]?.avgConfidence || 0
            },
            tickets: {
                triaged: ticketsTriaged
            },
            performance: {
                avgResponseTimeHours: avgResponseTime[0]?.avgResponseTime ?
                    avgResponseTime[0].avgResponseTime / (1000 * 60 * 60) : 0
            }
        };

        res.json(stats);
    } catch (error) {
        logger.error('Get agent stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

export default router;
