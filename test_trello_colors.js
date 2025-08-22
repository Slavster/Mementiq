/**
 * Test valid Trello color names and try creating labels manually
 */

import axios from 'axios';

async function testTrelloColors() {
  console.log('🎨 Testing Valid Trello Colors...\n');

  const TRELLO_KEY = process.env.TRELLO_KEY;
  const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
  const BOARD_ID = 'kg3EFU40';

  if (!TRELLO_KEY || !TRELLO_TOKEN) {
    console.error('Missing TRELLO_KEY or TRELLO_TOKEN environment variables');
    return;
  }

  try {
    // Test valid Trello colors (these are the official Trello color names)
    const validColors = [
      'green', 'yellow', 'orange', 'red', 'purple', 'blue', 
      'sky', 'lime', 'pink', 'black',
      // Dark variants
      'green_dark', 'yellow_dark', 'orange_dark', 'red_dark', 'purple_dark', 'blue_dark', 
      'sky_dark', 'lime_dark', 'pink_dark', 'black_dark',
      // Light variants  
      'green_light', 'yellow_light', 'orange_light', 'red_light', 'purple_light', 'blue_light', 
      'sky_light', 'lime_light', 'pink_light'
    ];

    console.log('📋 Valid Trello colors:');
    console.log(validColors.join(', '));
    
    console.log('\n🏷️ Creating subscription tier labels with valid colors:');

    // Map subscription tiers to valid Trello colors
    const subscriptionTiers = [
      { name: "Growth Accelerator", color: "red", description: "Premium tier - 48 hours" },
      { name: "Consistency Club", color: "orange", description: "Standard tier - 4 days" },
      { name: "Creative Spark", color: "yellow", description: "Basic tier - 7 days" }
    ];

    const createdLabels = [];

    for (const tier of subscriptionTiers) {
      console.log(`\n📊 ${tier.name} (${tier.color})`);
      console.log(`   Description: ${tier.description}`);
      
      try {
        // First check if board exists and we have permission
        const boardResponse = await axios.get(`https://api.trello.com/1/boards/${BOARD_ID}`, {
          params: {
            key: TRELLO_KEY,
            token: TRELLO_TOKEN
          }
        });

        console.log(`   ✅ Board access confirmed: ${boardResponse.data.name}`);

        // Now try to create the label
        const labelData = {
          name: tier.name,
          color: tier.color,
          idBoard: BOARD_ID
        };

        console.log(`   Creating label with data:`, JSON.stringify(labelData, null, 2));

        const createResponse = await axios.post('https://api.trello.com/1/labels', labelData, {
          params: {
            key: TRELLO_KEY,
            token: TRELLO_TOKEN
          }
        });

        console.log(`   ✅ Created label: ${tier.name}`);
        console.log(`   Label ID: ${createResponse.data.id}`);
        console.log(`   Color: ${createResponse.data.color}`);
        
        createdLabels.push({
          ...tier,
          id: createResponse.data.id
        });
        
      } catch (error) {
        console.log(`   ❌ Error creating ${tier.name}:`);
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Message: ${error.response?.data?.message || error.message}`);
        
        if (error.response?.data) {
          console.log(`   Full error:`, JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    // If we created any labels, test using them on a card
    if (createdLabels.length > 0) {
      console.log('\n📝 Testing label application to a card...');
      
      const testCard = {
        name: "🧪 Label Test Card",
        desc: "Testing subscription tier labels",
        idList: "684bff2e9e09bcad40e947dc", // "New" list
        idLabels: createdLabels.map(label => label.id)
      };

      try {
        const cardResponse = await axios.post('https://api.trello.com/1/cards', testCard, {
          params: {
            key: TRELLO_KEY,
            token: TRELLO_TOKEN
          }
        });

        console.log(`✅ Test card created with labels: https://trello.com/c/${cardResponse.data.shortLink}`);
        
      } catch (error) {
        console.log(`❌ Error creating test card:`, error.response?.data || error.message);
      }
    }

    console.log('\n📋 Current board labels after test:');
    
    const finalLabelsResponse = await axios.get(`https://api.trello.com/1/boards/${BOARD_ID}/labels`, {
      params: {
        key: TRELLO_KEY,
        token: TRELLO_TOKEN
      }
    });

    finalLabelsResponse.data.forEach(label => {
      if (label.name) {
        console.log(`   • ${label.name} (${label.color})`);
      }
    });

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

testTrelloColors().then(() => {
  console.log('\n🎉 Color test complete!');
  process.exit(0);
}).catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});