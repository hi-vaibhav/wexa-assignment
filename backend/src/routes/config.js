import express from 'express';
import { authenticateToken, requireAdmin, requireUser } from '../middleware/auth.js';
import { Config } from '../models/Config.js';
import { logger } from '../utils/logger.js';
import { updateConfigSchema, validate } from '../utils/validation.js';

const router = express.Router();

/**
 * GET /api/config
 * Get system configuration
 */
router.get('/', authenticateToken, requireUser, async (req, res) => {
    try {
        let config = await Config.findOne();

        if (!config) {
            // Create default config if none exists
            config = new Config();
            await config.save();
        }

        // Only return sensitive config to admins
        const publicConfig = {
            slaHours: config.slaHours,
            maxTicketsPerUser: config.maxTicketsPerUser
        };

        if (req.user.role === 'admin') {
            res.json(config);
        } else {
            res.json(publicConfig);
        }
    } catch (error) {
        logger.error('Get config error:', error);
        res.status(500).json({ error: 'Failed to get configuration' });
    }
});

/**
 * PUT /api/config
 * Update system configuration (admin only)
 */
router.put('/', authenticateToken, requireAdmin, validate(updateConfigSchema), async (req, res) => {
    try {
        let config = await Config.findOne();

        if (!config) {
            config = new Config();
        }

        // Update only provided fields
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                if (key === 'categoryThresholds') {
                    // Handle nested object
                    config.categoryThresholds = {
                        ...config.categoryThresholds,
                        ...req.body[key]
                    };
                } else if (key === 'agentSettings') {
                    // Handle nested object
                    config.agentSettings = {
                        ...config.agentSettings,
                        ...req.body[key]
                    };
                } else {
                    config[key] = req.body[key];
                }
            }
        });

        await config.save();

        logger.info('Configuration updated', {
            updatedBy: req.user.id,
            changes: Object.keys(req.body)
        });

        res.json({
            message: 'Configuration updated successfully',
            config
        });
    } catch (error) {
        logger.error('Update config error:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
});

/**
 * GET /api/config/thresholds
 * Get confidence thresholds by category
 */
router.get('/thresholds', authenticateToken, requireUser, async (req, res) => {
    try {
        const config = await Config.findOne();

        const thresholds = config ? {
            global: config.confidenceThreshold,
            categories: config.categoryThresholds,
            autoCloseEnabled: config.autoCloseEnabled
        } : {
            global: 0.78,
            categories: {
                billing: 0.75,
                tech: 0.80,
                shipping: 0.70,
                other: 0.85
            },
            autoCloseEnabled: true
        };

        res.json(thresholds);
    } catch (error) {
        logger.error('Get thresholds error:', error);
        res.status(500).json({ error: 'Failed to get thresholds' });
    }
});

/**
 * PUT /api/config/thresholds
 * Update confidence thresholds (admin only)
 */
router.put('/thresholds', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { global, categories, autoCloseEnabled } = req.body;

        let config = await Config.findOne();
        if (!config) {
            config = new Config();
        }

        if (typeof global === 'number' && global >= 0 && global <= 1) {
            config.confidenceThreshold = global;
        }

        if (typeof autoCloseEnabled === 'boolean') {
            config.autoCloseEnabled = autoCloseEnabled;
        }

        if (categories && typeof categories === 'object') {
            const validCategories = ['billing', 'tech', 'shipping', 'other'];

            validCategories.forEach(category => {
                if (typeof categories[category] === 'number' &&
                    categories[category] >= 0 &&
                    categories[category] <= 1) {
                    config.categoryThresholds[category] = categories[category];
                }
            });
        }

        await config.save();

        logger.info('Thresholds updated', {
            updatedBy: req.user.id,
            global,
            categories,
            autoCloseEnabled
        });

        res.json({
            message: 'Thresholds updated successfully',
            thresholds: {
                global: config.confidenceThreshold,
                categories: config.categoryThresholds,
                autoCloseEnabled: config.autoCloseEnabled
            }
        });
    } catch (error) {
        logger.error('Update thresholds error:', error);
        res.status(500).json({ error: 'Failed to update thresholds' });
    }
});

/**
 * GET /api/config/sla
 * Get SLA configuration
 */
router.get('/sla', authenticateToken, requireUser, async (req, res) => {
    try {
        const config = await Config.findOne();

        const slaConfig = {
            slaHours: config?.slaHours || 24,
            enabled: true
        };

        res.json(slaConfig);
    } catch (error) {
        logger.error('Get SLA config error:', error);
        res.status(500).json({ error: 'Failed to get SLA configuration' });
    }
});

/**
 * PUT /api/config/sla
 * Update SLA configuration (admin only)
 */
router.put('/sla', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { slaHours } = req.body;

        if (typeof slaHours !== 'number' || slaHours < 1 || slaHours > 168) {
            return res.status(400).json({
                error: 'SLA hours must be a number between 1 and 168 (1 week)'
            });
        }

        let config = await Config.findOne();
        if (!config) {
            config = new Config();
        }

        config.slaHours = slaHours;
        await config.save();

        logger.info('SLA configuration updated', {
            updatedBy: req.user.id,
            slaHours
        });

        res.json({
            message: 'SLA configuration updated successfully',
            slaHours: config.slaHours
        });
    } catch (error) {
        logger.error('Update SLA config error:', error);
        res.status(500).json({ error: 'Failed to update SLA configuration' });
    }
});

/**
 * POST /api/config/reset
 * Reset configuration to defaults (admin only)
 */
router.post('/reset', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await Config.deleteMany({});

        const defaultConfig = new Config();
        await defaultConfig.save();

        logger.info('Configuration reset to defaults', {
            resetBy: req.user.id
        });

        res.json({
            message: 'Configuration reset to defaults',
            config: defaultConfig
        });
    } catch (error) {
        logger.error('Reset config error:', error);
        res.status(500).json({ error: 'Failed to reset configuration' });
    }
});

export default router;
