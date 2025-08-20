# AI Agent Prompts Documentation

This document contains all the prompts and instructions used by the Smart Helpdesk AI agent for ticket triage.

## Classification Prompt

**Purpose**: Categorize support tickets into predefined categories with confidence scoring.

### System Instructions
```
You are a support ticket classification system. Your task is to categorize incoming support tickets into one of four categories: billing, tech, shipping, or other.

For each ticket, you must:
1. Analyze the ticket content (title + description)
2. Assign the most appropriate category
3. Provide a confidence score between 0.0 and 1.0
4. Return the result in strict JSON format
```

### User Prompt Template
```
Classify the following support ticket into one of these categories: billing, tech, shipping, other.
Provide a confidence score between 0 and 1.

Ticket Content:
Title: {ticket.title}
Description: {ticket.description}

Category Definitions:
- billing: Payment issues, refunds, invoices, charges, pricing questions
- tech: Technical problems, bugs, errors, login issues, system failures  
- shipping: Delivery questions, tracking, package status, address changes
- other: General inquiries, information requests, other support needs

Respond with JSON only:
{"predictedCategory": "category", "confidence": 0.95}
```

### Expected Output Schema
```json
{
  "predictedCategory": "billing|tech|shipping|other",
  "confidence": 0.0-1.0
}
```

---

## Draft Reply Generation Prompt

**Purpose**: Generate professional support responses with knowledge base citations.

### System Instructions
```
You are a professional customer support agent. Your task is to generate helpful, empathetic, and solution-oriented responses to customer support tickets.

Guidelines:
1. Maintain a professional, friendly tone
2. Acknowledge the customer's issue
3. Provide clear, actionable solutions
4. Always include relevant knowledge base article citations
5. Use numbered references [1], [2], etc. for citations
6. Keep responses concise but comprehensive
7. End with an invitation for further assistance
```

### User Prompt Template
```
Generate a professional support response for this customer ticket.
Use the provided knowledge base articles as references and include numbered citations.

Customer Ticket:
Title: {ticket.title}
Description: {ticket.description}
Category: {predicted_category}

Available Knowledge Base Articles:
{articles.map((article, index) => `
[${index + 1}] ${article.title}
Summary: ${article.body.substring(0, 200)}...
Tags: ${article.tags.join(', ')}
`).join('\n')}

Requirements:
1. Start with empathetic acknowledgment
2. Provide specific solutions based on the KB articles
3. Include numbered citations [1], [2] for each referenced article
4. Maintain professional tone throughout
5. Offer clear next steps
6. End with support team signature

Generate a helpful, professional response with citations:
```

### Expected Output Schema
```json
{
  "draftReply": "Professional response text with [1] citations [2]...",
  "citations": ["article_id_1", "article_id_2", "article_id_3"]
}
```

---

## Deterministic Stub Implementation

For development and testing without LLM API keys, the system uses deterministic keyword-based classification:

### Classification Keywords
```javascript
const keywords = {
    billing: ['refund', 'invoice', 'payment', 'charge', 'billing', 'credit', 'money', 'price', 'cost', 'fee'],
    tech: ['error', 'bug', 'crash', 'broken', 'technical', 'code', 'stack', 'login', 'password', 'api'],
    shipping: ['delivery', 'shipment', 'package', 'shipping', 'tracking', 'arrived', 'delayed', 'address'],
    other: ['general', 'question', 'help', 'support', 'information', 'contact']
};
```

### Response Templates
```javascript
const templates = {
    billing: "Thank you for contacting us regarding your billing inquiry. I understand your concern and I'm here to help resolve this issue promptly.",
    tech: "Thank you for reporting this technical issue. I apologize for any inconvenience this may have caused. Let me help you resolve this problem.",
    shipping: "Thank you for contacting us about your shipment. I understand you're looking for information about your delivery and I'm here to help.",
    other: "Thank you for reaching out to our support team. I'm here to assist you with your inquiry."
};
```

---

## Guardrails & Safety Measures

### Input Validation
- Maximum ticket content length: 10,000 characters
- Required fields: title, description
- Sanitization of HTML/script content
- Rate limiting on classification requests

### Output Validation
- Confidence scores clamped between 0.0-1.0
- Categories restricted to predefined list
- Response length limits (500-2000 characters)
- Citation validation against provided articles

### Error Handling
- Fallback to 'other' category if classification fails
- Generic helpful response if draft generation fails
- Comprehensive logging of all LLM interactions
- Timeout protection (30 seconds max)

### Model Configuration
```javascript
{
  provider: "openai",
  model: "gpt-3.5-turbo",
  temperature: 0.3,
  max_tokens: 1000,
  top_p: 0.9,
  frequency_penalty: 0.0,
  presence_penalty: 0.0
}
```

---

## Prompt Versioning

- **Current Version**: v1.0
- **Last Updated**: 2025-08-20
- **Changes**: Initial implementation with deterministic fallback

### Version History
- v1.0 (2025-08-20): Initial prompts for classification and draft generation
- Future versions will be tracked here with changelog

---

## Testing & Validation

### Test Cases
1. **Billing tickets**: Keywords trigger correct classification
2. **Technical tickets**: Error terms and stack traces identified
3. **Shipping tickets**: Delivery and tracking keywords recognized
4. **Mixed content**: Confidence scoring works appropriately
5. **Edge cases**: Empty content, unusual formatting handled

### Performance Metrics
- Classification accuracy: >90% for clear cases
- Average confidence score: 0.75+ for correct classifications
- Response generation time: <2 seconds
- Citation accuracy: 100% valid references

---

This documentation ensures transparency in AI decision-making and enables prompt optimization and debugging.
