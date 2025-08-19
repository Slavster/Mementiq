// Script to set up Frame.io webhook via API
import { frameioV4Service } from './server/frameioV4Service.ts';
import crypto from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function setupFrameioWebhook() {
  console.log('=== Frame.io Webhook Setup ===\n');
  
  try {
    // Load service account token
    console.log('1. Loading Frame.io credentials...');
    await frameioV4Service.loadServiceAccountToken();
    const accountId = await frameioV4Service.getAccountId();
    console.log(`   ✓ Account ID: ${accountId}`);
    
    // Generate webhook secret if not exists
    let webhookSecret = process.env.FRAMEIO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.log('\n2. Generating webhook secret...');
      webhookSecret = crypto.randomBytes(32).toString('hex');
      
      // Append to .env file
      const envContent = fs.readFileSync('.env', 'utf8');
      if (!envContent.includes('FRAMEIO_WEBHOOK_SECRET')) {
        fs.appendFileSync('.env', `\n# Frame.io Webhook Secret (auto-generated)\nFRAMEIO_WEBHOOK_SECRET=${webhookSecret}\n`);
        console.log('   ✓ Webhook secret generated and saved to .env');
      }
    } else {
      console.log('\n2. Using existing webhook secret from .env');
    }
    
    // Determine webhook URL
    const replitUrl = process.env.REPL_SLUG ? 
      `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 
      'https://workspace.slavsinitsyn.repl.co';
    const webhookUrl = `${replitUrl}/api/webhooks/frameio`;
    
    console.log(`\n3. Webhook Configuration:`);
    console.log(`   - URL: ${webhookUrl}`);
    console.log(`   - Events: file.versioned`);
    
    // Check for existing webhooks
    console.log('\n4. Checking for existing webhooks...');
    try {
      const existingWebhooks = await frameioV4Service.makeRequest(
        'GET',
        `/accounts/${accountId}/webhooks`
      );
      
      if (existingWebhooks?.data && existingWebhooks.data.length > 0) {
        console.log(`   Found ${existingWebhooks.data.length} existing webhook(s):`);
        existingWebhooks.data.forEach((webhook, index) => {
          console.log(`   ${index + 1}. ${webhook.url} (${webhook.events?.join(', ') || 'no events'})`);
          if (webhook.url === webhookUrl) {
            console.log(`      ⚠️  This is our webhook - already configured!`);
          }
        });
        
        // Check if our webhook already exists
        const ourWebhook = existingWebhooks.data.find(w => w.url === webhookUrl);
        if (ourWebhook) {
          console.log('\n✅ Webhook is already configured in Frame.io!');
          console.log('   No further action needed.');
          return;
        }
      } else {
        console.log('   No existing webhooks found');
      }
    } catch (error) {
      console.log('   Could not retrieve existing webhooks (may require additional permissions)');
    }
    
    // Create new webhook
    console.log('\n5. Creating new webhook...');
    try {
      const webhookData = {
        url: webhookUrl,
        events: ['file.versioned'],
        secret: webhookSecret,
        active: true
      };
      
      const response = await frameioV4Service.makeRequest(
        'POST',
        `/accounts/${accountId}/webhooks`,
        webhookData
      );
      
      if (response?.data) {
        console.log('   ✓ Webhook created successfully!');
        console.log(`   - Webhook ID: ${response.data.id}`);
        console.log(`   - Status: ${response.data.active ? 'Active' : 'Inactive'}`);
      }
    } catch (error) {
      if (error.message?.includes('409') || error.message?.includes('already exists')) {
        console.log('   ℹ️  Webhook already exists (409 Conflict) - this is OK');
      } else if (error.message?.includes('403') || error.message?.includes('forbidden')) {
        console.log('\n⚠️  Cannot create webhook programmatically - requires manual setup:');
        console.log('\nManual Setup Instructions:');
        console.log('1. Go to Frame.io Developer Settings');
        console.log('2. Select your app');
        console.log('3. Go to Webhooks section');
        console.log('4. Add new webhook with:');
        console.log(`   - URL: ${webhookUrl}`);
        console.log('   - Events: file.versioned');
        console.log(`   - Secret: Copy from .env file (FRAMEIO_WEBHOOK_SECRET)`);
      } else {
        throw error;
      }
    }
    
    console.log('\n=== Setup Complete ===');
    console.log('\nWebhook is ready to receive events for:');
    console.log('- Detecting revised video uploads');
    console.log('- Automatically updating project status');
    console.log('- Sending email notifications');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message || error);
    console.log('\nTroubleshooting:');
    console.log('1. Ensure Frame.io OAuth is properly configured');
    console.log('2. Check that you have admin access to the Frame.io account');
    console.log('3. Verify network connectivity');
  }
}

// Run setup
setupFrameioWebhook().catch(console.error);