import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    body: {
        type: String,
        required: true,
        maxlength: 10000
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 50
    }],
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    helpful: {
        type: Number,
        default: 0
    },
    notHelpful: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Text index for search
articleSchema.index({
    title: 'text',
    body: 'text',
    tags: 'text'
});

// Other indexes
articleSchema.index({ status: 1 });
articleSchema.index({ tags: 1 });
articleSchema.index({ createdAt: -1 });

export const Article = mongoose.model('Article', articleSchema);
