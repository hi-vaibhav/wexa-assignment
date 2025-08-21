// Test script to create a ticket and trigger AI processing
const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';

async function testTicketProcessing() {
    try {
        console.log('🔐 Logging in as user...');

        // Login as user
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'user@example.com',
            password: 'Password123'
        });

        const token = loginResponse.data.token;
        console.log('✅ Login successful');

        // Create a ticket
        console.log('🎫 Creating test ticket...');
        const ticketResponse = await axios.post(`${BASE_URL}/tickets`, {
            title: 'Internet Connection Problem',
            description: 'My internet connection is not working. I tried restarting my router but it still does not work. Can you help me?',
            category: 'technical',
            priority: 'medium'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Ticket created:', ticketResponse.data.ticket._id);
        console.log('🤖 AI Agent should now process this ticket automatically...');
        console.log('📝 Check the backend logs for AI processing activity');

        // Wait a moment and check ticket status
        setTimeout(async () => {
            try {
                const ticketStatus = await axios.get(`${BASE_URL}/tickets/${ticketResponse.data.ticket._id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                console.log('\n📊 Ticket Status After Processing:');
                console.log('Status:', ticketStatus.data.ticket.status);
                console.log('Agent Response:', ticketStatus.data.ticket.agentResponse || 'None yet');
                console.log('AI Confidence:', ticketStatus.data.ticket.aiConfidence || 'Not calculated');
            } catch (error) {
                console.error('Error checking ticket status:', error.message);
            }
        }, 5000);

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testTicketProcessing();
