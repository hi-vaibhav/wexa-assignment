import { Article } from '../models/Article.js';
import { logger } from '../utils/logger.js';

/**
 * Knowledge Base Service
 * Handles searching and retrieving relevant articles
 */
class KnowledgeBaseService {
    /**
     * Search articles using multiple strategies
     */
    async searchArticles(query, options = {}) {
        const {
            limit = 3,
            category = null,
            status = 'published'
        } = options;

        try {
            // First try text search
            let articles = await this._textSearch(query, { limit, status, category });

            // If not enough results, try keyword search
            if (articles.length < limit) {
                const keywordResults = await this._keywordSearch(query, {
                    limit: limit - articles.length,
                    status,
                    category
                });

                // Merge results, avoiding duplicates
                const existingIds = new Set(articles.map(a => a._id.toString()));
                const uniqueKeywordResults = keywordResults.filter(
                    a => !existingIds.has(a._id.toString())
                );

                articles = [...articles, ...uniqueKeywordResults];
            }

            // Score and rank results
            const scoredArticles = this._scoreArticles(articles, query);

            logger.info(`Found ${scoredArticles.length} relevant articles for query: "${query}"`);

            return scoredArticles.slice(0, limit);
        } catch (error) {
            logger.error('Article search failed:', error);
            throw new Error('Knowledge base search unavailable');
        }
    }

    /**
     * MongoDB text search
     */
    async _textSearch(query, { limit, status, category }) {
        const pipeline = [
            {
                $match: {
                    $text: { $search: query },
                    status: status
                }
            },
            { $addFields: { score: { $meta: "textScore" } } },
            { $sort: { score: { $meta: "textScore" } } },
            { $limit: limit }
        ];

        if (category) {
            pipeline[0].$match.tags = category;
        }

        return await Article.aggregate(pipeline);
    }

    /**
     * Keyword-based search with regex
     */
    async _keywordSearch(query, { limit, status, category }) {
        const keywords = this._extractKeywords(query);
        const regexPatterns = keywords.map(keyword => new RegExp(keyword, 'i'));

        const searchConditions = {
            status: status,
            $or: [
                { title: { $in: regexPatterns } },
                { body: { $in: regexPatterns } },
                { tags: { $in: keywords.map(k => k.toLowerCase()) } }
            ]
        };

        if (category) {
            searchConditions.tags = category;
        }

        return await Article.find(searchConditions)
            .limit(limit)
            .sort({ updatedAt: -1 })
            .lean();
    }

    /**
     * Extract meaningful keywords from query
     */
    _extractKeywords(query) {
        // Remove common stop words
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
        ]);

        return query
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .slice(0, 10); // Limit to top 10 keywords
    }

    /**
     * Score articles based on relevance
     */
    _scoreArticles(articles, query) {
        const keywords = this._extractKeywords(query);

        return articles.map(article => {
            let score = article.score || 0; // From text search

            // Boost score based on keyword matches
            const titleMatches = this._countMatches(article.title, keywords);
            const bodyMatches = this._countMatches(article.body, keywords);
            const tagMatches = article.tags ?
                keywords.filter(k => article.tags.includes(k.toLowerCase())).length : 0;

            // Weight different fields
            score += titleMatches * 3; // Title matches are most important
            score += bodyMatches * 1;  // Body matches
            score += tagMatches * 2;   // Tag matches are important

            // Boost popular articles
            score += (article.helpful || 0) * 0.1;
            score -= (article.notHelpful || 0) * 0.05;

            return {
                ...article,
                relevanceScore: Math.round(score * 100) / 100
            };
        }).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    /**
     * Count keyword matches in text
     */
    _countMatches(text, keywords) {
        if (!text) return 0;

        const lowerText = text.toLowerCase();
        return keywords.reduce((count, keyword) => {
            const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
            return count + matches;
        }, 0);
    }

    /**
     * Get article by ID with view tracking
     */
    async getArticle(id, trackView = false) {
        const article = await Article.findById(id);

        if (article && trackView) {
            article.views = (article.views || 0) + 1;
            await article.save();
        }

        return article;
    }

    /**
     * Get multiple articles by IDs
     */
    async getArticlesByIds(ids) {
        return await Article.find({
            _id: { $in: ids },
            status: 'published'
        }).lean();
    }
}

export default new KnowledgeBaseService();
