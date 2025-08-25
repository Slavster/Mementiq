/**
 * Test creating subscription tier labels with correct colors
 */

import axios from 'axios';

class TrelloLabelManager {
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

  async createCard(data) {
    const response = await axios.post(`${this.baseUrl}/cards`, {
      ...data,
      ...this.getAuthParams()
    });
    return response.data;
  }

  async getBoardLabels(boardId) {
    const response = await axios.get(`${this.baseUrl}/boards/${boardId}/labels`, {
      params: this.getAuthParams()
    });
    return response.data;
  }

  async createLabel(boardId, name, color) {
    const response = await axios.post(`${this.baseUrl}/labels`, {
      name,
      color,
      idBoard: boardId,
      ...this.getAuthParams()
    });
    return response.data;
  }

  async getSubscriptionLabelId(boardId, subscriptionTier) {
    try {
      // Get existing labels
      const labels = await this.getBoardLabels(boardId);
      
      // Check if subscription tier label already exists
      const existingLabel = labels.find(label => 
        label.name.toLowerCase() === subscriptionTier.toLowerCase()
      );
      
      if (existingLabel) {
        console.log(`   Found existing label: ${subscriptionTier} (${existingLabel.color})`);
        return existingLabel.id;
      }
      
      // Create new label with correct color
      let color = 'yellow'; // Default
      switch (subscriptionTier.toLowerCase()) {
        case 'growth accelerator':
          color = 'red'; // Premium tier - red
          break;
        case 'consistency club':
          color = 'orange'; // Mid tier - orange
          break;
        case 'creative spark':
          color = 'yellow'; // Basic tier - yellow
          break;
      }
      
      const newLabel = await this.createLabel(boardId, subscriptionTier, color);
      console.log(`   ✅ Created label: ${subscriptionTier} (${color})`);
      return newLabel.id;
    } catch (error) {
      console.error(`   ❌ Error creating label for ${subscriptionTier}:`, error.response?.data?.message || error.message);
      return null;
    }
  }
}

async function testSubscriptionLabels() {
  console.log('🏷️ Testing Subscription Tier Label Creation...\n');

  try {
    const trelloClient = new TrelloLabelManager();
    const BOARD_ID = 'kg3EFU40'; // Your board ID
    const TODO_LIST_ID = '684bff2e9e09bcad40e947dc'; // "New" list

    console.log('Current board labels:');
    const existingLabels = await trelloClient.getBoardLabels(BOARD_ID);
    existingLabels.forEach(label => {
      if (label.name) {
        console.log(`   • ${label.name} (${label.color})`);
      }
    });

    console.log('\nCreating subscription tier labels with correct colors:\n');

    // Define subscription tiers with new colors
    const subscriptionTiers = [
      { name: "Growth Accelerator", tier: "Growth Accelerator", color: "red", hours: 48 },
      { name: "Consistency Club", tier: "Consistency Club", color: "orange", days: 4 },
      { name: "Creative Spark", tier: "Creative Spark", color: "yellow", days: 7 }
    ];

    const createdLabels = [];

    for (const subscription of subscriptionTiers) {
      console.log(`📊 ${subscription.name}:`);
      console.log(`   Expected color: ${subscription.color}`);
      console.log(`   Turnaround: ${subscription.hours ? subscription.hours + ' hours' : subscription.days + ' days'}`);
      
      const labelId = await trelloClient.getSubscriptionLabelId(BOARD_ID, subscription.tier);
      if (labelId) {
        createdLabels.push({ ...subscription, labelId });
      }
      console.log('');
    }

    // Create test cards with the new labels
    console.log('Creating test cards with subscription tier labels:\n');

    for (let i = 0; i < createdLabels.length; i++) {
      const subscription = createdLabels[i];
      
      if (!subscription.labelId) {
        console.log(`   Skipping ${subscription.name} - no label created`);
        continue;
      }

      const sampleProject = {
        id: 3000 + i,
        title: `${subscription.name} Test Project`,
        submittedToEditorAt: new Date('2025-08-21T14:45:00Z')
      };

      const sampleUser = {
        firstName: "Test",
        lastName: "Client", 
        email: "test@example.com",
        company: "Test Company"
      };

      // Calculate dates
      const submissionDate = new Date(sampleProject.submittedToEditorAt);
      const startDate = submissionDate.toISOString();
      
      const due = new Date(submissionDate);
      if (subscription.hours) {
        due.setHours(due.getHours() + subscription.hours);
      } else {
        due.setDate(due.getDate() + subscription.days);
      }
      const dueDate = due.toISOString();

      const description = `**Project ID:** ${sampleProject.id}
**Client:** ${sampleUser.firstName} ${sampleUser.lastName} (${sampleUser.email})
**Company:** ${sampleUser.company}
**Frame.io Link:** https://next.frame.io/project/e0a4fadd-52b0-4156-91ed-8880bbc0c51a/view/test-folder

---
**📋 CLIENT REQUIREMENTS:**

**Q: Subscription Tier**
A: ${subscription.tier}

**Q: Expected Turnaround**  
A: ${subscription.hours ? subscription.hours + ' hours' : subscription.days + ' days'}

---
`;

      console.log(`   Creating ${subscription.name} test card...`);
      
      const card = await trelloClient.createCard({
        name: `🎯 ${subscription.tier.toUpperCase()} - ${sampleProject.title}`,
        desc: description,
        idList: TODO_LIST_ID,
        start: startDate,
        due: dueDate,
        idLabels: [subscription.labelId]
      });

      console.log(`   ✅ Card created: https://trello.com/c/${card.shortLink}`);
      console.log(`   🏷️ ${subscription.color} ${subscription.tier} label applied`);
      console.log('');
    }

    console.log('🎉 Subscription tier labels created successfully!\n');
    
    console.log('📋 Updated label system:');
    console.log('• Growth Accelerator: Red label (premium, 48-hour turnaround)');  
    console.log('• Consistency Club: Orange label (standard, 4-day turnaround)');
    console.log('• Creative Spark: Yellow label (basic, 7-day turnaround)');
    console.log('• Existing client labels preserved for other workflow needs');
    
    console.log('\n🔍 You can now filter cards by subscription tier using the color-coded labels!');
    console.log('\n(Test cards can be safely deleted after review)');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

testSubscriptionLabels().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});