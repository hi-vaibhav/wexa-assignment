import { AgentSuggestion } from '../models/AgentSuggestion.js';
import { Article } from '../models/Article.js';
import { AuditLog } from '../models/AuditLog.js';
import { Config } from '../models/Config.js';
import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import agentService from '../services/agentService.js';
import kbService from '../services/kbService.js';
import llmService from '../services/llmService.js';

describe('Agent Service', () => {
    let user, agent, config, ticket, articles;

    beforeEach(async () => {
        // Create test users
        user = await User.create({
            name: 'Test User',
            email: 'user@example.com',
            passwordHash: 'hashedpassword',
            role: 'user'
        });

        agent = await User.create({
            name: 'Test Agent',
            email: 'agent@example.com',
            passwordHash: 'hashedpassword',
            role: 'agent'
        });

        // Create config
        config = await Config.create({
            autoCloseEnabled: true,
            confidenceThreshold: 0.8,
            slaHours: 24
        });

        // Create test articles
        articles = await Article.create([
            {
                title: 'Billing FAQ',
                body: 'Common billing questions and answers',
                tags: ['billing', 'faq'],
                status: 'published',
                author: agent._id
            },
            {
                title: 'Technical Troubleshooting',
                body: 'How to resolve technical issues',
                tags: ['tech', 'troubleshooting'],
                status: 'published',
                author: agent._id
            }
        ]);

        // Create test ticket
        ticket = await Ticket.create({
            title: 'Refund request for double charge',
            description: 'I was charged twice for the same order',
            category: 'other',
            createdBy: user._id,
            status: 'open'
        });
    });

    describe('triageTicket', () => {
        it('should complete full triage workflow', async () => {
            const result = await agentService.triageTicket(ticket._id.toString());

            expect(result).toHaveProperty('classification');
            expect(result).toHaveProperty('articles');
            expect(result).toHaveProperty('draft');
            expect(result).toHaveProperty('decision');

            // Check classification
            expect(result.classification.predictedCategory).toBe('billing');
            expect(result.classification.confidence).toBeGreaterThan(0);

            // Check articles were retrieved
            expect(Array.isArray(result.articles)).toBe(true);

            // Check draft was generated
            expect(result.draft.draftReply).toBeTruthy();
            expect(Array.isArray(result.draft.citations)).toBe(true);

            // Check suggestion was created
            const suggestion = await AgentSuggestion.findOne({ ticketId: ticket._id });
            expect(suggestion).toBeTruthy();
            expect(suggestion.predictedCategory).toBe('billing');

            // Check audit logs were created
            const auditLogs = await AuditLog.find({ ticketId: ticket._id });
            expect(auditLogs.length).toBeGreaterThan(0);
        });

        it('should auto-close ticket with high confidence', async () => {
            // Lower threshold to ensure auto-close
            await Config.findOneAndUpdate({}, { confidenceThreshold: 0.5 });

            const result = await agentService.triageTicket(ticket._id.toString());

            expect(result.decision.action).toBe('auto_closed');

            // Check ticket was updated
            const updatedTicket = await Ticket.findById(ticket._id);
            expect(updatedTicket.status).toBe('resolved');
            expect(updatedTicket.replies).toHaveLength(1);
            expect(updatedTicket.resolvedAt).toBeTruthy();

            // Check suggestion was marked as auto-closed
            const suggestion = await AgentSuggestion.findOne({ ticketId: ticket._id });
            expect(suggestion.autoClosed).toBe(true);
        });

        it('should assign to human with low confidence', async () => {
            // Raise threshold to prevent auto-close
            await Config.findOneAndUpdate({}, { confidenceThreshold: 0.9 });

            const result = await agentService.triageTicket(ticket._id.toString());

            expect(result.decision.action).toBe('assigned_to_human');

            // Check ticket was updated
            const updatedTicket = await Ticket.findById(ticket._id);
            expect(updatedTicket.status).toBe('waiting_human');
            expect(updatedTicket.assignee).toBeTruthy();

            // Check suggestion was not auto-closed
            const suggestion = await AgentSuggestion.findOne({ ticketId: ticket._id });
            expect(suggestion.autoClosed).toBe(false);
        });
    });

    describe('getSuggestion', () => {
        let suggestion;

        beforeEach(async () => {
            suggestion = await AgentSuggestion.create({
                ticketId: ticket._id,
                traceId: 'test-trace-id',
                predictedCategory: 'billing',
                articleIds: [articles[0]._id],
                draftReply: 'Test draft reply',
                confidence: 0.85,
                autoClosed: false,
                modelInfo: {
                    provider: 'stub',
                    model: 'deterministic-v1',
                    promptVersion: 'v1.0',
                    latencyMs: 100
                }
            });
        });

        it('should get suggestion for ticket', async () => {
            const result = await agentService.getSuggestion(ticket._id.toString());

            expect(result).toBeTruthy();
            expect(result._id.toString()).toBe(suggestion._id.toString());
            expect(result.predictedCategory).toBe('billing');
            expect(result.confidence).toBe(0.85);
        });

        it('should return null for non-existent ticket', async () => {
            const result = await agentService.getSuggestion('507f1f77bcf86cd799439011');
            expect(result).toBeNull();
        });
    });

    describe('acceptSuggestion', () => {
        let suggestion;

        beforeEach(async () => {
            suggestion = await AgentSuggestion.create({
                ticketId: ticket._id,
                traceId: 'test-trace-id',
                predictedCategory: 'billing',
                articleIds: [articles[0]._id],
                draftReply: 'Test draft reply',
                confidence: 0.85,
                autoClosed: false,
                modelInfo: {
                    provider: 'stub',
                    model: 'deterministic-v1',
                    promptVersion: 'v1.0',
                    latencyMs: 100
                }
            });
        });

        it('should accept suggestion', async () => {
            const result = await agentService.acceptSuggestion(
                suggestion._id.toString(),
                agent._id.toString()
            );

            expect(result.accepted).toBe(true);
            expect(result.acceptedBy.toString()).toBe(agent._id.toString());
            expect(result.acceptedAt).toBeTruthy();

            // Check audit log was created
            const auditLog = await AuditLog.findOne({
                ticketId: ticket._id,
                action: 'SUGGESTION_ACCEPTED'
            });
            expect(auditLog).toBeTruthy();
        });
    });

    describe('rejectSuggestion', () => {
        let suggestion;

        beforeEach(async () => {
            suggestion = await AgentSuggestion.create({
                ticketId: ticket._id,
                traceId: 'test-trace-id',
                predictedCategory: 'billing',
                articleIds: [articles[0]._id],
                draftReply: 'Test draft reply',
                confidence: 0.85,
                autoClosed: false,
                modelInfo: {
                    provider: 'stub',
                    model: 'deterministic-v1',
                    promptVersion: 'v1.0',
                    latencyMs: 100
                }
            });
        });

        it('should reject suggestion', async () => {
            const result = await agentService.rejectSuggestion(
                suggestion._id.toString(),
                agent._id.toString(),
                'Not accurate'
            );

            expect(result.accepted).toBe(false);
            expect(result.acceptedBy.toString()).toBe(agent._id.toString());
            expect(result.acceptedAt).toBeTruthy();

            // Check audit log was created
            const auditLog = await AuditLog.findOne({
                ticketId: ticket._id,
                action: 'SUGGESTION_REJECTED'
            });
            expect(auditLog).toBeTruthy();
            expect(auditLog.meta.reason).toBe('Not accurate');
        });
    });
});
