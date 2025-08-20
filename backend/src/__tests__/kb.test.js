import jwt from 'jsonwebtoken';
import request from 'supertest';
import { Article } from '../models/Article.js';
import { User } from '../models/User.js';
import app from '../server.js';

describe('Knowledge Base', () => {
    let adminToken, userToken, adminUser;

    beforeEach(async () => {
        // Create admin user
        adminUser = await User.create({
            name: 'Admin',
            email: 'admin@example.com',
            passwordHash: 'hashedpassword',
            role: 'admin'
        });

        // Create regular user
        const user = await User.create({
            name: 'User',
            email: 'user@example.com',
            passwordHash: 'hashedpassword',
            role: 'user'
        });

        // Generate tokens
        adminToken = jwt.sign(
            { userId: adminUser._id, email: adminUser.email, role: adminUser.role },
            process.env.JWT_SECRET || 'test-secret'
        );

        userToken = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'test-secret'
        );
    });

    describe('GET /api/kb', () => {
        beforeEach(async () => {
            await Article.create([
                {
                    title: 'Published Article',
                    body: 'This is a published article about billing',
                    tags: ['billing', 'help'],
                    status: 'published',
                    author: adminUser._id
                },
                {
                    title: 'Draft Article',
                    body: 'This is a draft article',
                    tags: ['tech'],
                    status: 'draft',
                    author: adminUser._id
                }
            ]);
        });

        it('should return published articles for all users', async () => {
            const response = await request(app)
                .get('/api/kb')
                .expect(200);

            expect(response.body.articles).toHaveLength(1);
            expect(response.body.articles[0].status).toBe('published');
        });

        it('should return all articles for admin', async () => {
            const response = await request(app)
                .get('/api/kb')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.articles).toHaveLength(2);
        });

        it('should search articles by query', async () => {
            const response = await request(app)
                .get('/api/kb?search=billing')
                .expect(200);

            expect(response.body.articles).toHaveLength(1);
            expect(response.body.articles[0].title).toBe('Published Article');
        });

        it('should filter by tags', async () => {
            const response = await request(app)
                .get('/api/kb?tags=billing')
                .expect(200);

            expect(response.body.articles).toHaveLength(1);
            expect(response.body.articles[0].tags).toContain('billing');
        });
    });

    describe('POST /api/kb', () => {
        it('should create article as admin', async () => {
            const articleData = {
                title: 'New Article',
                body: 'Article content',
                tags: ['test'],
                status: 'published'
            };

            const response = await request(app)
                .post('/api/kb')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(articleData)
                .expect(201);

            expect(response.body.article.title).toBe('New Article');
            expect(response.body.article.author._id).toBe(adminUser._id.toString());
        });

        it('should reject creation by non-admin', async () => {
            const articleData = {
                title: 'New Article',
                body: 'Article content'
            };

            await request(app)
                .post('/api/kb')
                .set('Authorization', `Bearer ${userToken}`)
                .send(articleData)
                .expect(403);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/kb')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({})
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
        });
    });

    describe('PUT /api/kb/:id', () => {
        let article;

        beforeEach(async () => {
            article = await Article.create({
                title: 'Original Title',
                body: 'Original content',
                tags: ['original'],
                status: 'draft',
                author: adminUser._id
            });
        });

        it('should update article as admin', async () => {
            const updates = {
                title: 'Updated Title',
                status: 'published'
            };

            const response = await request(app)
                .put(`/api/kb/${article._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.article.title).toBe('Updated Title');
            expect(response.body.article.status).toBe('published');
        });

        it('should reject update by non-admin', async () => {
            await request(app)
                .put(`/api/kb/${article._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ title: 'Updated' })
                .expect(403);
        });
    });

    describe('DELETE /api/kb/:id', () => {
        let article;

        beforeEach(async () => {
            article = await Article.create({
                title: 'To Delete',
                body: 'Content',
                author: adminUser._id
            });
        });

        it('should delete article as admin', async () => {
            await request(app)
                .delete(`/api/kb/${article._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const deletedArticle = await Article.findById(article._id);
            expect(deletedArticle).toBeNull();
        });

        it('should reject deletion by non-admin', async () => {
            await request(app)
                .delete(`/api/kb/${article._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);
        });
    });
});
