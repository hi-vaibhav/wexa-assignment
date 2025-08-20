import { z } from 'zod';

// User validation schemas
export const registerSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be less than 100 characters')
        .trim(),
    email: z.string()
        .email('Invalid email format')
        .max(255, 'Email must be less than 255 characters')
        .toLowerCase()
        .trim(),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be less than 128 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    role: z.enum(['admin', 'agent', 'user']).optional().default('user')
});

export const loginSchema = z.object({
    email: z.string()
        .email('Invalid email format')
        .toLowerCase()
        .trim(),
    password: z.string()
        .min(1, 'Password is required')
});

// Article validation schemas
export const createArticleSchema = z.object({
    title: z.string()
        .min(1, 'Title is required')
        .max(200, 'Title must be less than 200 characters')
        .trim(),
    body: z.string()
        .min(1, 'Body is required')
        .max(10000, 'Body must be less than 10000 characters'),
    tags: z.array(z.string().trim().toLowerCase().max(50))
        .max(10, 'Maximum 10 tags allowed')
        .optional()
        .default([]),
    status: z.enum(['draft', 'published']).optional().default('draft')
});

export const updateArticleSchema = createArticleSchema.partial();

// Ticket validation schemas
export const createTicketSchema = z.object({
    title: z.string()
        .min(1, 'Title is required')
        .max(200, 'Title must be less than 200 characters')
        .trim(),
    description: z.string()
        .min(1, 'Description is required')
        .max(5000, 'Description must be less than 5000 characters'),
    category: z.enum(['billing', 'tech', 'shipping', 'other']).optional().default('other'),
    attachments: z.array(z.object({
        url: z.string().url('Invalid URL format'),
        filename: z.string().optional(),
        contentType: z.string().optional()
    })).optional().default([])
});

export const replySchema = z.object({
    content: z.string()
        .min(1, 'Reply content is required')
        .max(5000, 'Reply must be less than 5000 characters'),
    isInternal: z.boolean().optional().default(false)
});

export const assignTicketSchema = z.object({
    assigneeId: z.string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
        .optional()
});

// Config validation schemas
export const updateConfigSchema = z.object({
    autoCloseEnabled: z.boolean().optional(),
    confidenceThreshold: z.number().min(0).max(1).optional(),
    slaHours: z.number().min(1).max(168).optional(),
    categoryThresholds: z.object({
        billing: z.number().min(0).max(1).optional(),
        tech: z.number().min(0).max(1).optional(),
        shipping: z.number().min(0).max(1).optional(),
        other: z.number().min(0).max(1).optional()
    }).optional()
});

// Query validation schemas
export const paginationSchema = z.object({
    page: z.string().transform(val => parseInt(val) || 1).pipe(z.number().min(1)),
    limit: z.string().transform(val => parseInt(val) || 10).pipe(z.number().min(1).max(100)),
    sort: z.string().optional().default('-createdAt'),
    search: z.string().optional()
});

export const ticketQuerySchema = paginationSchema.extend({
    status: z.enum(['open', 'triaged', 'waiting_human', 'resolved', 'closed']).optional(),
    category: z.enum(['billing', 'tech', 'shipping', 'other']).optional(),
    assignee: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    createdBy: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    my: z.string().transform(val => val === 'true').pipe(z.boolean()).optional()
});

export const kbQuerySchema = paginationSchema.extend({
    status: z.enum(['draft', 'published']).optional(),
    tags: z.string().optional()
});

// Validation middleware
export const validate = (schema) => {
    return (req, res, next) => {
        try {
            const validated = schema.parse(req.body);
            req.body = validated;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            next(error);
        }
    };
};

export const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const validated = schema.parse(req.query);
            req.query = validated;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Query validation failed',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            next(error);
        }
    };
};
