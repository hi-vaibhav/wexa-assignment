import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AuditLog } from '../models/AuditLog.js';
import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import app from '../server.js';

describe('Tickets', () => {
    let userToken, agentToken, user, agent;

    beforeEach(async () => {
        // Create users
        user = await User.create({
            name: 'User',
            email: 'user@example.com',
            passwordHash: 'hashedpassword',
            role: 'user'
        });

        agent = await User.create({
            name: 'Agent',
            email: 'agent@example.com',
            passwordHash: 'hashedpassword',
            role: 'agent'
        });

        // Generate tokens
        userToken = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'test-secret'
        );

        agentToken = jwt.sign(
            { userId: agent._id, email: agent.email, role: agent.role },
            process.env.JWT_SECRET || 'test-secret'
        );
    });

    describe('POST /api/tickets', () => {
        it('should create a ticket', async () => {
            const ticketData = {
                title: 'Test Ticket',
                description: 'This is a test ticket description',
                category: 'tech'
            };

            const response = await request(app)
                .post('/api/tickets')
                .set('Authorization', `Bearer ${userToken}`)
                .send(ticketData)
                .expect(201);

            expect(response.body.ticket.title).toBe('Test Ticket');
            expect(response.body.ticket.createdBy._id).toBe(user._id.toString());
            expect(response.body.ticket.status).toBe('open');
            expect(response.body).toHaveProperty('traceId');

            // Check audit log was created
            const auditLog = await AuditLog.findOne({
                ticketId: response.body.ticket._id,
                action: 'TICKET_CREATED'
            });
            expect(auditLog).toBeTruthy();
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/tickets')
                .set('Authorization', `Bearer ${userToken}`)
                .send({})
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
        });

        it('should require authentication', async () => {
            await request(app)
                .post('/api/tickets')
                .send({ title: 'Test', description: 'Test' })
                .expect(401);
        });
    });

    describe('GET /api/tickets', () => {
        beforeEach(async () => {
            // Create test tickets
            await Ticket.create([
                {
                    title: 'User Ticket 1',
                    description: 'Description 1',
                    createdBy: user._id,
                    status: 'open'
                },
                {
                    title: 'User Ticket 2',
                    description: 'Description 2',
                    createdBy: user._id,
                    status: 'resolved'
                },
                {
                    title: 'Other User Ticket',
                    description: 'Description 3',
                    createdBy: agent._id, // Different user
                    status: 'open'
                }
            ]);
        });

        it('should return user\'s own tickets', async () => {
            const response = await request(app)
                .get('/api/tickets')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body.tickets).toHaveLength(2);
            response.body.tickets.forEach(ticket => {
                expect(ticket.createdBy._id).toBe(user._id.toString());
            });
        });

        it('should return all tickets for agents', async () => {
            const response = await request(app)
                .get('/api/tickets')
                .set('Authorization', `Bearer ${agentToken}`)
                .expect(200);

            expect(response.body.tickets).toHaveLength(3);
        });

        it('should filter by status', async () => {
            const response = await request(app)
                .get('/api/tickets?status=open')
                .set('Authorization', `Bearer ${agentToken}`)
                .expect(200);

            expect(response.body.tickets).toHaveLength(2);
            response.body.tickets.forEach(ticket => {
                expect(ticket.status).toBe('open');
            });
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/tickets?page=1&limit=2')
                .set('Authorization', `Bearer ${agentToken}`)
                .expect(200);

            expect(response.body.tickets).toHaveLength(2);
            expect(response.body.pagination).toMatchObject({
                page: 1,
                limit: 2,
                total: 3,
                pages: 2
            });
        });
    });

    describe('GET /api/tickets/:id', () => {
        let ticket;

        beforeEach(async () => {
            ticket = await Ticket.create({
                title: 'Test Ticket',
                description: 'Test description',
                createdBy: user._id,
                status: 'open'
            });
        });

        it('should return ticket details for owner', async () => {
            const response = await request(app)
                .get(`/api/tickets/${ticket._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body.title).toBe('Test Ticket');
            expect(response.body.createdBy._id).toBe(user._id.toString());
        });

        it('should return ticket details for agent', async () => {
            const response = await request(app)
                .get(`/api/tickets/${ticket._id}`)
                .set('Authorization', `Bearer ${agentToken}`)
                .expect(200);

            expect(response.body.title).toBe('Test Ticket');
        });

        it('should deny access to other users', async () => {
            const otherUser = await User.create({
                name: 'Other User',
                email: 'other@example.com',
                passwordHash: 'hashedpassword',
                role: 'user'
            });

            const otherToken = jwt.sign(
                { userId: otherUser._id, email: otherUser.email, role: otherUser.role },
                process.env.JWT_SECRET || 'test-secret'
            );

            await request(app)
                .get(`/api/tickets/${ticket._id}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .expect(403);
        });
    });

    describe('POST /api/tickets/:id/reply', () => {
        let ticket;

        beforeEach(async () => {
            ticket = await Ticket.create({
                title: 'Test Ticket',
                description: 'Test description',
                createdBy: user._id,
                status: 'open'
            });
        });

        it('should add reply as agent', async () => {
            const replyData = {
                content: 'This is a reply from agent',
                isInternal: false
            };

            const response = await request(app)
                .post(`/api/tickets/${ticket._id}/reply`)
                .set('Authorization', `Bearer ${agentToken}`)
                .send(replyData)
                .expect(200);

            expect(response.body.reply.content).toBe('This is a reply from agent');

            // Check ticket was updated
            const updatedTicket = await Ticket.findById(ticket._id);
            expect(updatedTicket.replies).toHaveLength(1);
        });

        it('should reject reply from regular user', async () => {
            await request(app)
                .post(`/api/tickets/${ticket._id}/reply`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ content: 'User reply' })
                .expect(403);
        });

        it('should validate reply content', async () => {
            const response = await request(app)
                .post(`/api/tickets/${ticket._id}/reply`)
                .set('Authorization', `Bearer ${agentToken}`)
                .send({})
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
        });
    });

    describe('POST /api/tickets/:id/assign', () => {
        let ticket;

        beforeEach(async () => {
            ticket = await Ticket.create({
                title: 'Test Ticket',
                description: 'Test description',
                createdBy: user._id,
                status: 'open'
            });
        });

        it('should assign ticket to agent', async () => {
            const response = await request(app)
                .post(`/api/tickets/${ticket._id}/assign`)
                .set('Authorization', `Bearer ${agentToken}`)
                .send({ assigneeId: agent._id.toString() })
                .expect(200);

            expect(response.body.ticket.assignee._id).toBe(agent._id.toString());

            // Check audit log
            const auditLog = await AuditLog.findOne({
                ticketId: ticket._id,
                action: 'TICKET_ASSIGNED'
            });
            expect(auditLog).toBeTruthy();
        });

        it('should unassign ticket', async () => {
            // First assign
            await Ticket.findByIdAndUpdate(ticket._id, { assignee: agent._id });

            // Then unassign
            const response = await request(app)
                .post(`/api/tickets/${ticket._id}/assign`)
                .set('Authorization', `Bearer ${agentToken}`)
                .send({})
                .expect(200);

            expect(response.body.ticket.assignee).toBeUndefined();
        });

        it('should reject assignment by regular user', async () => {
            await request(app)
                .post(`/api/tickets/${ticket._id}/assign`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ assigneeId: agent._id.toString() })
                .expect(403);
        });
    });
});
