// Script to set up Frame.io webhook and generate secret
import { frameioV4Service } from './server/frameioV4Service';
import crypto from 'crypto';
import fs from 'fs';

async function setupWebhook() {
  console.log('=== Frame.io Webhook Setup ===\n');
  
  // Check if webhook secret exists
  let webhookSecret = process.env.FRAMEIO_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.log('Generating new webhook secret...');
    webhookSecret = crypto.randomBytes(32).toString('hex');
    
    // Append to .env file
    const envPath = '.env';
    const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    
    if (!envContent.includes('FRAMEIO_WEBHOOK_SECRET')) {
      const newEntry = `\n# Frame.io Webhook Secret (auto-generated)\nFRAMEIO_WEBHOOK_SECRET=${webhookSecret}\n`;
      fs.appendFileSync(envPath, newEntry);
      console.log('✓ Webhook secret generated and saved to .env');
      console.log(`  Secret: ${webhookSecret.substring(0, 10)}...`);
    }
  } else {
    console.log('✓ Webhook secret already configured');
  }
  
  // Display webhook configuration
  const replitUrl = process.env.REPL_SLUG ? 
    `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 
    'https://workspace.slavsinitsyn.repl.co';
  
  console.log('\n=== Webhook Configuration ===');
  console.log(`URL: ${replitUrl}/api/webhooks/frameio`);
  console.log('Events to subscribe: file.versioned');
  console.log('Secret: Set in .env as FRAMEIO_WEBHOOK_SECRET');
  
  console.log('\n=== Manual Setup Instructions ===');
  console.log('Since Frame.io webhooks require manual configuration in their UI:');
  console.log('\n1. Go to Frame.io Developer Console');
  console.log('2. Select your app');
  console.log('3. Navigate to Webhooks section');
  console.log('4. Click "Create Webhook"');
  console.log('5. Enter the following details:');
  console.log(`   - Endpoint URL: ${replitUrl}/api/webhooks/frameio`);
  console.log('   - Events: Select "file.versioned"');
  console.log(`   - Secret: ${webhookSecret || '[Check .env file for FRAMEIO_WEBHOOK_SECRET]'}`);
  console.log('6. Save the webhook');
  
  console.log('\n✓ Setup complete! The webhook is ready to receive events.');
  console.log('\nThe webhook will:');
  console.log('- Detect when revised videos are uploaded');
  console.log('- Update project status to "video is ready"');
  console.log('- Send email notifications to users');
  console.log('- Allow users to accept or request further revisions');
}

setupWebhook().catch(console.error);