const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Simple require for models
const User = require('./src/models/User.js').User;
const Article = require('./src/models/Article.js').Article;
const Ticket = require('./src/models/Ticket.js').Ticket;
const Config = require('./src/models/Config.js').Config;

require('dotenv').config();

const seedData = async () => {
    try {
        console.log('🌱 Starting database seeding...');

        // Connect to database
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('🧹 Clearing existing data...');
        await User.deleteMany({});
        await Article.deleteMany({});
        await Ticket.deleteMany({});
        await Config.deleteMany({});
        console.log('✅ Cleared existing data');

        // Create users
        console.log('👥 Creating users...');
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash('password123', saltRounds);

        const users = await User.insertMany([
            {
                name: 'Admin User',
                email: 'admin@example.com',
                passwordHash: hashedPassword,
                role: 'admin'
            },
            {
                name: 'Agent Smith',
                email: 'agent@example.com',
                passwordHash: hashedPassword,
                role: 'agent'
            },
            {
                name: 'John Customer',
                email: 'user@example.com',
                passwordHash: hashedPassword,
                role: 'user'
            }
        ]);
        console.log(`✅ Created ${users.length} users`);

        // Create a simple article
        console.log('📄 Creating articles...');
        const admin = users.find(u => u.role === 'admin');
        const articles = await Article.insertMany([
            {
                title: 'How to Reset Your Password',
                body: 'To reset your password, click on the "Forgot Password" link on the login page.',
                tags: ['account', 'password'],
                status: 'published',
                author: admin._id
            }
        ]);
        console.log(`✅ Created ${articles.length} articles`);

        // Create a simple ticket
        console.log('🎫 Creating tickets...');
        const user = users.find(u => u.role === 'user');
        const tickets = await Ticket.insertMany([
            {
                title: 'Need help with login',
                description: 'I cannot remember my password and need help logging in.',
                category: 'tech',
                status: 'open',
                createdBy: user._id,
                priority: 'medium'
            }
        ]);
        console.log(`✅ Created ${tickets.length} tickets`);

        // Create config
        console.log('⚙️ Creating configuration...');
        const config = await Config.create({
            autoCloseEnabled: true,
            confidenceThreshold: 0.78,
            slaHours: 24,
            maxTicketsPerUser: 10
        });
        console.log('✅ Created configuration');

        console.log('\n🎉 Database seeded successfully!');
        console.log('\n🔑 Test Accounts:');
        console.log('👑 Admin: admin@example.com / password123');
        console.log('🎧 Agent: agent@example.com / password123');
        console.log('👤 User: user@example.com / password123');

        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

seedData();
