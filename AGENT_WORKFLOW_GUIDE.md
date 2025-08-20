# Agent Workflow Guide - How Tickets Are Resolved

## 🔐 Updated Login Credentials

**All accounts now use the password: `Password123`**

| Role  | Email | Password | Access Level |
|-------|-------|----------|--------------|
| Admin | admin@example.com | Password123 | Full system access |
| Agent | agent@example.com | Password123 | Ticket management, KB access |
| User  | user@example.com | Password123 | Create tickets, view own tickets |

## 🎯 How the AI Agent Workflow Works

### 1. **Ticket Creation (User)**
When a user creates a ticket, the system automatically:
- Creates the ticket in "open" status
- Triggers the AI triage workflow
- Logs all steps in audit trail

### 2. **AI Triage Process (Automatic)**
The AI agent performs these steps automatically:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   1. CLASSIFY   │───▶│  2. RETRIEVE KB  │───▶│  3. DRAFT REPLY │
│   Category      │    │   Articles       │    │   Response      │
│   Confidence    │    │   Citations      │    │   Citations     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  AUDIT LOGGED   │    │  AUDIT LOGGED    │    │  AUDIT LOGGED   │
│ AGENT_CLASSIFIED│    │  KB_RETRIEVED    │    │ DRAFT_GENERATED │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                  │
                                  ▼
                        ┌─────────────────┐
                        │  4. DECISION    │
                        │  Auto-close OR  │
                        │  Assign Human   │
                        └─────────────────┘
```

### 3. **AI Decision Logic**
Based on confidence score:
- **High Confidence (≥80%)**: Auto-resolve ticket with AI response
- **Low Confidence (<80%)**: Assign to human agent for review

### 4. **Agent Interface (Human Review)**
When logged in as an agent, you can:

#### View Assigned Tickets
```http
GET /api/tickets?assignee=me&status=waiting_human
```

#### View AI Suggestions
```http
GET /api/agent/suggestion/{ticketId}
```

#### Accept or Reject AI Suggestions
```http
POST /api/agent/suggestion/{suggestionId}/accept
POST /api/agent/suggestion/{suggestionId}/reject
```

## 🔧 Testing the Workflow

### Step 1: Login as User
```bash
# Frontend: http://localhost:3000
# Email: user@example.com
# Password: Password123
```

### Step 2: Create a Test Ticket
**Title**: "Cannot reset my password"
**Description**: "I forgot my password and the reset link isn't working. Please help!"
**Category**: "Account Access"
**Priority**: "High"

### Step 3: AI Processing (Automatic)
The system will:
1. Classify as "tech" category (password-related keywords)
2. Search KB for password reset articles
3. Generate draft response with citations
4. Decide: auto-close (high confidence) or assign to agent

### Step 4: Login as Agent to Review
```bash
# Frontend: http://localhost:3000
# Email: agent@example.com  
# Password: Password123
```

### Step 5: Agent Dashboard Features
- **Assigned Tickets**: See tickets requiring human review
- **AI Suggestions**: View AI-generated responses
- **Accept/Reject**: Approve AI suggestions or provide custom response
- **Knowledge Base**: Search and reference articles

## 📊 Monitoring the Process

### Check Audit Logs
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8080/api/audit/logs?ticketId=TICKET_ID"
```

### View Ticket Status
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8080/api/tickets/TICKET_ID"
```

### See AI Suggestions
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8080/api/agent/suggestion/TICKET_ID"
```

## 🎨 Frontend Experience

### User Dashboard
- Create new tickets
- View ticket status and responses
- See resolution timeline

### Agent Dashboard  
- Assigned tickets queue
- AI suggestion review panel
- Knowledge base search
- Response drafting tools

### Admin Dashboard
- System analytics
- User management
- Configuration settings
- Full audit trail

## 🔄 Current Workflow Status

✅ **AI Triage**: Fully operational with stub mode
✅ **Classification**: Keyword-based category detection
✅ **KB Retrieval**: Smart article matching
✅ **Draft Generation**: Contextual responses with citations
✅ **Decision Engine**: Confidence-based routing
✅ **Audit Logging**: Complete step tracking
✅ **Agent Interface**: Suggestion review and management

## 🚀 Try It Now!

1. **Login as User**: Create a password reset ticket
2. **Watch AI Process**: Check backend logs for workflow steps
3. **Login as Agent**: Review AI suggestions and take action
4. **Verify Resolution**: See complete audit trail

**The system is fully operational and ready for demonstration!**
