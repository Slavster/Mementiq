/**
 * Test subscription-based due dates in Trello cards
 */

import axios from 'axios';

// Simple Trello API client with subscription-based due date logic
class TrelloTestClient {
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

  // Calculate due date based on subscription tier
  calculateDueDate(submissionDate, subscriptionTier, isRevision = false) {
    const dueDate = new Date(submissionDate);
    
    if (isRevision) {
      // All revisions have 48 hour turnaround
      dueDate.setHours(dueDate.getHours() + 48);
    } else {
      // Initial video submission due dates by tier
      switch (subscriptionTier?.toLowerCase()) {
        case 'growth accelerator':
          dueDate.setHours(dueDate.getHours() + 48); // 48 hours
          break;
        case 'consistency club':
          dueDate.setDate(dueDate.getDate() + 4); // 4 days
          break;
        case 'creative spark':
          dueDate.setDate(dueDate.getDate() + 7); // 7 days
          break;
        default:
          // Default to 7 days for unknown tiers
          dueDate.setDate(dueDate.getDate() + 7);
          break;
      }
    }
    
    return dueDate;
  }

  formatProjectCard(project, user, subscription, frameioLink) {
    const description = `**Project ID:** ${project.id}
**Client:** ${user.firstName} ${user.lastName} (${user.email})
**Company:** ${user.company || 'Not provided'}
**Subscription:** ${subscription?.tier || 'Unknown'}
**Frame.io Link:** ${frameioLink}

---
**📋 CLIENT REQUIREMENTS & INSTRUCTIONS:**

**Q: Project Type**
A: ${subscription.tier} Training Video

**Q: Turnaround Expectation**  
A: ${subscription.tier} tier - ${subscription.hours ? subscription.hours + ' hours' : subscription.days + ' days'}

---
`;

    // Calculate dates if project was submitted
    let startDate;
    let dueDate;
    
    if (project.submittedToEditorAt) {
      const submissionDate = new Date(project.submittedToEditorAt);
      startDate = submissionDate.toISOString();
      dueDate = this.calculateDueDate(submissionDate, subscription?.tier, false).toISOString();
    }
    
    return {
      name: `${project.title} - ${user.firstName}`,
      desc: description,
      start: startDate,
      due: dueDate
    };
  }
}

async function testSubscriptionDueDates() {
  console.log('🧪 Testing Subscription-Based Due Dates in Trello Cards...\n');

  try {
    const trelloClient = new TrelloTestClient();
    const frameioLink = "https://app.frame.io/library/abc123-test-folder";
    const TODO_LIST_ID = '684bff2e9e09bcad40e947dc'; // "New" list

    // Test different subscription tiers
    const subscriptionTiers = [
      { name: "Growth Accelerator", tier: "Growth Accelerator", hours: 48 },
      { name: "Consistency Club", tier: "Consistency Club", days: 4 },
      { name: "Creative Spark", tier: "Creative Spark", days: 7 }
    ];

    console.log('Creating test cards for each subscription tier:\n');

    for (let i = 0; i < subscriptionTiers.length; i++) {
      const subscription = subscriptionTiers[i];
      
      // Sample project and user data with submission dates
      const sampleProject = {
        id: 1000 + i,
        title: `${subscription.name} Video Project`,
        status: "edit in progress",
        createdAt: new Date('2025-08-20T10:30:00Z'),
        submittedToEditorAt: new Date('2025-08-21T14:45:00Z') // Submitted yesterday at 2:45 PM
      };

      const sampleUser = {
        firstName: "Sarah",
        lastName: "Johnson", 
        email: "sarah.johnson@acmecorp.com",
        company: "Acme Corporation"
      };

      console.log(`📊 ${subscription.name} Subscription:`);
      if (subscription.hours) {
        console.log(`   Turnaround: ${subscription.hours} hours`);
      } else {
        console.log(`   Turnaround: ${subscription.days} days`);
      }

      // Format the card
      const cardData = trelloClient.formatProjectCard(
        sampleProject,
        sampleUser, 
        subscription,
        frameioLink
      );

      console.log(`   Start Date: ${cardData.start ? new Date(cardData.start).toLocaleString() : 'Not set'}`);
      console.log(`   Due Date: ${cardData.due ? new Date(cardData.due).toLocaleString() : 'Not set'}`);
      
      if (cardData.start && cardData.due) {
        const startDate = new Date(cardData.start);
        const dueDate = new Date(cardData.due);
        const diffHours = (dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
        const diffDays = Math.round(diffHours / 24 * 10) / 10;
        console.log(`   Calculated Turnaround: ${diffDays} days (${Math.round(diffHours)} hours)`);
      }

      // Create test card for this subscription tier
      console.log(`   Creating test card...`);
      
      const card = await trelloClient.createCard({
        name: `🧪 ${subscription.name.toUpperCase()} - ${cardData.name}`,
        desc: cardData.desc,
        idList: TODO_LIST_ID,
        start: cardData.start,
        due: cardData.due
      });

      console.log(`   ✅ Card created: https://trello.com/c/${card.shortLink}`);
      console.log(`   📅 Start & Due dates set in Trello with ${subscription.name} turnaround`);
      console.log('');
    }

    console.log('🎉 Subscription-based due date testing complete!\n');
    
    console.log('📋 Summary of what you can see in Trello:');
    console.log('• Start Date: Shows when project was submitted to editor');
    console.log('• Due Date: Calculated based on subscription tier');
    console.log('• Growth Accelerator: 48 hour turnaround');  
    console.log('• Consistency Club: 4 day turnaround');
    console.log('• Creative Spark: 7 day turnaround');
    console.log('• Complete project information in card descriptions');
    console.log('• All client contact information included');
    
    console.log('\nRevision cards will automatically have 48-hour due dates regardless of subscription tier.');
    console.log('\n(Test cards can be safely deleted after review)');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

testSubscriptionDueDates().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});