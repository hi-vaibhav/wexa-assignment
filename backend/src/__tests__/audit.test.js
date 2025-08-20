import { AuditLog } from '../models/AuditLog.js';
import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';

describe('Audit Logging', () => {
    let user, ticket;

    beforeEach(async () => {
        user = await User.create({
            name: 'Test User',
            email: 'user@example.com',
            passwordHash: 'hashedpassword',
            role: 'user'
        });

        ticket = await Ticket.create({
            title: 'Test Ticket',
            description: 'Test description',
            createdBy: user._id,
            status: 'open'
        });
    });

    it('should create audit log entry', async () => {
        const auditLog = await AuditLog.create({
            ticketId: ticket._id,
            traceId: 'test-trace-123',
            actor: 'user',
            actorId: user._id,
            action: 'TICKET_CREATED',
            meta: {
                title: ticket.title,
                category: ticket.category
            }
        });

        expect(auditLog).toBeTruthy();
        expect(auditLog.ticketId.toString()).toBe(ticket._id.toString());
        expect(auditLog.traceId).toBe('test-trace-123');
        expect(auditLog.actor).toBe('user');
        expect(auditLog.action).toBe('TICKET_CREATED');
        expect(auditLog.timestamp).toBeTruthy();
    });

    it('should retrieve audit logs by ticket ID', async () => {
        // Create multiple audit log entries
        await AuditLog.create([
            {
                ticketId: ticket._id,
                traceId: 'trace-1',
                actor: 'user',
                actorId: user._id,
                action: 'TICKET_CREATED',
                meta: { step: 1 }
            },
            {
                ticketId: ticket._id,
                traceId: 'trace-1',
                actor: 'system',
                action: 'AGENT_CLASSIFIED',
                meta: { step: 2 }
            },
            {
                ticketId: ticket._id,
                traceId: 'trace-1',
                actor: 'system',
                action: 'KB_RETRIEVED',
                meta: { step: 3 }
            }
        ]);

        const auditLogs = await AuditLog.find({ ticketId: ticket._id })
            .sort({ timestamp: 1 });

        expect(auditLogs).toHaveLength(3);
        expect(auditLogs[0].action).toBe('TICKET_CREATED');
        expect(auditLogs[1].action).toBe('AGENT_CLASSIFIED');
        expect(auditLogs[2].action).toBe('KB_RETRIEVED');
    });

    it('should retrieve audit logs by trace ID', async () => {
        const traceId = 'trace-123';

        await AuditLog.create([
            {
                ticketId: ticket._id,
                traceId,
                actor: 'system',
                action: 'TRIAGE_STARTED',
                meta: { step: 1 }
            },
            {
                ticketId: ticket._id,
                traceId,
                actor: 'system',
                action: 'TRIAGE_COMPLETED',
                meta: { step: 2 }
            }
        ]);

        const auditLogs = await AuditLog.find({ traceId })
            .sort({ timestamp: 1 });

        expect(auditLogs).toHaveLength(2);
        auditLogs.forEach(log => {
            expect(log.traceId).toBe(traceId);
        });
    });

    it('should validate required fields', async () => {
        try {
            await AuditLog.create({
                // Missing required fields
                actor: 'user',
                action: 'TICKET_CREATED'
            });
            fail('Should have thrown validation error');
        } catch (error) {
            expect(error.name).toBe('ValidationError');
        }
    });

    it('should validate action enum values', async () => {
        try {
            await AuditLog.create({
                ticketId: ticket._id,
                traceId: 'test-trace',
                actor: 'user',
                action: 'INVALID_ACTION', // Invalid action
                meta: {}
            });
            fail('Should have thrown validation error');
        } catch (error) {
            expect(error.name).toBe('ValidationError');
        }
    });

    it('should validate actor enum values', async () => {
        try {
            await AuditLog.create({
                ticketId: ticket._id,
                traceId: 'test-trace',
                actor: 'invalid_actor', // Invalid actor
                action: 'TICKET_CREATED',
                meta: {}
            });
            fail('Should have thrown validation error');
        } catch (error) {
            expect(error.name).toBe('ValidationError');
        }
    });

    it('should allow meta field to store complex objects', async () => {
        const complexMeta = {
            classification: {
                category: 'billing',
                confidence: 0.85
            },
            articles: [
                { id: 'article1', title: 'Article 1' },
                { id: 'article2', title: 'Article 2' }
            ],
            metrics: {
                latencyMs: 150,
                tokens: 45
            }
        };

        const auditLog = await AuditLog.create({
            ticketId: ticket._id,
            traceId: 'test-trace',
            actor: 'system',
            action: 'AGENT_CLASSIFIED',
            meta: complexMeta
        });

        expect(auditLog.meta).toEqual(complexMeta);
        expect(auditLog.meta.classification.confidence).toBe(0.85);
        expect(auditLog.meta.articles).toHaveLength(2);
    });
});
