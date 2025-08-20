# Smart Helpdesk with AI-Powered Agentic Triage

A full-stack MERN application showcasing enterprise-grade architecture with AI-powered ticket automation. Features intelligent ticket classification, knowledge base retrieval, automated response generation, and human-in-the-loop workflows.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Express API    │    │   MongoDB       │
│   (Port 3000)   │◄──►│   (Port 8080)   │◄──►│   Atlas Cloud   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   AI Agent      │◄──►│   Queue System  │
                       │   (5-Step Flow) │    │   (In-Process)  │
                       └─────────────────┘    └─────────────────┘
```

## 🤖 AI Agentic Workflow

### Core Processing Pipeline
```
🎯 PLAN → 🏷️ CLASSIFY → 📚 RETRIEVE → ✍️ DRAFT → ⚡ DECIDE
```

1. **Plan**: Determine workflow steps needed for ticket
2. **Classify**: AI categorization with confidence scoring  
3. **Retrieve**: Smart knowledge base article matching
4. **Draft**: Generate response with mandatory citations
5. **Decide**: Auto-resolve (high confidence) or assign to human

### Decision Logic
- **High Confidence (≥80%)**: Auto-resolve with AI response
- **Low Confidence (<80%)**: Route to human agent for review
- **Complete Audit Trail**: Every step logged with trace IDs

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (for development)
- MongoDB Atlas account (cloud database)

### Development Setup
```bash
# Clone and setup backend
cd backend
npm install
cp .env.example .env  # Configure MongoDB Atlas connection
npm run dev           # Server starts on port 8080

# Setup frontend (new terminal)
cd frontend
npm install
npm run dev          # Client starts on port 3000
```

### Production Setup
```bash
# Build and run
npm run build
npm start
```

### Environment Configuration

Backend `.env` file:
```env
NODE_ENV=development
PORT=8080
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smarthelpdesk
JWT_SECRET=your-super-secret-jwt-key-change-in-production
LLM_PROVIDER=stub
STUB_MODE=true
BCRYPT_ROUNDS=10
```

## 🤖 Agent Workflow

The agentic triage system follows this pipeline:

1. **Plan**: Determine steps needed (classify → retrieve → draft → decide)
2. **Classify**: Categorize ticket using LLM or keyword heuristics
3. **Retrieve**: Search knowledge base for relevant articles
4. **Draft**: Generate response with citations to KB articles
5. **Decide**: Auto-close if confidence ≥ threshold, else assign to human
6. **Log**: Audit trail with trace ID for observability

### Prompts & AI Implementation

- **Classification**: Deterministic keyword-based categorization
- **Knowledge Retrieval**: Text similarity search with relevance scoring
- **Response Generation**: Template-based drafting with article citations
- **Confidence Scoring**: Algorithm-based decision thresholds
- **Fallback Mode**: Stub implementation for consistent testing
- **Guardrails**: Input validation, output schemas, error recovery

## 🧪 Testing & Quality

### Backend Testing
```bash
cd backend && npm test
```
- Unit tests for all services
- Integration tests for API endpoints  
- Mock implementations for external dependencies
- Database seeding for test scenarios

### Frontend Testing  
```bash
cd frontend && npm test
```
- Component testing with React Testing Library
- User interaction testing
- API integration testing
- Accessibility compliance testing

### End-to-End Testing
- Complete workflow testing from ticket creation to resolution
- Role-based access testing
- AI pipeline testing with various scenarios
- Error handling and recovery testing

## 🔒 Security & Best Practices

### Authentication & Authorization
- JWT-based authentication with secure token handling
- Role-based access control (Admin, Agent, User)
- Password complexity requirements (8+ chars, mixed case, numbers)
- Rate limiting on authentication endpoints
- Secure password hashing with bcrypt (12 rounds)

### Input Validation & Security
- Comprehensive input validation with Zod schemas
- SQL injection prevention through Mongoose ODM
- CORS configuration for cross-origin requests
- Helmet.js security headers
- Environment variable protection
- No sensitive data in logs or client responses

### Data Protection
- Audit trail for all user actions
- Immutable logging for compliance
- Trace ID correlation across requests
- Structured JSON logging with Winston
- Error boundary implementation

## 📊 Performance & Observability

### Monitoring & Metrics
- Structured JSON logging with trace ID correlation
- Request/response middleware with timing metrics  
- Health check endpoints (`/healthz`, `/readyz`) for service monitoring
- Complete audit trail for all ticket actions and decisions
- Real-time performance monitoring and alerting

### System Performance
- MongoDB connection pooling and indexed queries
- React 18 optimizations with lazy loading and memoization
- Background task processing for AI workflow
- Memory-efficient data streaming
- Bundle optimization with Vite code splitting

## 🎯 Interview Talking Points

### Architecture & Design Decisions
- **Microservice-ready Architecture**: Modular design with clear separation of concerns
- **AI Integration Strategy**: 5-step deterministic workflow that can easily integrate real LLM APIs
- **Database Design**: Normalized schema with proper indexing for scalability
- **Security-First Approach**: JWT, RBAC, input validation, and comprehensive audit logging

### Technical Challenges Solved
- **Frontend-Backend Validation Sync**: Ensured password complexity rules match across tiers
- **Role-Based UI/UX**: Dynamic navigation and permissions based on user roles
- **Background Processing**: AI workflow runs asynchronously to maintain responsive UI
- **Type Safety**: End-to-end TypeScript for reduced runtime errors

### Development Process
- **Test-Driven Development**: Comprehensive test coverage for critical paths
- **Code Quality**: ESLint, Prettier, and TypeScript strict mode
- **Git Workflow**: Feature branching with clear commit messages
- **Documentation**: Self-documenting code with comprehensive README

### Scalability Considerations
- **Database Indexing**: Strategic indexes on frequently queried fields
- **Caching Strategy**: Ready for Redis integration for session management
- **Monitoring**: Structured logging and health checks for production deployment
- **Container Ready**: Environment-based configuration for containerization

### Demo Script
1. **User Journey**: Register → Create Ticket → AI Triage → Agent Review
2. **Admin Features**: User management, system monitoring, audit logs
3. **Agent Workflow**: Ticket assignment, AI suggestions, resolution tracking
4. **Technical Deep-dive**: Code structure, database design, API architecture

## 🗂️ Data Models

### User
```typescript
{
  _id: ObjectId,
  name: string,
  email: string,
  passwordHash: string,
  role: 'admin' | 'agent' | 'user',
  createdAt: Date
}
```

### Ticket
```typescript
{
  _id: ObjectId,
  title: string,
  description: string,
  category: 'billing' | 'tech' | 'shipping' | 'other',
  status: 'open' | 'triaged' | 'waiting_human' | 'resolved' | 'closed',
  createdBy: ObjectId,
  assignee?: ObjectId,
  agentSuggestionId?: ObjectId,
  replies: Reply[],
  createdAt: Date,
  updatedAt: Date
}
```

### AgentSuggestion
```typescript
{
  _id: ObjectId,
  ticketId: ObjectId,
  predictedCategory: string,
  articleIds: ObjectId[],
  draftReply: string,
  confidence: number,
  autoClosed: boolean,
  modelInfo: {
    provider: string,
    model: string,
    promptVersion: string,
    latencyMs: number
  },
  createdAt: Date
}
```

## 🔧 Development

### Local Development Setup
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend  
cd frontend
npm install
npm run dev

# Start MongoDB & Redis locally
docker compose up mongo redis
```

