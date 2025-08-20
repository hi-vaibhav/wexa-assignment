import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Article } from '../models/Article.js';
import { Config } from '../models/Config.js';
import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

const seedData = async () => {
    try {
        console.log('Starting database seeding...');

        // Connect to database
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/helpdesk');
        logger.info('Connected to MongoDB for seeding');

        console.log('Clearing existing data...');
        // Clear existing data
        await Promise.all([
            User.deleteMany({}),
            Article.deleteMany({}),
            Ticket.deleteMany({}),
            Config.deleteMany({})
        ]);
        logger.info('Cleared existing data');

        console.log('Creating users...');
        // Create users
        const users = await createUsers();
        logger.info(`Created ${users.length} users`);

        console.log('Creating articles...');
        // Create articles
        const articles = await createArticles(users);
        logger.info(`Created ${articles.length} articles`);

        console.log('Creating tickets...');
        // Create tickets
        const tickets = await createTickets(users);
        logger.info(`Created ${tickets.length} tickets`);

        console.log('Creating config...');
        // Create config
        const config = await createConfig();
        logger.info('Created configuration');

        logger.info('✅ Database seeded successfully!');
        logger.info('\n🔑 Test Accounts:');
        logger.info('Admin: admin@example.com / Password123');
        logger.info('Agent: agent@example.com / Password123');
        logger.info('User: user@example.com / Password123');

        console.log('Closing database connection...');
        await mongoose.connection.close();
        console.log('Database connection closed. Exiting...');
        process.exit(0);
    } catch (error) {
        logger.error('Seeding failed:', error);
        console.error('Seeding failed:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

const createUsers = async () => {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('Password123', saltRounds);

    const users = [
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
        },
        {
            name: 'Sarah Agent',
            email: 'sarah@example.com',
            passwordHash: hashedPassword,
            role: 'agent'
        },
        {
            name: 'Mike Customer',
            email: 'mike@example.com',
            passwordHash: hashedPassword,
            role: 'user'
        },
        {
            name: 'AI Assistant',
            email: 'system@helpdesk.ai',
            passwordHash: 'system',
            role: 'agent'
        }
    ];

    return await User.insertMany(users);
};

const createArticles = async (users) => {
    const admin = users.find(u => u.role === 'admin');

    const articles = [
        {
            title: 'How to Update Your Payment Method',
            body: `# Updating Your Payment Method

To update your payment method:

1. **Log into your account**
   - Go to the Account Settings page
   - Click on "Billing & Payment"

2. **Add a new payment method**
   - Click "Add Payment Method"
   - Enter your new card details
   - Verify the information

3. **Set as default**
   - Select the new payment method
   - Click "Set as Default"

4. **Remove old payment method** (optional)
   - Click on the old payment method
   - Select "Remove"

## Common Issues

- **Card declined**: Check that your card is valid and has sufficient funds
- **Billing address mismatch**: Ensure your billing address matches your card
- **Expired card**: Update with a new expiration date

If you continue to experience issues, please contact our support team.`,
            tags: ['billing', 'payments', 'account'],
            status: 'published',
            author: admin._id,
            views: 156,
            helpful: 89,
            notHelpful: 12
        },
        {
            title: 'Troubleshooting 500 Internal Server Errors',
            body: `# Resolving 500 Internal Server Errors

A 500 Internal Server Error indicates a problem with our servers. Here's how to address it:

## Immediate Steps

1. **Refresh the page**
   - Wait 30 seconds and try again
   - Sometimes it's a temporary issue

2. **Clear browser cache**
   - Press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - This forces a fresh page load

3. **Try incognito/private mode**
   - This eliminates browser extension conflicts

## If the error persists

1. **Check our status page**
   - Visit status.ourservice.com
   - Look for any ongoing incidents

2. **Try a different browser**
   - This helps identify browser-specific issues

3. **Contact support**
   - Include the exact error message
   - Mention what you were trying to do
   - Provide your browser and operating system

## For Developers

If you're integrating with our API:

- Check your API key is valid
- Verify request format matches documentation
- Review rate limiting guidelines
- Check server logs for detailed error information

We typically resolve 500 errors within 1 hour of detection.`,
            tags: ['tech', 'errors', 'troubleshooting'],
            status: 'published',
            author: admin._id,
            views: 234,
            helpful: 178,
            notHelpful: 23
        },
        {
            title: 'Tracking Your Shipment',
            body: `# How to Track Your Order

Stay updated on your shipment with these tracking options:

## Order Confirmation Email

After placing your order, you'll receive:
- Order confirmation with tracking number
- Estimated delivery date
- Direct tracking link

## Track via Website

1. **Go to the tracking page**
   - Visit our Track Order page
   - Enter your order number or tracking number

2. **View shipment status**
   - Order confirmed
   - Preparing for shipment
   - Shipped
   - Out for delivery
   - Delivered

## Track via Mobile App

- Download our mobile app
- Sign in to your account
- View all active shipments
- Get push notifications for updates

## Shipping Partners

We work with several carriers:
- **Standard shipping**: USPS (3-5 business days)
- **Express shipping**: FedEx (1-2 business days)
- **Overnight**: UPS (next business day)

## Common Delivery Issues

**Package not delivered**
- Check with neighbors
- Look for delivery notice
- Contact carrier directly

**Wrong address**
- Contact us immediately
- We can redirect before delivery

**Damaged package**
- Take photos
- Don't discard packaging
- Contact us within 48 hours

Need help? Our shipping support team is available 24/7.`,
            tags: ['shipping', 'delivery', 'tracking'],
            status: 'published',
            author: admin._id,
            views: 189,
            helpful: 156,
            notHelpful: 8
        },
        {
            title: 'Account Security Best Practices',
            body: `# Keeping Your Account Secure

Protect your account with these security measures:

## Strong Passwords

- Use at least 12 characters
- Include uppercase, lowercase, numbers, and symbols
- Avoid personal information
- Don't reuse passwords from other sites

## Two-Factor Authentication (2FA)

1. **Enable 2FA**
   - Go to Security Settings
   - Click "Enable Two-Factor Authentication"
   - Choose SMS or authenticator app

2. **Backup codes**
   - Save your backup codes securely
   - Use them if you lose your phone

## Account Monitoring

- Review login activity regularly
- Set up email alerts for new logins
- Report suspicious activity immediately

## Safe Browsing

- Always log out on shared computers
- Use secure networks (avoid public WiFi)
- Keep your browser updated
- Be cautious of phishing emails

Contact us immediately if you suspect unauthorized access.`,
            tags: ['account', 'security', 'passwords'],
            status: 'published',
            author: admin._id,
            views: 98,
            helpful: 78,
            notHelpful: 5
        },
        {
            title: 'API Rate Limiting Guidelines',
            body: `# API Rate Limiting

Our API implements rate limiting to ensure fair usage:

## Rate Limits

- **Free tier**: 1,000 requests per hour
- **Pro tier**: 10,000 requests per hour
- **Enterprise**: Custom limits

## Headers

Check these response headers:
- \`X-RateLimit-Limit\`: Your rate limit
- \`X-RateLimit-Remaining\`: Requests remaining
- \`X-RateLimit-Reset\`: When the limit resets

## Best Practices

1. **Implement exponential backoff**
2. **Cache responses when possible**
3. **Use webhooks instead of polling**
4. **Batch requests when available**

## Error Handling

When rate limited (429 status):
- Wait for the reset time
- Don't retry immediately
- Implement proper error handling

Contact our API team for custom rate limits.`,
            tags: ['tech', 'api', 'development'],
            status: 'published',
            author: admin._id,
            views: 67,
            helpful: 45,
            notHelpful: 3
        },
        {
            title: 'Refund and Return Policy',
            body: `# Returns and Refunds

We want you to be completely satisfied with your purchase.

## Return Window

- **Physical products**: 30 days from delivery
- **Digital products**: 14 days from purchase
- **Services**: 7 days from activation

## Return Conditions

Items must be:
- In original condition
- In original packaging
- Include all accessories
- Have original receipt or order number

## How to Return

1. **Request return authorization**
   - Contact customer service
   - Provide order number
   - Explain reason for return

2. **Ship the item**
   - Use provided return label
   - Package securely
   - Include return form

3. **Refund processing**
   - Inspection takes 2-3 business days
   - Refund issued to original payment method
   - Processing takes 5-7 business days

## Exceptions

Items that cannot be returned:
- Personalized products
- Perishable goods
- Digital downloads (after access)
- Gift cards

Questions? Contact our returns team at returns@example.com`,
            tags: ['billing', 'returns', 'refunds'],
            status: 'published',
            author: admin._id,
            views: 145,
            helpful: 112,
            notHelpful: 15
        }
    ];

    return await Article.insertMany(articles);
};

const createTickets = async (users) => {
    const user = users.find(u => u.email === 'user@example.com');
    const mike = users.find(u => u.email === 'mike@example.com');
    const agent = users.find(u => u.role === 'agent');

    const tickets = [
        {
            title: 'Refund for double charge on order #1234',
            description: `Hi,

I was charged twice for my recent order #1234. I placed the order on January 15th for $89.99, but I see two charges on my credit card statement:

- Charge 1: $89.99 on Jan 15, 2024
- Charge 2: $89.99 on Jan 15, 2024

I only placed one order and only received one confirmation email. Can you please refund the duplicate charge?

My order details:
- Order #1234
- Email: user@example.com
- Last 4 digits of card: 1234

Thank you for your help!`,
            category: 'billing',
            status: 'open',
            createdBy: user._id,
            priority: 'medium'
        },
        {
            title: 'App shows 500 error on login',
            description: `I'm getting a 500 Internal Server Error every time I try to log into the mobile app. This started happening yesterday around 3 PM EST.

Error details:
- Platform: iOS 17.2
- App version: 2.1.4
- Error message: "Something went wrong. Please try again later."

I've tried:
- Restarting the app
- Restarting my phone
- Reinstalling the app
- Clearing app cache

The web version works fine, it's only the mobile app that's having issues.

Please help!`,
            category: 'tech',
            status: 'triaged',
            createdBy: user._id,
            assignee: agent._id,
            priority: 'high'
        },
        {
            title: 'Where is my package? Order #5678',
            description: `Hi there,

I ordered a product 10 days ago and the tracking shows it was supposed to be delivered 5 days ago, but I still haven't received it.

Order details:
- Order #5678
- Tracking number: TRK789456123
- Expected delivery: January 10th
- Current date: January 15th

The tracking just says "Out for delivery" since January 10th with no updates. I've checked with my neighbors and building manager - no one has seen the package.

Can you please help me locate my order or arrange a replacement?

Thanks!`,
            category: 'shipping',
            status: 'waiting_human',
            createdBy: mike._id,
            priority: 'medium',
            replies: [
                {
                    author: agent._id,
                    content: `Hi Mike,

I'm sorry to hear about the delay with your package. I've checked with our shipping partner and it appears there was an issue with the delivery truck that day.

I've initiated a trace on your package and contacted the local distribution center. They should have an update for us within 24 hours.

In the meantime, I'm preparing a replacement order that we can ship out immediately if the original package cannot be located.

I'll update you as soon as I hear back from the shipping company.

Best regards,
Agent Smith`,
                    isInternal: false
                }
            ]
        },
        {
            title: 'Cannot access premium features after upgrade',
            description: `I upgraded to the Pro plan yesterday but I still can't access any premium features. The billing shows the charge went through successfully.

Account details:
- Email: mike@example.com
- Plan: Recently upgraded to Pro
- Billing: Charged $29.99 on Jan 14th

Features I'm trying to access:
- Advanced analytics
- Priority support
- Export functionality

All of these still show "Upgrade to Pro" messages. I've tried logging out and back in.

Please activate my Pro features or refund the charge.`,
            category: 'billing',
            status: 'resolved',
            createdBy: mike._id,
            assignee: agent._id,
            priority: 'medium',
            resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            replies: [
                {
                    author: agent._id,
                    content: `Hi Mike,

Thank you for upgrading to Pro! I can see the payment was processed successfully.

The issue was that your account upgrade hadn't been fully propagated across all our servers. I've manually triggered the upgrade process and all your Pro features should now be active.

Please try accessing the premium features again and let me know if you encounter any issues.

Welcome to Pro!

Best regards,
Agent Smith`,
                    isInternal: false
                }
            ]
        },
        {
            title: 'Question about API documentation',
            description: `Hi,

I'm trying to integrate with your API but I'm having trouble understanding the authentication flow described in the documentation.

Specifically:
1. Do I need to refresh tokens manually or is it automatic?
2. What's the expiration time for access tokens?
3. Are there webhook endpoints for real-time updates?

The documentation mentions these but doesn't provide clear examples.

Could you point me to more detailed documentation or provide some sample code?

Thanks!`,
            category: 'tech',
            status: 'open',
            createdBy: user._id,
            priority: 'low'
        }
    ];

    return await Ticket.insertMany(tickets);
};

const createConfig = async () => {
    const config = new Config({
        autoCloseEnabled: true,
        confidenceThreshold: 0.78,
        slaHours: 24,
        maxTicketsPerUser: 10,
        categoryThresholds: {
            billing: 0.75,
            tech: 0.80,
            shipping: 0.70,
            other: 0.85
        },
        agentSettings: {
            maxRetries: 3,
            timeoutMs: 30000,
            enableFallback: true
        }
    });

    return await config.save();
};

// Run seeding if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    seedData();
}

export { seedData };

