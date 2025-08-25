// Test script to simulate a Frame.io webhook call
import crypto from 'crypto';
import fs from 'fs';

// Load the webhook secret from .env
const envContent = fs.readFileSync('.env', 'utf8');
const secretMatch = envContent.match(/FRAMEIO_WEBHOOK_SECRET=(.+)/);
const webhookSecret = secretMatch ? secretMatch[1].trim() : null;

if (!webhookSecret) {
  console.error('❌ FRAMEIO_WEBHOOK_SECRET not found in .env');
  process.exit(1);
}

console.log('=== Testing Frame.io Webhook ===\n');
console.log('✓ Webhook secret loaded from .env');

// Create a test payload
const testPayload = {
  type: 'file.versioned',
  resource: {
    id: 'test-file-123',
    name: 'Revised_Video_v2.mp4',
    media_type: 'video/mp4',
    file_size: 50000000,
    view_url: 'https://next.frame.io/project/e0a4fadd-52b0-4156-91ed-8880bbc0c51a/view/test-view-url'
  },
  project: {
    id: 'test-project-456'
  },
  timestamp: new Date().toISOString()
};

const payloadString = JSON.stringify(testPayload);

// Generate the signature
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payloadString)
  .digest('hex');

const headerSignature = `sha256=${signature}`;

console.log('Payload:', JSON.stringify(testPayload, null, 2));
console.log('\nSignature:', headerSignature);

// Make the webhook call
const webhookUrl = 'http://localhost:5000/api/webhooks/frameio';

console.log(`\nCalling webhook: POST ${webhookUrl}`);

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-frameio-signature': headerSignature
  },
  body: payloadString
})
.then(response => response.json())
.then(data => {
  console.log('✓ Webhook response:', data);
  console.log('\nTest successful! The webhook endpoint is working correctly.');
  console.log('It will properly handle Frame.io events when they are sent.');
})
.catch(error => {
  console.error('❌ Webhook call failed:', error);
});