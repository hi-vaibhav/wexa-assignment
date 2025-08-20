import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/analytics/dashboard
 * Get dashboard statistics
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        // Import models here to avoid circular dependency
        const { Ticket } = await import('../models/Ticket.js');
        const { Article } = await import('../models/Article.js');

        // Calculate date range for analytics (last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        // Get ticket statistics
        const [
            totalTickets,
            openTickets,
            resolvedTickets,
            avgResolutionTime,
            categoryStats
        ] = await Promise.all([
            // Total tickets
            Ticket.countDocuments({}),

            // Open tickets
            Ticket.countDocuments({
                status: { $in: ['open', 'waiting_human', 'triaged'] }
            }),

            // Resolved tickets
            Ticket.countDocuments({
                status: { $in: ['resolved', 'closed'] }
            }),

            // Average resolution time
            Ticket.aggregate([
                {
                    $match: {
                        status: { $in: ['resolved', 'closed'] },
                        resolvedAt: { $exists: true }
                    }
                },
                {
                    $addFields: {
                        resolutionTime: {
                            $subtract: ['$resolvedAt', '$createdAt']
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgTime: { $avg: '$resolutionTime' }
                    }
                }
            ]),

            // Top categories
            Ticket.aggregate([
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { count: -1 }
                },
                {
                    $limit: 5
                },
                {
                    $project: {
                        category: '$_id',
                        count: 1,
                        _id: 0
                    }
                }
            ])
        ]);

        // Format average resolution time
        const avgTimeMs = avgResolutionTime[0]?.avgTime || 0;
        const avgTimeHours = Math.round(avgTimeMs / (1000 * 60 * 60));
        const averageResolutionTime = avgTimeHours > 24
            ? `${Math.round(avgTimeHours / 24)} days`
            : `${avgTimeHours} hours`;

        const stats = {
            totalTickets,
            openTickets,
            resolvedTickets,
            averageResolutionTime,
            topCategories: categoryStats
        };

        logger.info(`Dashboard stats fetched for user ${req.user.id}`, {
            userId: req.user.id,
            totalTickets,
            openTickets
        });

        res.json(stats);
    } catch (error) {
        logger.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

/**
 * GET /api/analytics/tickets
 * Get detailed ticket analytics
 */
router.get('/tickets', authenticateToken, async (req, res) => {
    try {
        const { timeframe = '30d' } = req.query;

        // Calculate date range
        const now = new Date();
        const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30;
        const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

        const { Ticket } = await import('../models/Ticket.js');

        // Daily ticket creation stats
        const dailyStats = await Ticket.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt'
                        }
                    },
                    created: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);

        // Status distribution
        const statusStats = await Ticket.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Category distribution
        const categoryStats = await Ticket.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        res.json({
            timeframe,
            period: {
                start: startDate,
                end: now
            },
            dailyStats,
            statusDistribution: statusStats,
            categoryDistribution: categoryStats
        });
    } catch (error) {
        logger.error('Ticket analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch ticket analytics' });
    }
});

export default router;
