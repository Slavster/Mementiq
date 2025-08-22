/**
 * Complete test of enhanced Trello integration with subscription tier labels
 * Assumes labels have been created manually in Trello web interface
 */

import axios from 'axios';

class CompleteTrelloIntegrationTest {
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

  // Find subscription label ID by name
  async findSubscriptionLabelId(boardId, subscriptionTier) {
    try {
      const labels = await this.getBoardLabels(boardId);
      const label = labels.find(l => 
        l.name.toLowerCase() === subscriptionTier.toLowerCase()
      );
      return label ? label.id : null;
    } catch (error) {
      console.error('Error finding subscription label:', error);
      return null;
    }
  }

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
          dueDate.setDate(dueDate.getDate() + 7);
          break;
      }
    }
    
    return dueDate;
  }

  formatProjectCard(project, user, subscription, frameioLink) {
    // Clean description without subscription tier (now in labels)
    const description = `**Project ID:** ${project.id}
**Client:** ${user.firstName} ${user.lastName} (${user.email})
**Company:** ${user.company || 'Not provided'}
**Frame.io Link:** ${frameioLink}

---
**📋 CLIENT REQUIREMENTS & INSTRUCTIONS:**

**Q: Project Type**
A: ${subscription.tier} subscription video editing project

**Q: Video Style**
A: Professional corporate training video with branded intro/outro

**Q: Duration Target**
A: 5-10 minutes final edited video

**Q: Special Requirements**
A: Include company logo, add background music, color correction needed

---
`;

    // Calculate dates
    let startDate, dueDate;
    if (project.submittedToEditorAt) {
      const submissionDate = new Date(project.submittedToEditorAt);
      startDate = submissionDate.toISOString();
      dueDate = this.calculateDueDate(submissionDate, subscription.tier, false).toISOString();
    }
    
    return {
      name: `${project.title} - ${user.firstName}`,
      desc: description,
      start: startDate,
      due: dueDate,
      subscriptionTier: subscription.tier
    };
  }

  formatRevisionCard(project, user, subscription, frameioLink, shareLink, revisionCount) {
    const description = `**Project ID:** ${project.id}
**Client:** ${user.firstName} ${user.lastName} (${user.email})
**Company:** ${user.company || 'Not provided'}
**Revision #:** ${revisionCount}
**Frame.io Link:** ${frameioLink}
**Review Link (for comments):** ${shareLink}

---
**🔄 REVISION REQUEST**

Please review the comments left in Frame.io and make the requested changes.

**Key Changes Requested:**
• Adjust color grading in opening sequence
• Replace background music with provided track
• Trim 30 seconds from middle section
• Add client logo to end card

---
`;

    const revisionRequestDate = new Date();
    const startDate = revisionRequestDate.toISOString();
    const dueDate = this.calculateDueDate(revisionRequestDate, subscription.tier, true).toISOString();

    return {
      name: `REVISION: ${project.title} - ${user.firstName} (Rev #${revisionCount})`,
      desc: description,
      start: startDate,
      due: dueDate,
      subscriptionTier: subscription.tier
    };
  }
}

