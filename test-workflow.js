const https = require('https');
const http = require('http');

// Simple HTTP request function
function makeRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testWorkflow() {
    try {
        console.log('🔄 Testing Smart Helpdesk AI Workflow...\n');

        // Step 1: Login
        console.log('1. Logging in...');
        const loginResponse = await makeRequest({
            hostname: 'localhost',
            port: 8080,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            email: 'admin@example.com',
            password: 'admin123'
        });

        if (!loginResponse.token) {
            console.error('❌ Login failed:', loginResponse);
            return;
        }

        console.log('✅ Login successful');
        const token = loginResponse.token;

        // Step 2: Create a ticket to trigger AI workflow
        console.log('\n2. Creating ticket to trigger AI triage...');
        const ticketResponse = await makeRequest({
            hostname: 'localhost',
            port: 8080,
            path: '/api/tickets',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, {
            title: 'Cannot access my dashboard - urgent test',
            description: 'Hi, I am having trouble accessing my account dashboard. When I try to log in, I get a blank screen. This is preventing me from completing my work. Please help urgently!',
            category: 'Account Access',
            priority: 'High'
        });

        if (!ticketResponse.id) {
            console.error('❌ Ticket creation failed:', ticketResponse);
            return;
        }

        console.log('✅ Ticket created:', ticketResponse.id);

        // Step 3: Wait and check ticket status
        console.log('\n3. Waiting for AI triage to complete...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const ticketDetails = await makeRequest({
            hostname: 'localhost',
            port: 8080,
            path: `/api/tickets/${ticketResponse.id}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Final ticket status:');
        console.log(`   - Status: ${ticketDetails.status}`);
        console.log(`   - AI Classification: ${ticketDetails.aiClassification || 'N/A'}`);
        console.log(`   - AI Confidence: ${ticketDetails.aiConfidence || 'N/A'}`);
        console.log(`   - Auto-resolved: ${ticketDetails.autoResolved || false}`);

        // Step 4: Check audit logs
        console.log('\n4. Checking workflow audit logs...');
        const auditLogs = await makeRequest({
            hostname: 'localhost',
            port: 8080,
            path: `/api/audit/logs?ticketId=${ticketResponse.id}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (auditLogs.logs && auditLogs.logs.length > 0) {
            console.log('✅ Workflow steps completed:');
            auditLogs.logs.forEach((log, index) => {
                console.log(`   ${index + 1}. ${log.action} - ${log.details || 'No details'}`);
            });
        } else {
            console.log('⚠️  No audit logs found');
        }

        console.log('\n🎉 Test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testWorkflow();
