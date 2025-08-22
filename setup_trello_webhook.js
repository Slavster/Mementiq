/**
 * One-time setup script to create Trello webhook for editor assignment tracking
 */

import axios from 'axios';

const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const BOARD_ID = '684bfec9a3ce706ae8b8ca03'; // Your Trello board ID (full ID from API)
const CALLBACK_URL = 'https://bb0a5c69-363f-451b-9bc8-306c97c51a42-00-zggicmdh4byf.picard.replit.dev/api/trello/webhook';

async function setupWebhook() {
  console.log('🔧 Setting up Trello webhook for editor assignment tracking...\n');

  if (!TRELLO_KEY || !TRELLO_TOKEN) {
    console.error('❌ Missing TRELLO_KEY or TRELLO_TOKEN environment variables');
    process.exit(1);
  }

  try {
    // First, check if webhook already exists for this token
    console.log('🔍 Checking for existing webhooks...');
    const existingWebhooks = await axios.get(`https://api.trello.com/1/tokens/${TRELLO_TOKEN}/webhooks`, {
      params: {
        key: TRELLO_KEY
      }
    });

    console.log(`📋 Found ${existingWebhooks.data.length} existing webhooks`);
    
    // Check if we already have a webhook for this board
    const boardWebhook = existingWebhooks.data.find(webhook => 
      webhook.idModel === BOARD_ID && webhook.callbackURL === CALLBACK_URL
    );

    if (boardWebhook) {
      console.log(`✅ Webhook already exists for board ${BOARD_ID}`);
      console.log(`   Webhook ID: ${boardWebhook.id}`);
      console.log(`   Callback URL: ${boardWebhook.callbackURL}`);
      console.log(`   Active: ${boardWebhook.active}`);
      return;
    }

    // Test the callback URL first (HEAD request)
    console.log('🔍 Testing webhook callback URL...');
    try {
      const headResponse = await axios.head(CALLBACK_URL);
      console.log(`✅ HEAD request successful: ${headResponse.status}`);
    } catch (error) {
      console.log(`⚠️  HEAD request failed: ${error.response?.status || error.message}`);
      console.log('This might be expected if the endpoint isn\'t live yet');
    }

    // Create the webhook
    console.log('📝 Creating new webhook...');
    const webhookResponse = await axios.post('https://api.trello.com/1/webhooks', {
      key: TRELLO_KEY,
      token: TRELLO_TOKEN,
      callbackURL: CALLBACK_URL,
      idModel: BOARD_ID,
      description: 'Mementiq Editor Assignment Tracking'
    });

    const webhook = webhookResponse.data;
    console.log('✅ Webhook created successfully!');
    console.log(`   Webhook ID: ${webhook.id}`);
    console.log(`   Board ID: ${webhook.idModel}`);
    console.log(`   Callback URL: ${webhook.callbackURL}`);
    console.log(`   Active: ${webhook.active}`);

    console.log('\n🎯 What happens next:');
    console.log('• Webhook will trigger when editors are assigned/removed from cards');
    console.log('• Events: addMemberToCard, removeMemberFromCard');
    console.log('• Assignment changes will be synced to your database automatically');
    console.log('• Make sure your server is running to receive webhook events');

    console.log('\n📋 Webhook Details:');
    console.log(`Board: https://trello.com/b/${BOARD_ID}`);
    console.log(`Endpoint: ${CALLBACK_URL}`);
    console.log(`Signature verification: HMAC-SHA1 with TRELLO_WEBHOOK_SECRET`);

  } catch (error) {
    console.error('❌ Error setting up webhook:', error.response?.data || error.message);
    
    if (error.response?.status === 400 && error.response.data?.message?.includes('callback')) {
      console.log('\n💡 Troubleshooting:');
      console.log('• Make sure your webhook endpoint returns 200 for HEAD requests');
      console.log('• Verify SSL certificate is valid for your domain');
      console.log('• Check that the callback URL is publicly accessible');
    }
  }
}

setupWebhook().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Setup error:', error);
  process.exit(1);
});