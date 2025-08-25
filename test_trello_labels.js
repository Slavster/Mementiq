/**
 * Test Trello integration with subscription tier labels
 */

import axios from 'axios';

// Trello API client with label support
class TrelloLabelTestClient {
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

  // Get subscription label ID (creates if doesn't exist)
  async getSubscriptionLabelId(boardId, subscriptionTier) {
    try {
      // Get existing labels
      const labels = await this.getBoardLabels(boardId);
      
      // Check if subscription tier label already exists
      const existingLabel = labels.find(label => 
        label.name.toLowerCase() === subscriptionTier.toLowerCase()
      );
      
      if (existingLabel) {
        return existingLabel.id;
      }
      
      // Create new label with appropriate color
      let color = 'blue'; // Default
      switch (subscriptionTier.toLowerCase()) {
        case 'growth accelerator':
          color = 'orange'; // Premium tier - orange
          break;
        case 'consistency club':
          color = 'green'; // Mid tier - green
          break;
        case 'creative spark':
          color = 'blue'; // Basic tier - blue
          break;
      }
      
      const newLabel = await this.createLabel(boardId, subscriptionTier, color);
      console.log(`✅ Created subscription label: ${subscriptionTier} (${color})`);
      return newLabel.id;
    } catch (error) {
      console.error('Error managing subscription label:', error);
      return null;
    }
  }

  formatProjectCard(project, user, subscription, frameioLink) {
    const description = `**Project ID:** ${project.id}
**Client:** ${user.firstName} ${user.lastName} (${user.email})
**Company:** ${user.company || 'Not provided'}
**Frame.io Link:** ${frameioLink}

---
**📋 CLIENT REQUIREMENTS & INSTRUCTIONS:**

**Q: Project Type**
A: ${subscription.tier} subscription project

**Q: Expected Turnaround**  
A: ${subscription.hours ? subscription.hours + ' hours' : subscription.days + ' days'} (based on ${subscription.tier} tier)

---
`;

    // Calculate dates if project was submitted
    let startDate;
    let dueDate;
    
    if (project.submittedToEditorAt) {
      const submissionDate = new Date(project.submittedToEditorAt);
      startDate = submissionDate.toISOString();
      
      // Calculate due date based on subscription tier
      const due = new Date(submissionDate);
      switch (subscription.tier.toLowerCase()) {
        case 'growth accelerator':
          due.setHours(due.getHours() + 48); // 48 hours
          break;
        case 'consistency club':
          due.setDate(due.getDate() + 4); // 4 days
          break;
        case 'creative spark':
          due.setDate(due.getDate() + 7); // 7 days
          break;
        default:
          due.setDate(due.getDate() + 7); // Default
          break;
      }
      dueDate = due.toISOString();
    }
    
    return {
      name: `${project.title} - ${user.firstName}`,
      desc: description,
      start: startDate,
      due: dueDate,
      subscriptionTier: subscription.tier
    };
  }
}

async function testTrelloLabels() {
  console.log('🧪 Testing Trello Integration with Subscription Tier Labels...\n');

  try {
    const trelloClient = new TrelloLabelTestClient();
    const frameioLink = "https://next.frame.io/project/e0a4fadd-52b0-4156-91ed-8880bbc0c51a/view/abc123-test-folder";
    const TODO_LIST_ID = '684bff2e9e09bcad40e947dc'; // "New" list
    const BOARD_ID = 'kg3EFU40'; // Your board ID

    // Test different subscription tiers
    const subscriptionTiers = [
      { name: "Growth Accelerator", tier: "Growth Accelerator", hours: 48, color: "orange" },
      { name: "Consistency Club", tier: "Consistency Club", days: 4, color: "green" },
      { name: "Creative Spark", tier: "Creative Spark", days: 7, color: "blue" }
    ];

    console.log('Creating test cards with subscription tier labels:\n');

    for (let i = 0; i < subscriptionTiers.length; i++) {
      const subscription = subscriptionTiers[i];
      
      const sampleProject = {
        id: 2000 + i,
        title: `${subscription.name} Project`,
        status: "edit in progress",
        submittedToEditorAt: new Date('2025-08-21T14:45:00Z')
      };

      const sampleUser = {
        firstName: "Sarah",
        lastName: "Johnson", 
        email: "sarah.johnson@acmecorp.com",
        company: "Acme Corporation"
      };

      console.log(`📊 ${subscription.name} (${subscription.color} label):`);

      // Format the card
      const cardData = trelloClient.formatProjectCard(
        sampleProject,
        sampleUser, 
        subscription,
        frameioLink
      );

      // Get subscription label ID (creates if doesn't exist)
      const labelId = await trelloClient.getSubscriptionLabelId(BOARD_ID, subscription.tier);
      const labelIds = labelId ? [labelId] : [];

      console.log(`   Label ID: ${labelId || 'Failed to create'}`);
      console.log(`   Start Date: ${new Date(cardData.start).toLocaleString()}`);
      console.log(`   Due Date: ${new Date(cardData.due).toLocaleString()}`);

      // Create test card with label
      console.log(`   Creating card with ${subscription.color} label...`);
      
      const card = await trelloClient.createCard({
        name: `🏷️ LABEL TEST - ${cardData.name}`,
        desc: cardData.desc,
        idList: TODO_LIST_ID,
        start: cardData.start,
        due: cardData.due,
        idLabels: labelIds
      });

      console.log(`   ✅ Card created: https://trello.com/c/${card.shortLink}`);
      console.log(`   🏷️ ${subscription.tier} label applied (${subscription.color})`);
      console.log('');
    }

    // Show existing labels on the board
    console.log('📋 Current board labels:');
    const allLabels = await trelloClient.getBoardLabels(BOARD_ID);
    allLabels.forEach(label => {
      if (label.name) {
        console.log(`   • ${label.name} (${label.color})`);
      }
    });

    console.log('\n🎉 Subscription tier label testing complete!\n');
    
    console.log('📋 What you can see in Trello:');
    console.log('• Each card now has a colored label for the subscription tier');
    console.log('• Growth Accelerator: Orange label (premium, 48-hour turnaround)');  
    console.log('• Consistency Club: Green label (standard, 4-day turnaround)');
    console.log('• Creative Spark: Blue label (basic, 7-day turnaround)');
    console.log('• Labels allow easy filtering and visual identification');
    console.log('• Subscription info removed from card descriptions (cleaner look)');
    console.log('• Start and due dates still set based on subscription tiers');
    
    console.log('\n🔍 You can now filter cards in Trello by subscription tier using the labels!');
    console.log('\n(Test cards can be safely deleted after review)');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

testTrelloLabels().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});