/**
 * Create subscription tier labels and apply them to existing test cards
 */

import axios from 'axios';

class TrelloLabelCreator {
  constructor() {
    this.baseUrl = 'https://api.trello.com/1';
    this.key = process.env.TRELLO_KEY;
    this.token = process.env.TRELLO_TOKEN;
    
    if (!this.key || !this.token) {
      throw new Error('Missing TRELLO_KEY or TRELLO_TOKEN environment variables');
    }
  }

  async makeRequest(method, url, data = {}) {
    const config = {
      method,
      url: `${this.baseUrl}${url}`,
      params: {
        key: this.key,
        token: this.token
      }
    };
    
    if (method === 'POST' || method === 'PUT') {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  }

  async createLabel(boardId, name, color) {
    try {
      console.log(`Creating label: ${name} (${color})`);
      
      // Try different API formats
      const labelData = {
        name: name,
        color: color,
        idBoard: boardId
      };
      
      const label = await this.makeRequest('POST', '/labels', labelData);
      console.log(`✅ Created label: ${name} - ID: ${label.id}`);
      return label;
      
    } catch (error) {
      console.log(`❌ Failed to create ${name}:`, error.response?.data?.message || error.message);
      
      // Try alternative approach - create label via board endpoint
      try {
        console.log(`Trying alternative method for ${name}...`);
        const altLabel = await this.makeRequest('POST', `/boards/${boardId}/labels`, {
          name: name,
          color: color
        });
        console.log(`✅ Created label via board endpoint: ${name} - ID: ${altLabel.id}`);
        return altLabel;
      } catch (altError) {
        console.log(`❌ Alternative method also failed for ${name}:`, altError.response?.data?.message || altError.message);
        return null;
      }
    }
  }

  async getBoardLabels(boardId) {
    return await this.makeRequest('GET', `/boards/${boardId}/labels`);
  }

  async addLabelToCard(cardId, labelId) {
    try {
      await this.makeRequest('POST', `/cards/${cardId}/idLabels`, { value: labelId });
      console.log(`✅ Added label to card ${cardId}`);
      return true;
    } catch (error) {
      console.log(`❌ Failed to add label to card ${cardId}:`, error.response?.data?.message || error.message);
      return false;
    }
  }

  async getCard(cardId) {
    return await this.makeRequest('GET', `/cards/${cardId}`);
  }
}

async function createAndApplyLabels() {
  console.log('🏷️ Creating Subscription Tier Labels and Applying to Test Cards...\n');

  try {
    const trello = new TrelloLabelCreator();
    const BOARD_ID = 'kg3EFU40';

    // Define subscription tier labels with correct colors
    const subscriptionLabels = [
      { name: 'Growth Accelerator', color: 'red' },
      { name: 'Consistency Club', color: 'orange' },
      { name: 'Creative Spark', color: 'yellow' }
    ];

    // Test card data with their card IDs and subscription tiers
    const testCards = [
      { 
        shortLink: 'NDMbCjoM', 
        id: 'NDMbCjoM', // We'll get the full ID
        tier: 'Growth Accelerator', 
        project: 'Corporate Training Series' 
      },
      { 
        shortLink: '7EY1Gg2X', 
        id: '7EY1Gg2X',
        tier: 'Consistency Club', 
        project: 'Product Launch Video' 
      },
      { 
        shortLink: 'RdQMBHMD', 
        id: 'RdQMBHMD',
        tier: 'Creative Spark', 
        project: 'Event Highlights Reel' 
      },
      { 
        shortLink: 'NdHUbyd5', 
        id: 'NdHUbyd5',
        tier: 'Growth Accelerator', 
        project: 'Revision Example' 
      }
    ];

    console.log('📋 Current board labels:');
    const existingLabels = await trello.getBoardLabels(BOARD_ID);
    existingLabels.forEach(label => {
      if (label.name) {
        console.log(`   • ${label.name} (${label.color})`);
      }
    });

    console.log('\n🎨 Creating subscription tier labels:\n');

    const createdLabels = {};

    // Create each subscription label
    for (const labelDef of subscriptionLabels) {
      console.log(`📊 ${labelDef.name}:`);
      
      // Check if label already exists
      const existingLabel = existingLabels.find(l => 
        l.name.toLowerCase() === labelDef.name.toLowerCase()
      );
      
      if (existingLabel) {
        console.log(`   Found existing label: ${labelDef.name} (ID: ${existingLabel.id})`);
        createdLabels[labelDef.name] = existingLabel;
      } else {
        const newLabel = await trello.createLabel(BOARD_ID, labelDef.name, labelDef.color);
        if (newLabel) {
          createdLabels[labelDef.name] = newLabel;
        }
      }
      console.log('');
    }

    console.log('🎯 Applying labels to test cards:\n');

    // Get full card IDs and apply appropriate labels
    for (const testCard of testCards) {
      console.log(`📝 ${testCard.project} (${testCard.tier}):`);
      
      try {
        // Get full card details
        const cardDetails = await trello.getCard(testCard.shortLink);
        console.log(`   Card ID: ${cardDetails.id}`);
        console.log(`   Card Name: ${cardDetails.name}`);
        
        // Find matching label
        const matchingLabel = createdLabels[testCard.tier];
        if (matchingLabel) {
          console.log(`   Applying label: ${testCard.tier} (${matchingLabel.color})`);
          const success = await trello.addLabelToCard(cardDetails.id, matchingLabel.id);
          if (success) {
            console.log(`   ✅ Label applied successfully`);
          }
        } else {
          console.log(`   ⚠️  Label not found for tier: ${testCard.tier}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error processing card ${testCard.shortLink}:`, error.message);
      }
      
      console.log('');
    }

    console.log('📋 Final board labels after creation:');
    const finalLabels = await trello.getBoardLabels(BOARD_ID);
    finalLabels.forEach(label => {
      if (label.name) {
        const isNew = subscriptionLabels.some(sub => sub.name === label.name);
        const marker = isNew ? '🆕' : '  ';
        console.log(`   ${marker} ${label.name} (${label.color})`);
      }
    });

    console.log('\n🎉 Label Creation and Application Complete!\n');
    
    console.log('📊 Results:');
    Object.entries(createdLabels).forEach(([name, label]) => {
      if (label) {
        console.log(`• ${name}: Created/Found (${label.color})`);
      } else {
        console.log(`• ${name}: Failed to create`);
      }
    });
    
    console.log('\n🔗 Test Cards Updated:');
    testCards.forEach(card => {
      console.log(`• ${card.project}: https://trello.com/c/${card.shortLink}`);
    });
    
    console.log('\n✨ Your Trello board now has subscription tier labels for visual organization!');

  } catch (error) {
    console.error('\n❌ Label creation failed:', error.response?.data || error.message);
  }
}

createAndApplyLabels().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Script error:', error);
  process.exit(1);
});