### Building for Production
```bash
docker compose -f docker-compose.prod.yml up --build
```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Knowledge Base
- `GET /api/kb` - Search articles
- `POST /api/kb` - Create article (admin)
- `PUT /api/kb/:id` - Update article (admin)
- `DELETE /api/kb/:id` - Delete article (admin)

### Tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets` - List tickets
- `GET /api/tickets/:id` - Get ticket details
- `POST /api/tickets/:id/reply` - Add reply (agent)
- `POST /api/tickets/:id/assign` - Assign ticket

### Agent
- `POST /api/agent/triage` - Trigger triage
- `GET /api/agent/suggestion/:ticketId` - Get AI suggestion

### Configuration
- `GET /api/config` - Get settings
- `PUT /api/config` - Update settings (admin)

### Audit
- `GET /api/tickets/:id/audit` - Get audit trail

## 🎯 Key Features Implemented

✅ Complete MERN stack with authentication  
✅ Role-based access control  
✅ Knowledge base CRUD operations  
✅ Intelligent ticket triage with confidence scoring  
✅ Automated responses with KB citations  
✅ Complete audit trail with trace IDs  
✅ Background job processing with BullMQ  
✅ Responsive UI with loading/error states  
✅ Docker containerization  
✅ Comprehensive testing suite  
✅ Security best practices  
✅ Structured logging & observability  

## 🎬 Demo

The application includes:
- Sample users (admin, agent, user accounts)
- Knowledge base articles covering billing, tech, and shipping
- Example tickets for testing the triage workflow

**Test Accounts:**
- Admin: admin@example.com / Password123
- Agent: agent@example.com / Password123  
- User: user@example.com / Password123

## 🏆 Live Demo

🔗 **Deployed Application**: [Your deployment URL here]

---

Built with ❤️ using React, Node.js, MongoDB, and AI-powered automation.
