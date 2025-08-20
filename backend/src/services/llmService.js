import { logger } from '../utils/logger.js';

/**
 * LLM Provider Interface
 * Supports both real LLM APIs and deterministic stub mode
 */
class LLMProvider {
    constructor() {
        this.stubMode = process.env.STUB_MODE === 'true';
        this.provider = this.stubMode ? 'stub' : 'openai';
        this.model = this.stubMode ? 'deterministic-v1' : 'gpt-3.5-turbo';
        this.promptVersion = 'v1.0';
    }

    /**
     * Classify ticket category with confidence score
     */
    async classify(ticketText) {
        const startTime = Date.now();

        try {
            if (this.stubMode) {
                return this._stubClassify(ticketText);
            }

            // Real LLM implementation would go here
            return await this._realClassify(ticketText);
        } catch (error) {
            logger.error('Classification failed:', error);
            throw new Error('Classification service unavailable');
        } finally {
            const latencyMs = Date.now() - startTime;
            logger.info(`Classification completed in ${latencyMs}ms`);
        }
    }

    /**
     * Generate draft reply with citations
     */
    async draft(ticketText, relevantArticles) {
        const startTime = Date.now();

        try {
            if (this.stubMode) {
                return this._stubDraft(ticketText, relevantArticles);
            }

            // Real LLM implementation would go here
            return await this._realDraft(ticketText, relevantArticles);
        } catch (error) {
            logger.error('Draft generation failed:', error);
            throw new Error('Draft generation service unavailable');
        } finally {
            const latencyMs = Date.now() - startTime;
            logger.info(`Draft generation completed in ${latencyMs}ms`);
        }
    }

    /**
     * Deterministic stub classification
     */
    _stubClassify(text) {
        const lowerText = text.toLowerCase();

        // Keyword mappings with weights
        const keywords = {
            billing: ['refund', 'invoice', 'payment', 'charge', 'billing', 'credit', 'money', 'price', 'cost', 'fee'],
            tech: ['error', 'bug', 'crash', 'broken', 'technical', 'code', 'stack', 'login', 'password', 'api'],
            shipping: ['delivery', 'shipment', 'package', 'shipping', 'tracking', 'arrived', 'delayed', 'address'],
            other: ['general', 'question', 'help', 'support', 'information', 'contact']
        };

        let scores = {
            billing: 0,
            tech: 0,
            shipping: 0,
            other: 0.1 // Base score for other
        };

        // Calculate scores based on keyword matches
        for (const [category, categoryKeywords] of Object.entries(keywords)) {
            for (const keyword of categoryKeywords) {
                const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
                scores[category] += matches * 0.2;
            }
        }

        // Find the category with highest score
        const predictedCategory = Object.keys(scores).reduce((a, b) =>
            scores[a] > scores[b] ? a : b
        );

        // Calculate confidence based on score difference
        const sortedScores = Object.values(scores).sort((a, b) => b - a);
        const confidence = Math.min(0.95, Math.max(0.3,
            (sortedScores[0] - sortedScores[1]) / (sortedScores[0] + 0.1)
        ));

        return {
            predictedCategory,
            confidence: Math.round(confidence * 100) / 100
        };
    }

    /**
     * Deterministic stub draft generation
     */
    _stubDraft(ticketText, articles) {
        const templates = {
            billing: "Thank you for contacting us regarding your billing inquiry. I understand your concern and I'm here to help resolve this issue promptly.",
            tech: "Thank you for reporting this technical issue. I apologize for any inconvenience this may have caused. Let me help you resolve this problem.",
            shipping: "Thank you for contacting us about your shipment. I understand you're looking for information about your delivery and I'm here to help.",
            other: "Thank you for reaching out to our support team. I'm here to assist you with your inquiry."
        };

        // Classify to get category
        const { predictedCategory } = this._stubClassify(ticketText);

        let draftReply = templates[predictedCategory] || templates.other;

        // Add relevant article information
        if (articles && articles.length > 0) {
            draftReply += "\n\nBased on our knowledge base, here are some relevant resources that may help:\n\n";

            articles.slice(0, 3).forEach((article, index) => {
                draftReply += `${index + 1}. ${article.title}\n`;
            });

            draftReply += "\nPlease review these resources, and if you need further assistance, don't hesitate to reply to this ticket.";
        }

        draftReply += "\n\nBest regards,\nSupport Team";

        return {
            draftReply,
            citations: articles ? articles.slice(0, 3).map(a => a._id.toString()) : []
        };
    }

    /**
     * Real LLM classification (placeholder)
     */
    async _realClassify(text) {
        // This would implement actual OpenAI API calls
        const prompt = `
    Classify the following support ticket into one of these categories: billing, tech, shipping, other.
    Provide a confidence score between 0 and 1.
    
    Ticket: ${text}
    
    Respond with JSON: {"predictedCategory": "category", "confidence": 0.95}
    `;

        // Implementation would use OpenAI API here
        throw new Error('Real LLM not implemented - use STUB_MODE=true');
    }

    /**
     * Real LLM draft generation (placeholder)
     */
    async _realDraft(text, articles) {
        const prompt = `
    Generate a professional support response for this ticket.
    Use the provided knowledge base articles as references.
    Include numbered citations to the articles.
    
    Ticket: ${text}
    
    Knowledge Base Articles:
    ${articles.map((a, i) => `${i + 1}. ${a.title}: ${a.body.substring(0, 200)}...`).join('\n')}
    
    Generate a helpful, professional response with citations.
    `;

        // Implementation would use OpenAI API here
        throw new Error('Real LLM not implemented - use STUB_MODE=true');
    }

    getModelInfo(latencyMs = 0) {
        return {
            provider: this.provider,
            model: this.model,
            promptVersion: this.promptVersion,
            latencyMs
        };
    }
}

export default new LLMProvider();
