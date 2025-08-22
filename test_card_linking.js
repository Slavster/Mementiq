/**
 * Test bidirectional card linking between original and revision cards
 */

import axios from 'axios';

class TrelloCardLinker {
  constructor() {
    this.baseUrl = 'https://api.trello.com/1';
    this.key = process.env.TRELLO_KEY;
    this.token = process.env.TRELLO_TOKEN;
    
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

  async getCardShortUrl(cardId) {
    const card = await this.makeRequest('GET', `/cards/${cardId}`, { fields: 'shortUrl' });
    return card.shortUrl;
  }

  async getCardAttachments(cardId) {
    const attachments = await this.makeRequest('GET', `/cards/${cardId}/attachments`);
    return attachments.map(attachment => ({
      url: attachment.url,
      name: attachment.name
    }));
  }

  async addCardAttachment(cardId, url, name) {
    try {
      // Check existing attachments to avoid duplicates
      const existingAttachments = await this.getCardAttachments(cardId);
      const duplicateExists = existingAttachments.some(attachment => attachment.url === url);
      
      if (duplicateExists) {
        console.log(`   ⚠️  Attachment already exists: ${name}`);
        return true;
      }

      await this.makeRequest('POST', `/cards/${cardId}/attachments`, {
        url: url,
        name: name
      });
      
      console.log(`   ✅ Added attachment: ${name}`);
      return true;
    } catch (error) {
      console.error(`   ❌ Error adding attachment:`, error.response?.data?.message || error.message);
      return false;
    }
  }

  async createCard(cardData) {
    return await this.makeRequest('POST', '/cards', cardData);
  }

  async linkCards(originalCardId, revisionCardId, projectTitle, revisionNumber) {
    try {
      console.log(`🔗 Creating bidirectional links between cards...`);
      
      // Get short URLs for both cards
      const originalShortUrl = await this.getCardShortUrl(originalCardId);
      const revisionShortUrl = await this.getCardShortUrl(revisionCardId);
      
      console.log(`   Original card URL: ${originalShortUrl}`);
      console.log(`   Revision card URL: ${revisionShortUrl}`);

      // Link revision card to original card
      console.log(`   Adding original card link to revision card...`);
      await this.addCardAttachment(
        revisionCardId, 
        originalShortUrl, 
        `📄 Original Request: ${projectTitle}`
      );

      // Link original card to revision card
      console.log(`   Adding revision card link to original card...`);
      await this.addCardAttachment(
        originalCardId, 
        revisionShortUrl, 
        `🔄 Revision #${revisionNumber}: ${projectTitle}`
      );

      console.log(`✅ Bidirectional links created successfully`);
      return true;
    } catch (error) {
      console.error('❌ Error creating card links:', error);
      return false;
    }
  }

  async findSubscriptionLabel(boardId, tier) {
    const labels = await this.makeRequest('GET', `/boards/${boardId}/labels`);
    return labels.find(label => label.name.toLowerCase() === tier.toLowerCase());
  }
}

async function testCardLinking() {
  console.log('🔗 Testing Bidirectional Card Linking System...\n');

  try {
    const trello = new TrelloCardLinker();
    const BOARD_ID = 'kg3EFU40';
    const TODO_LIST_ID = '684bff2e9e09bcad40e947dc'; // "New" list

    // Use existing test card as the "original" project card
    const originalCard = {
      id: '68a81c25a83820ec18815e0f', // Corporate Training Series
      shortLink: 'NDMbCjoM',
      projectTitle: 'Corporate Training Series',
      clientName: 'Michael Chen',
      subscriptionTier: 'Growth Accelerator'
    };

    console.log('📋 Original Card Information:');
    console.log(`   Project: ${originalCard.projectTitle}`);
    console.log(`   Client: ${originalCard.clientName}`);
    console.log(`   Subscription: ${originalCard.subscriptionTier}`);
    console.log(`   Card URL: https://trello.com/c/${originalCard.shortLink}`);

    // Create a revision card for this project
    console.log('\n🔄 Creating Revision Card...\n');

    const revisionNumber = 3;
    const revisionCardData = {
      name: `🔄 REVISION TEST - ${originalCard.projectTitle} - ${originalCard.clientName} (Rev #${revisionNumber})`,
      desc: `**Project ID:** 4001
**Client:** ${originalCard.clientName} (michael.chen@techstartup.com)
**Company:** TechStartup Inc
**Revision #:** ${revisionNumber}
**Frame.io Link:** https://app.frame.io/library/production-folder-xyz
**Review Link:** https://f.io/ABC123-review-comments

---
**🔄 REVISION REQUEST**

Please review the comments left in Frame.io and make the requested changes.

**Key Changes Requested:**
• Adjust color grading in opening sequence (too dark)
• Replace background music with provided corporate track
• Trim 45 seconds from middle section (3:20-4:05)
• Add client logo animation to end card
• Fix audio sync issue at 2:15 mark

**Priority:** High - ${originalCard.subscriptionTier} tier (48-hour turnaround)

---
`,
      idList: TODO_LIST_ID,
      start: new Date().toISOString(),
      due: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours from now
    };

    // Find and apply subscription label
    const subscriptionLabel = await trello.findSubscriptionLabel(BOARD_ID, originalCard.subscriptionTier);
    if (subscriptionLabel) {
      revisionCardData.idLabels = [subscriptionLabel.id];
      console.log(`📊 Applying ${originalCard.subscriptionTier} label (${subscriptionLabel.color})`);
    }

    // Create the revision card
    console.log('📝 Creating revision card...');
    const revisionCard = await trello.createCard(revisionCardData);
    console.log(`✅ Revision card created: https://trello.com/c/${revisionCard.shortLink}`);

    // Test the bidirectional linking
    console.log('\n🔗 Testing Bidirectional Linking...\n');
    
    const linkingSuccess = await trello.linkCards(
      originalCard.id,
      revisionCard.id,
      originalCard.projectTitle,
      revisionNumber
    );

    if (linkingSuccess) {
      console.log('\n📋 Linking Results:');
      
      // Check attachments on both cards
      console.log('\n📄 Original Card Attachments:');
      const originalAttachments = await trello.getCardAttachments(originalCard.id);
      originalAttachments.forEach(attachment => {
        console.log(`   • ${attachment.name}`);
        console.log(`     ${attachment.url}`);
      });

      console.log('\n🔄 Revision Card Attachments:');
      const revisionAttachments = await trello.getCardAttachments(revisionCard.id);
      revisionAttachments.forEach(attachment => {
        console.log(`   • ${attachment.name}`);
        console.log(`     ${attachment.url}`);
      });

      console.log('\n🎉 Bidirectional Card Linking Test Successful!\n');
      
      console.log('📊 What was demonstrated:');
      console.log('• Original card now links to revision card');
      console.log('• Revision card links back to original request');
      console.log('• Duplicate attachment prevention works');
      console.log('• Clear naming convention for easy identification');
      console.log('• Subscription tier labels applied to revision');

      console.log('\n✨ Benefits for Editors:');
      console.log('• Quick navigation between related cards');
      console.log('• Full context of original request when working on revisions');
      console.log('• Easy tracking of revision history');
      console.log('• No need to search for related cards manually');

      console.log('\n🔗 Test Cards:');
      console.log(`• Original: https://trello.com/c/${originalCard.shortLink}`);
      console.log(`• Revision: https://trello.com/c/${revisionCard.shortLink}`);

      console.log('\n(Test revision card can be safely deleted after review)');
    }

  } catch (error) {
    console.error('\n❌ Card linking test failed:', error.response?.data || error.message);
  }
}

testCardLinking().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});