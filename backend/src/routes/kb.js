import express from 'express';
import { authenticateToken, requireAdmin, requireUser } from '../middleware/auth.js';
import { Article } from '../models/Article.js';
import kbService from '../services/kbService.js';
import { logger } from '../utils/logger.js';
import {
    createArticleSchema,
    kbQuerySchema,
    updateArticleSchema,
    validate,
    validateQuery
} from '../utils/validation.js';

const router = express.Router();

/**
 * GET /api/kb
 * Search knowledge base articles
 */
router.get('/', validateQuery(kbQuerySchema), async (req, res) => {
    try {
        const { page, limit, sort, search, status, tags } = req.query;

        // Build query
        const query = {};

        // Only show published articles to non-admin users
        if (!req.user || req.user.role !== 'admin') {
            query.status = 'published';
        } else if (status) {
            query.status = status;
        }

        // Add tag filter
        if (tags) {
            query.tags = { $in: tags.split(',').map(tag => tag.trim().toLowerCase()) };
        }

        // Add text search
        if (search) {
            // Use the knowledge base service for better search
            const articles = await kbService.searchArticles(search, {
                limit: limit * page, // Get enough for pagination
                status: query.status
            });

            // Apply pagination to search results
            const startIndex = (page - 1) * limit;
            const paginatedArticles = articles.slice(startIndex, startIndex + limit);

            return res.json({
                articles: paginatedArticles,
                pagination: {
                    page,
                    limit,
                    total: articles.length,
                    pages: Math.ceil(articles.length / limit)
                }
            });
        }

        // Regular query without search
        const skip = (page - 1) * limit;

        const [articles, total] = await Promise.all([
            Article.find(query)
                .populate('author', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Article.countDocuments(query)
        ]);

        res.json({
            articles,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('KB search error:', error);
        res.status(500).json({ error: 'Failed to search knowledge base' });
    }
});

/**
 * GET /api/kb/:id
 * Get a specific article
 */
router.get('/:id', async (req, res) => {
    try {
        const article = await kbService.getArticle(req.params.id, true); // Track view

        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        // Check permissions
        if (article.status !== 'published' &&
            (!req.user || req.user.role !== 'admin')) {
            return res.status(404).json({ error: 'Article not found' });
        }

        await article.populate('author', 'name email');
        res.json(article);
    } catch (error) {
        logger.error('Get article error:', error);
        res.status(500).json({ error: 'Failed to get article' });
    }
});

/**
 * POST /api/kb
 * Create a new article (admin only)
 */
router.post('/', authenticateToken, requireAdmin, validate(createArticleSchema), async (req, res) => {
    try {
        const { title, body, tags, status } = req.body;

        const article = new Article({
            title,
            body,
            tags: tags || [],
            status: status || 'draft',
            author: req.user._id
        });

        await article.save();
        await article.populate('author', 'name email');

        logger.info(`Article created: ${title}`, {
            articleId: article._id,
            authorId: req.user._id
        });

        res.status(201).json({
            message: 'Article created successfully',
            article
        });
    } catch (error) {
        logger.error('Create article error:', error);
        res.status(500).json({ error: 'Failed to create article' });
    }
});

/**
 * PUT /api/kb/:id
 * Update an article (admin only)
 */
router.put('/:id', authenticateToken, requireAdmin, validate(updateArticleSchema), async (req, res) => {
    try {
        const updateData = { ...req.body };

        // Convert tags to lowercase
        if (updateData.tags) {
            updateData.tags = updateData.tags.map(tag => tag.toLowerCase());
        }

        const article = await Article.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('author', 'name email');

        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        logger.info(`Article updated: ${article.title}`, {
            articleId: article._id,
            updatedBy: req.user._id
        });

        res.json({
            message: 'Article updated successfully',
            article
        });
    } catch (error) {
        logger.error('Update article error:', error);
        res.status(500).json({ error: 'Failed to update article' });
    }
});

/**
 * DELETE /api/kb/:id
 * Delete an article (admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const article = await Article.findByIdAndDelete(req.params.id);

        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        logger.info(`Article deleted: ${article.title}`, {
            articleId: article._id,
            deletedBy: req.user._id
        });

        res.json({ message: 'Article deleted successfully' });
    } catch (error) {
        logger.error('Delete article error:', error);
        res.status(500).json({ error: 'Failed to delete article' });
    }
});

/**
 * POST /api/kb/:id/feedback
 * Add feedback to an article
 */
router.post('/:id/feedback', authenticateToken, async (req, res) => {
    try {
        const { helpful } = req.body;

        if (typeof helpful !== 'boolean') {
            return res.status(400).json({ error: 'Helpful must be a boolean value' });
        }

        const updateField = helpful ? 'helpful' : 'notHelpful';

        const article = await Article.findByIdAndUpdate(
            req.params.id,
            { $inc: { [updateField]: 1 } },
            { new: true }
        );

        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        logger.info(`Article feedback: ${helpful ? 'helpful' : 'not helpful'}`, {
            articleId: article._id,
            userId: req.user._id
        });

        res.json({
            message: 'Feedback recorded',
            helpful: article.helpful,
            notHelpful: article.notHelpful
        });
    } catch (error) {
        logger.error('Article feedback error:', error);
        res.status(500).json({ error: 'Failed to record feedback' });
    }
});

export default router;
