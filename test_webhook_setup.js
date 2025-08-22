/**
 * Test webhook functionality and editor management
 */

import axios from 'axios';

const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const BOARD_ID = 'kg3EFU40';
const TEST_CARD_ID = '68a81c25a83820ec18815e0f'; // Corporate Training Series

class WebhookTester {
  constructor() {
    this.baseUrl = 'https://api.trello.com/1';
    this.key = TRELLO_KEY;
    this.token = TRELLO_TOKEN;
    
    if (!this.key || !this.token) {
      throw new Error('Missing TRELLO_KEY or TRELLO_TOKEN environment variables');
    }
  }

  getAuthParams() {
    return {
      key: this.key,
      token: this.token
    };
  }

  async makeRequest(method, url, data = {}) {
    const config = {
      method,
      url: `${this.baseUrl}${url}`,
      params: this.getAuthParams()
    };
    
    if (method === 'POST' || method === 'PUT') {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  }

  async getBoardMembers() {
    const members = await this.makeRequest('GET', `/boards/${BOARD_ID}/members`);
    return members;
  }

  async getCardMembers(cardId) {
    const members = await this.makeRequest('GET', `/cards/${cardId}/members`);
    return members;
  }

  async addMemberToCard(cardId, memberId) {
    return await this.makeRequest('POST', `/cards/${cardId}/members`, { value: memberId });
  }

  async removeMemberFromCard(cardId, memberId) {
    return await this.makeRequest('DELETE', `/cards/${cardId}/members/${memberId}`);
  }

  async simulateEditorAssignment(cardId, memberId) {
    console.log(`\n🔄 Simulating editor assignment...`);
    console.log(`   Card: ${cardId}`);
    console.log(`   Member: ${memberId}`);

    // Add member to card
    console.log(`➕ Adding member to card...`);
    await this.addMemberToCard(cardId, memberId);
    console.log(`✅ Member added`);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Remove member from card
    console.log(`➖ Removing member from card...`);
    await this.removeMemberFromCard(cardId, memberId);
    console.log(`✅ Member removed`);

    console.log(`📡 Webhook events should have been triggered for both actions`);
  }
}

async function testWebhookSetup() {
  console.log('🧪 Testing Trello Webhook Setup and Editor Management\n');

  try {
    const tester = new WebhookTester();

    // 1. Get board members
    console.log('👥 Getting board members...');
    const boardMembers = await tester.getBoardMembers();
    console.log(`Found ${boardMembers.length} board members:`);
    boardMembers.forEach(member => {
      console.log(`   • ${member.fullName} (${member.username}) - ID: ${member.id}`);
    });

    if (boardMembers.length === 0) {
      console.log('⚠️  No board members found. Add some editors to the board first.');
      return;
    }

    // 2. Test current card members
    console.log(`\n📋 Current members of test card:`);
    const currentMembers = await tester.getCardMembers(TEST_CARD_ID);
    console.log(`Found ${currentMembers.length} assigned members:`);
    currentMembers.forEach(member => {
      console.log(`   • ${member.fullName} (${member.username}) - ID: ${member.id}`);
    });

    // 3. Find a member to test with (use first available member)
    const testMember = boardMembers[0];
    console.log(`\n🎯 Using test member: ${testMember.fullName} (${testMember.id})`);

    // 4. Simulate assignment changes (this should trigger webhooks)
    await tester.simulateEditorAssignment(TEST_CARD_ID, testMember.id);

    console.log('\n📊 Webhook Test Summary:');
    console.log('• Added and removed a member from the test card');
    console.log('• This should have triggered two webhook events:');
    console.log('  - addMemberToCard');
    console.log('  - removeMemberFromCard');
    console.log('• Check your server logs for webhook processing messages');
    console.log('• Verify database updates in trello_cards table');

    console.log('\n🔍 To check webhook status:');
    console.log('• Look for "🔔 Trello webhook received" in server logs');
    console.log('• Check database: SELECT * FROM trello_cards WHERE card_id = \'68a81c25a83820ec18815e0f\';');
    console.log('• assigned_editor_id should reflect the changes');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testWebhookSetup().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});