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
    const creationDate = new Date().toLocaleDateString();
    
    let description = `**Project ID:** ${project.id}
**Client:** ${user.firstName} ${user.lastName}
**Subscription:** ${subscription?.tier || 'Unknown'}
**Created:** ${creationDate}
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

    // Sample project and user data
    const sampleProject = {
      id: 999,
      title: "Acme Corp Training Video",
      status: "edit in progress"
    };

    const sampleUser = {
      firstName: "Sarah",
      lastName: "Johnson", 
      email: "sarah.johnson@acmecorp.com",
      company: "Acme Corporation"
    };

    const sampleSubscription = {
      tier: "Pro"
    };

    const frameioLink = "https://app.frame.io/library/abc123-test-folder";

    console.log('1. Formatting Tally data for Trello card...');
    
    // Format the card using the enhanced formatting
    const cardData = trelloClient.formatProjectCard(
      sampleProject,
      sampleUser, 
      sampleSubscription,
      frameioLink,
      sampleTallyData
    );

    console.log('✅ Card formatted successfully');
    console.log('\n2. Card content preview:');
    console.log('='.repeat(60));
    console.log(`TITLE: ${cardData.name}`);
    console.log('='.repeat(60));
    console.log(cardData.desc);
    console.log('='.repeat(60));

    // Create the actual Trello card
    console.log('\n3. Creating test card in Trello...');
    
    const TODO_LIST_ID = '684bff2e9e09bcad40e947dc'; // "New" list
    
    const card = await trelloClient.createCard({
      name: `🧪 TALLY TEST - ${cardData.name}`,
      desc: cardData.desc,
      idList: TODO_LIST_ID
    });

    console.log(`✅ Test card created successfully!`);
    console.log(`   Card ID: ${card.id}`);
    console.log(`   Card URL: https://trello.com/c/${card.shortLink}`);
    console.log(`   List: "New" (TODO)`);

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
      const comment = `This is a test card demonstrating Tally form integration. 

All client requirements and form responses are now included in the card description with proper Q&A formatting.

The card includes:
✓ Client information
✓ Project details  
✓ All Tally form questions and answers
✓ Frame.io project link
✓ Subscription tier info

Ready for editor assignment and project workflow!`;
      
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