async function testCompleteTrelloIntegration() {
  console.log('🎯 Testing Complete Trello Integration with Subscription Labels...\n');

  try {
    const trelloClient = new CompleteTrelloIntegrationTest();
    const BOARD_ID = 'kg3EFU40';
    const TODO_LIST_ID = '684bff2e9e09bcad40e947dc'; // "New" list
    const frameioLink = "https://app.frame.io/library/production-folder-xyz";

    console.log('📋 Current board labels:');
    const allLabels = await trelloClient.getBoardLabels(BOARD_ID);
    allLabels.forEach(label => {
      if (label.name) {
        console.log(`   • ${label.name} (${label.color})`);
      }
    });

    // Test data for different subscription tiers
    const testScenarios = [
      {
        subscription: { tier: "Growth Accelerator", hours: 48 },
        project: {
          id: 4001,
          title: "Corporate Training Series",
          submittedToEditorAt: new Date('2025-08-22T09:00:00Z')
        },
        user: {
          firstName: "Michael",
          lastName: "Chen", 
          email: "michael.chen@techstartup.com",
          company: "TechStartup Inc"
        }
      },
      {
        subscription: { tier: "Consistency Club", days: 4 },
        project: {
          id: 4002,
          title: "Product Launch Video",
          submittedToEditorAt: new Date('2025-08-22T09:00:00Z')
        },
        user: {
          firstName: "Sarah",
          lastName: "Williams", 
          email: "sarah@marketingpro.com",
          company: "Marketing Pro Agency"
        }
      },
      {
        subscription: { tier: "Creative Spark", days: 7 },
        project: {
          id: 4003,
          title: "Event Highlights Reel",
          submittedToEditorAt: new Date('2025-08-22T09:00:00Z')
        },
        user: {
          firstName: "David",
          lastName: "Rodriguez", 
          email: "david@eventscompany.com",
          company: "Events Company LLC"
        }
      }
    ];

    console.log('\n🎬 Creating project cards with subscription labels:\n');

    const createdCards = [];

    for (const scenario of testScenarios) {
      const { subscription, project, user } = scenario;
      
      console.log(`📊 ${subscription.tier} Project:`);
      console.log(`   Client: ${user.firstName} ${user.lastName}`);
      console.log(`   Company: ${user.company}`);
      console.log(`   Turnaround: ${subscription.hours ? subscription.hours + ' hours' : subscription.days + ' days'}`);

      // Format card data
      const cardData = trelloClient.formatProjectCard(project, user, subscription, frameioLink);
      
      // Find subscription label
      const labelId = await trelloClient.findSubscriptionLabelId(BOARD_ID, subscription.tier);
      const labelIds = labelId ? [labelId] : [];

      if (labelId) {
        console.log(`   ✅ Found subscription label: ${subscription.tier}`);
      } else {
        console.log(`   ⚠️  Subscription label not found: ${subscription.tier} (will create card without label)`);
      }

      console.log(`   Start: ${new Date(cardData.start).toLocaleString()}`);
      console.log(`   Due: ${new Date(cardData.due).toLocaleString()}`);

      // Create project card
      const card = await trelloClient.createCard({
        name: `🎯 FULL INTEGRATION - ${cardData.name}`,
        desc: cardData.desc,
        idList: TODO_LIST_ID,
        start: cardData.start,
        due: cardData.due,
        idLabels: labelIds
      });

      console.log(`   ✅ Card created: https://trello.com/c/${card.shortLink}`);
      if (labelId) {
        console.log(`   🏷️ ${subscription.tier} label applied`);
      }
      
      createdCards.push({ ...scenario, cardId: card.id, card });
      console.log('');
    }

    // Test revision card creation
    console.log('🔄 Creating revision card example:\n');

    const revisionScenario = createdCards[0]; // Use first project for revision test
    const shareLink = "https://f.io/ABC123-review-link";
    const revisionCount = 2;

    const revisionCardData = trelloClient.formatRevisionCard(
      revisionScenario.project,
      revisionScenario.user,
      revisionScenario.subscription,
      frameioLink,
      shareLink,
      revisionCount
    );

    const revisionLabelId = await trelloClient.findSubscriptionLabelId(BOARD_ID, revisionScenario.subscription.tier);
    const revisionLabelIds = revisionLabelId ? [revisionLabelId] : [];

    console.log(`📊 Revision for ${revisionScenario.subscription.tier}:`);
    console.log(`   Original Project: ${revisionScenario.project.title}`);
    console.log(`   Revision #: ${revisionCount}`);
    console.log(`   Due: 48 hours (${new Date(revisionCardData.due).toLocaleString()})`);

    const revisionCard = await trelloClient.createCard({
      name: `🔄 REVISION TEST - ${revisionCardData.name}`,
      desc: revisionCardData.desc,
      idList: TODO_LIST_ID,
      start: revisionCardData.start,
      due: revisionCardData.due,
      idLabels: revisionLabelIds
    });

    console.log(`   ✅ Revision card created: https://trello.com/c/${revisionCard.shortLink}`);
    if (revisionLabelId) {
      console.log(`   🏷️ ${revisionScenario.subscription.tier} label applied`);
    }

    console.log('\n🎉 Complete Trello Integration Test Successful!\n');
    
    console.log('📋 What was demonstrated:');
    console.log('• Subscription tier labels for visual organization');
    console.log('• Clean card descriptions focused on project requirements');
    console.log('• Automatic due date calculation based on subscription tiers');
    console.log('• Start dates showing exact submission times');
    console.log('• Complete client information and project context');
    console.log('• Frame.io links and review links for collaboration');
    console.log('• Revision workflow with 48-hour turnaround regardless of tier');
    console.log('• Professional card formatting with all project details');
    
    console.log('\n🔍 Enhanced Benefits:');
    console.log('• Visual priority system: Red (Growth Accelerator) = Urgent');
    console.log('• Easy filtering by subscription tier using label filters');
    console.log('• Automatic workflow integration from your application');
    console.log('• Complete audit trail with dates and client information');
    console.log('• Seamless editor assignment and project tracking');
    
    console.log('\n(Test cards can be safely deleted after review)');

  } catch (error) {
    console.error('\n❌ Integration test failed:', error.response?.data || error.message);
  }
}

testCompleteTrelloIntegration().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Integration test error:', error);
  process.exit(1);
});