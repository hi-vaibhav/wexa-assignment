import request from 'supertest';
import { User } from '../models/User.js';
import app from '../server.js';

describe('Authentication', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'Password123',
                role: 'user'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toMatchObject({
                name: 'John Doe',
                email: 'john@example.com',
                role: 'user'
            });

            // Check user was created in database
            const user = await User.findOne({ email: 'john@example.com' });
            expect(user).toBeTruthy();
            expect(user.passwordHash).not.toBe('Password123'); // Should be hashed
        });

        it('should reject duplicate email', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'Password123'
            };

            // First registration
            await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            // Second registration with same email
            await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(409);
        });

        it('should validate password requirements', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'weak'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Create test user
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'Password123'
                });
        });

        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'Password123'
                })
                .expect(200);

            expect(response.body).toHaveProperty('token');
            expect(response.body.user.email).toBe('test@example.com');
        });

        it('should reject invalid credentials', async () => {
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'WrongPassword'
                })
                .expect(401);
        });

        it('should reject non-existent user', async () => {
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Password123'
                })
                .expect(401);
        });
    });
});
