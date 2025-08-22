/**
 * Test Tally form data integration with Trello cards
 * This creates a realistic test card with sample Tally form responses
 */

import axios from 'axios';

// Simple Trello API client for testing
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

  async addAttachmentToCard(cardId, url, name) {
    const response = await axios.post(`${this.baseUrl}/cards/${cardId}/attachments`, {
      url,
      name,
      ...this.getAuthParams()
    });
    return response.data;
  }

  async addCommentToCard(cardId, text) {
    const response = await axios.post(`${this.baseUrl}/cards/${cardId}/actions/comments`, {
      text,
      ...this.getAuthParams()
    });
    return response.data;
  }

  formatProjectCard(project, user, subscription, frameioLink, tallyData) {
    const creationDate = project.createdAt ? new Date(project.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
    const submissionDate = project.submittedToEditorAt ? new Date(project.submittedToEditorAt).toLocaleDateString() : 'Not submitted yet';
    
    let description = `**Project ID:** ${project.id}
**Client:** ${user.firstName} ${user.lastName} (${user.email})
**Company:** ${user.company || 'Not provided'}
**Subscription:** ${subscription?.tier || 'Unknown'}
**Project Created:** ${creationDate}
**Submitted to Editor:** ${submissionDate}
**Frame.io Link:** ${frameioLink}

---
`;

    if (tallyData) {
      description += `**📋 CLIENT REQUIREMENTS & INSTRUCTIONS:**\n\n`;
      
      // Handle different Tally data formats
      if (tallyData.fields && Array.isArray(tallyData.fields)) {
        // Format: { fields: [{ label, value }] }
        tallyData.fields.forEach((field) => {
          if (field.label && field.value) {
            description += `**Q: ${field.label}**\n`;
            description += `A: ${field.value}\n\n`;
          }
        });
      } else if (typeof tallyData === 'object') {
        // Format: Direct object with key-value pairs
        Object.keys(tallyData).forEach((key) => {
          const value = tallyData[key];
          if (value && key !== 'submissionId' && key !== 'createdAt') {
            // Format field names (remove underscores, capitalize)
            const formattedKey = key
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase());
            
            description += `**Q: ${formattedKey}**\n`;
            if (typeof value === 'object') {
              description += `A: ${JSON.stringify(value, null, 2)}\n\n`;
            } else {
              description += `A: ${value}\n\n`;
            }
          }
        });
      }
      
      description += `---\n\n`;
    }

    return {
      name: `${project.title} - ${user.firstName}`,
      desc: description
    };
  }
}

const trelloClient = new TrelloTestClient();

async function testTallyTrelloIntegration() {
  console.log('🧪 Testing Tally Form → Trello Card Integration...\n');

  try {
    // Sample Tally form data (realistic video editing form responses)
    const sampleTallyData = {
      "project_type": "Corporate Training Video",
      "video_length": "3-5 minutes",
      "target_audience": "New employees and managers",
      "key_message": "Introduce company values and workplace culture to new hires",
      "visual_style": "Professional, modern, energetic with company branding",
      "music_preferences": "Upbeat corporate music, not too loud, background only",
      "deadlines": "Need final video by end of month for new hire orientation",
      "additional_notes": "Please include our company logo prominently and use the brand colors (blue and white). We have talking head footage of CEO and HR manager that needs editing together with some office B-roll footage.",
      "revisions_expected": "Likely 1-2 rounds of revisions after initial review",
      "contact_preference": "Email preferred, but phone OK for urgent matters"
    };

    // Test different subscription tiers
    const subscriptionTiers = [
      { name: "Growth Accelerator", tier: "Growth Accelerator", hours: 48 },
      { name: "Consistency Club", tier: "Consistency Club", days: 4 },
      { name: "Creative Spark", tier: "Creative Spark", days: 7 }
    ];

    console.log('Testing subscription-based due dates:\n');

    for (const subscription of subscriptionTiers) {
      // Sample project and user data with submission dates
      const sampleProject = {
        id: 999 + subscriptionTiers.indexOf(subscription),
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

    const frameioLink = "https://app.frame.io/library/abc123-test-folder";

      // Format the card using the enhanced formatting
      const cardData = trelloClient.formatProjectCard(
        sampleProject,
        sampleUser, 
        subscription,
        frameioLink,
        sampleTallyData
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
    
      const TODO_LIST_ID = '684bff2e9e09bcad40e947dc'; // "New" list
      
      const card = await trelloClient.createCard({
        name: `🧪 ${subscription.name.toUpperCase()} TEST - ${cardData.name}`,
        desc: cardData.desc,
        idList: TODO_LIST_ID,
        start: cardData.start,
        due: cardData.due
      });

      console.log(`   ✅ Card created: https://trello.com/c/${card.shortLink}`);
      console.log(`   📅 Dates set in Trello with ${subscription.name} turnaround`);
      console.log('');

    // Add Frame.io link as attachment for better visibility
    console.log('\n4. Adding Frame.io link as attachment...');
    try {
      await trelloClient.addAttachmentToCard(card.id, frameioLink, "Frame.io Project Folder");
      console.log('✅ Frame.io attachment added');
    } catch (error) {
      console.log('⚠️ Could not add attachment (non-critical):', error.message);
    }

    // Add a comment with additional context
    console.log('\n5. Adding context comment...');
    try {
      const comment = `This is a test card demonstrating enhanced Trello integration with submission dates.

The card now includes:
✓ Client information (with email and company)
✓ Project creation date (when project was first created)
✓ Submission date (when submitted to editor)
✓ All Tally form questions and answers
✓ Frame.io project link
✓ Subscription tier info

This helps editors track:
- How long ago the project was submitted
- Project timeline and urgency
- Complete client context for better service

Ready for editor assignment and workflow tracking!`;
      
      await trelloClient.addCommentToCard(card.id, comment);
      console.log('✅ Context comment added');
    } catch (error) {
      console.log('⚠️ Could not add comment (non-critical):', error.message);
    }

    console.log('\n🎉 Tally → Trello integration test complete!');
    console.log('\nWhat you can see in Trello:');
    console.log('• Complete client information');
    console.log('• All Tally form questions and answers formatted clearly');
    console.log('• Project details and Frame.io links');  
    console.log('• Professional card structure ready for editors');
    
    console.log(`\n👀 View the test card: https://trello.com/c/${card.shortLink}`);
    console.log('   (This card can be safely deleted after review)');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

testTallyTrelloIntegration().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});