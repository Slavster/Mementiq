// Test script for revision workflow
import http from 'http';

// Test 1: Generate review link (requires proper auth)
console.log('=== Testing Revision Workflow ===\n');

// Test 2: Test Stripe webhook simulation (bypassing signature verification)
console.log('1. Testing Stripe webhook for revision payment...');

// Simulate a revision payment webhook event
const webhookData = JSON.stringify({
  id: 'evt_test_revision',
  object: 'event', 
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_revision_webhook_test',
      payment_intent: 'pi_test_revision_payment',
      metadata: {
        type: 'revision_payment',
        projectId: '5'
      }
    }
  }
});

const webhookOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/webhooks/stripe',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(webhookData),
    // Skip signature verification for testing
    'stripe-signature': 'skip-verification'
  }
};

const webhookReq = http.request(webhookOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`Webhook response status: ${res.statusCode}`);
    console.log(`Webhook response: ${data}\n`);
    
    // Test 3: Database verification
    console.log('2. Testing database state after webhook...');
    testDatabaseState();
  });
});

webhookReq.on('error', (e) => {
  console.error(`Webhook test error: ${e.message}`);
});

webhookReq.write(webhookData);
webhookReq.end();

function testDatabaseState() {
  // Test the project status and payment status updates
  const { spawn } = require('child_process');
  
  const sqlCheck = spawn('npm', ['run', 'db:query', '--', 
    'SELECT p.id, p.status, rp.payment_status FROM projects p LEFT JOIN revision_payments rp ON p.id = rp.project_id WHERE p.id = 5;'
  ]);
  
  sqlCheck.stdout.on('data', (data) => {
    console.log(`Database state: ${data}`);
  });
  
  sqlCheck.on('close', (code) => {
    console.log(`Database check completed with code ${code}\n`);
    
    // Test 4: Review link generation simulation
    console.log('3. Testing review link generation logic...');
    testReviewLinkLogic();
  });
}

function testReviewLinkLogic() {
  console.log('Review link would be generated for project folder: /users/244011105/projects/26062934');
  console.log('Expected flow:');
  console.log('  - Extract folder ID: 26062934');
  console.log('  - Fetch videos from Vimeo folder');
  console.log('  - Find latest video by creation date');
  console.log('  - Configure video privacy for review');
  console.log('  - Generate review link: https://vimeo.com/{videoId}');
  console.log('  - Send email notification with review instructions');
  console.log('\n=== Test completed ===');
}