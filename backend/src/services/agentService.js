import { v4 as uuidv4 } from 'uuid';
import { AgentSuggestion } from '../models/AgentSuggestion.js';
import { AuditLog } from '../models/AuditLog.js';
import { Config } from '../models/Config.js';
import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';
import kbService from './kbService.js';
import llmService from './llmService.js';

/**
 * Agentic Triage Service
 * Implements the complete AI-powered ticket triage workflow
 */
class AgentService {
    /**
     * Main triage workflow
     */
    async triageTicket(ticketId, traceId = null) {
        const trace = traceId || uuidv4();

        try {
            logger.info(`Starting triage for ticket ${ticketId}`, { traceId: trace });

            // 1. Plan the workflow
            const plan = await this._planWorkflow(ticketId, trace);

            // 2. Execute the plan
            const result = await this._executePlan(plan, trace);

            logger.info(`Triage completed for ticket ${ticketId}`, {
                traceId: trace,
                result: result.decision
            });

            return result;
        } catch (error) {
            logger.error(`Triage failed for ticket ${ticketId}`, {
                traceId: trace,
                error: error.message
            });

            // Log failure
            await this._logAuditEvent(ticketId, trace, 'system', 'TRIAGE_FAILED', {
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Step 1: Plan the workflow
     */
    async _planWorkflow(ticketId, traceId) {
        const ticket = await Ticket.findById(ticketId).populate('createdBy');
        if (!ticket) {
            throw new Error('Ticket not found');
        }

        await this._logAuditEvent(ticketId, traceId, 'system', 'TRIAGE_STARTED', {
            ticketTitle: ticket.title,
            category: ticket.category
        });

        // Simple state machine plan
        const plan = {
            ticketId,
            traceId,
            ticket,
            steps: [
                'classify',
                'retrieve',
                'draft',
                'decide'
            ]
        };

        logger.info(`Planned workflow for ticket ${ticketId}`, {
            traceId,
            steps: plan.steps
        });

        return plan;
    }

    /**
     * Execute the planned workflow
     */
    async _executePlan(plan, traceId) {
        const { ticket, ticketId } = plan;
        let result = { ticket };

        // Step 1: Classify
        result.classification = await this._classifyTicket(ticket, traceId);

        // Step 2: Retrieve KB articles
        result.articles = await this._retrieveKnowledge(ticket, result.classification, traceId);

        // Step 3: Draft reply
        result.draft = await this._draftReply(ticket, result.articles, traceId);

        // Step 4: Make decision
        result.decision = await this._makeDecision(ticket, result, traceId);

        return result;
    }

    /**
     * Step 2: Classify ticket category
     */
    async _classifyTicket(ticket, traceId) {
        logger.info(`Classifying ticket ${ticket._id}`, { traceId });

        const ticketText = `${ticket.title}\n\n${ticket.description}`;
        const classification = await llmService.classify(ticketText);

        await this._logAuditEvent(ticket._id, traceId, 'system', 'AGENT_CLASSIFIED', {
            originalCategory: ticket.category,
            predictedCategory: classification.predictedCategory,
            confidence: classification.confidence
        });

        // Update ticket category if different and confidence is high
        if (classification.predictedCategory !== ticket.category && classification.confidence > 0.7) {
            ticket.category = classification.predictedCategory;
            await ticket.save();
        }

        return classification;
    }

    /**
     * Step 3: Retrieve relevant knowledge base articles
     */
    async _retrieveKnowledge(ticket, classification, traceId) {
        logger.info(`Retrieving knowledge for ticket ${ticket._id}`, { traceId });

        const query = `${ticket.title} ${ticket.description}`;
        const articles = await kbService.searchArticles(query, {
            limit: 3,
            category: classification.predictedCategory
        });

        await this._logAuditEvent(ticket._id, traceId, 'system', 'KB_RETRIEVED', {
            query: query.substring(0, 100),
            articlesFound: articles.length,
            articleIds: articles.map(a => a._id),
            category: classification.predictedCategory
        });

        return articles;
    }

    /**
     * Step 4: Draft reply
     */
    async _draftReply(ticket, articles, traceId) {
        logger.info(`Drafting reply for ticket ${ticket._id}`, { traceId });

        const ticketText = `${ticket.title}\n\n${ticket.description}`;
        const draft = await llmService.draft(ticketText, articles);

        await this._logAuditEvent(ticket._id, traceId, 'system', 'DRAFT_GENERATED', {
            draftLength: draft.draftReply.length,
            citationsCount: draft.citations.length,
            citations: draft.citations
        });

        return draft;
    }

    /**
     * Step 5: Make decision (auto-close or assign to human)
     */
    async _makeDecision(ticket, triageResult, traceId) {
        logger.info(`Making decision for ticket ${ticket._id}`, { traceId });

        const config = await this._getConfig();
        const { classification, articles, draft } = triageResult;

        // Create agent suggestion
        const suggestion = new AgentSuggestion({
            ticketId: ticket._id,
            traceId,
            predictedCategory: classification.predictedCategory,
            articleIds: articles.map(a => a._id),
            draftReply: draft.draftReply,
            confidence: classification.confidence,
            modelInfo: llmService.getModelInfo()
        });

        // Check if we should auto-close
        const shouldAutoClose = config.autoCloseEnabled &&
            classification.confidence >= config.confidenceThreshold;

        if (shouldAutoClose) {
            // Auto-close ticket
            suggestion.autoClosed = true;
            await suggestion.save();

            // Add reply to ticket
            ticket.replies.push({
                author: await this._getSystemUser(),
                content: draft.draftReply,
                isInternal: false
            });

            ticket.status = 'resolved';
            ticket.agentSuggestionId = suggestion._id;
            ticket.resolvedAt = new Date();
            await ticket.save();

            await this._logAuditEvent(ticket._id, traceId, 'system', 'AUTO_CLOSED', {
                confidence: classification.confidence,
                threshold: config.confidenceThreshold,
                suggestionId: suggestion._id
            });

            return { action: 'auto_closed', suggestion };
        } else {
            // Assign to human
            await suggestion.save();

            // Also add the draft reply to the ticket so users can see it immediately
            const systemUser = await this._getSystemUser();
            ticket.replies.push({
                author: systemUser._id,
                content: draft.draftReply,
                isInternal: false, // Visible to users
                createdAt: new Date(),
                updatedAt: new Date()
            });

            ticket.status = 'waiting_human';
            ticket.agentSuggestionId = suggestion._id;

            // Assign to an available agent
            const agent = await this._findAvailableAgent();
            if (agent) {
                ticket.assignee = agent._id;
                await this._logAuditEvent(ticket._id, traceId, 'system', 'ASSIGNED_TO_HUMAN', {
                    assigneeId: agent._id,
                    assigneeName: agent.name,
                    reason: 'low_confidence',
                    confidence: classification.confidence
                });
            } else {
                await this._logAuditEvent(ticket._id, traceId, 'system', 'ASSIGNED_TO_HUMAN', {
                    reason: 'no_agent_available',
                    confidence: classification.confidence
                });
            }

            await ticket.save();

            await this._logAuditEvent(ticket._id, traceId, 'system', 'REPLY_SENT', {
                replyContent: draft.draftReply.substring(0, 100),
                isAutoReply: true,
                confidence: classification.confidence
            });

            return { action: 'assigned_to_human', suggestion, assignee: agent };
        }
    }

    /**
     * Get system configuration
     */
    async _getConfig() {
        let config = await Config.findOne();
        if (!config) {
            config = new Config();
            await config.save();
        }
        return config;
    }

    /**
     * Find an available agent for assignment
     */
    async _findAvailableAgent() {
        // Simple round-robin assignment
        // In production, this would consider workload, availability, expertise, etc.
        const agents = await User.find({
            role: { $in: ['agent', 'admin'] },
            isActive: true
        });

        if (agents.length === 0) return null;

        // Find agent with least tickets
        const agentWorkloads = await Promise.all(
            agents.map(async (agent) => {
                const ticketCount = await Ticket.countDocuments({
                    assignee: agent._id,
                    status: { $in: ['triaged', 'waiting_human'] }
                });
                return { agent, ticketCount };
            })
        );

        // Sort by workload and return agent with least tickets
        agentWorkloads.sort((a, b) => a.ticketCount - b.ticketCount);
        return agentWorkloads[0].agent;
    }

    /**
     * Get or create system user for automated actions
     */
    async _getSystemUser() {
        let systemUser = await User.findOne({ email: 'system@helpdesk.ai' });
        if (!systemUser) {
            systemUser = new User({
                name: 'AI Assistant',
                email: 'system@helpdesk.ai',
                passwordHash: 'system',
                role: 'agent'
            });
            await systemUser.save();
        }
        return systemUser._id;
    }

    /**
     * Log audit event
     */
    async _logAuditEvent(ticketId, traceId, actor, action, meta = {}) {
        const auditLog = new AuditLog({
            ticketId,
            traceId,
            actor,
            action,
            meta,
            timestamp: new Date()
        });

        await auditLog.save();

        logger.info(`Audit logged: ${action}`, {
            ticketId,
            traceId,
            actor,
            meta
        });
    }

    /**
     * Get suggestion for a ticket
     */
    async getSuggestion(ticketId) {
        return await AgentSuggestion.findOne({ ticketId })
            .populate('articleIds')
            .sort({ createdAt: -1 });
    }

    /**
     * Accept a suggestion
     */
    async acceptSuggestion(suggestionId, agentId) {
        const suggestion = await AgentSuggestion.findById(suggestionId);
        if (!suggestion) {
            throw new Error('Suggestion not found');
        }

        suggestion.accepted = true;
        suggestion.acceptedBy = agentId;
        suggestion.acceptedAt = new Date();
        await suggestion.save();

        // Add the suggestion as a reply to the ticket so users can see it
        const ticket = await Ticket.findById(suggestion.ticketId);
        if (ticket) {
            const agent = await User.findById(agentId);
            const newReply = {
                author: agentId,
                content: suggestion.draftReply,
                isInternal: false, // Make it visible to users
                createdAt: new Date(),
                updatedAt: new Date()
            };

            ticket.replies.push(newReply);
            await ticket.save();

            logger.info(`Reply added to ticket ${suggestion.ticketId} from accepted suggestion`, {
                suggestionId,
                agentId,
                agentName: agent?.name || 'Unknown Agent'
            });
        }

        await this._logAuditEvent(
            suggestion.ticketId,
            suggestion.traceId,
            'agent',
            'SUGGESTION_ACCEPTED',
            { suggestionId, agentId }
        );

        return suggestion;
    }

    /**
     * Reject a suggestion
     */
    async rejectSuggestion(suggestionId, agentId, reason = '') {
        const suggestion = await AgentSuggestion.findById(suggestionId);
        if (!suggestion) {
            throw new Error('Suggestion not found');
        }

        suggestion.accepted = false;
        suggestion.acceptedBy = agentId;
        suggestion.acceptedAt = new Date();
        await suggestion.save();

        await this._logAuditEvent(
            suggestion.ticketId,
            suggestion.traceId,
            'agent',
            'SUGGESTION_REJECTED',
            { suggestionId, agentId, reason }
        );

        return suggestion;
    }
}

// Export singleton instance
const agentService = new AgentService();
export default agentService;

// Export the main triage function for queue worker
export const triageTicket = async (ticketId, traceId) => {
    return await agentService.triageTicket(ticketId, traceId);
};
