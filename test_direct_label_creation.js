/**
 * Direct test of Trello label creation API
 */

import axios from 'axios';

async function testDirectLabelCreation() {
  console.log('🧪 Direct Trello Label Creation Test...\n');

  const TRELLO_KEY = process.env.TRELLO_KEY;
  const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
  const BOARD_ID = 'kg3EFU40';

  if (!TRELLO_KEY || !TRELLO_TOKEN) {
    console.error('❌ Missing TRELLO_KEY or TRELLO_TOKEN environment variables');
    return;
  }

  try {
    console.log('📋 Current board labels:');
    
    // Get existing labels
    const labelsResponse = await axios.get(`https://api.trello.com/1/boards/${BOARD_ID}/labels`, {
      params: {
        key: TRELLO_KEY,
        token: TRELLO_TOKEN
      }
    });

    console.log('Found labels:', labelsResponse.data.length);
    labelsResponse.data.forEach(label => {
      if (label.name) {
        console.log(`   • ${label.name} (${label.color})`);
      }
    });

    console.log('\n🏷️ Creating subscription tier labels:');

    // Test subscription tier labels with proper colors
    const subscriptionTiers = [
      { name: "Growth Accelerator", color: "red" },
      { name: "Consistency Club", color: "orange" },
      { name: "Creative Spark", color: "yellow" }
    ];

    for (const tier of subscriptionTiers) {
      console.log(`\nCreating: ${tier.name} (${tier.color})`);
      
      try {
        const createResponse = await axios.post('https://api.trello.com/1/labels', {
          name: tier.name,
          color: tier.color,
          idBoard: BOARD_ID,
          key: TRELLO_KEY,
          token: TRELLO_TOKEN
        });

        console.log(`✅ Created: ${tier.name}`);
        console.log(`   Label ID: ${createResponse.data.id}`);
        console.log(`   Color: ${createResponse.data.color}`);
        
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message === 'Invalid id') {
          console.log(`❌ Invalid id error - checking if label already exists...`);
          
          // Check if label already exists
          const existingLabel = labelsResponse.data.find(label => 
            label.name.toLowerCase() === tier.name.toLowerCase()
          );
          
          if (existingLabel) {
            console.log(`   📌 Label already exists: ${tier.name} (${existingLabel.color})`);
          } else {
            console.log(`   ❌ Unknown error creating ${tier.name}:`, error.response?.data);
          }
        } else {
          console.log(`❌ Error creating ${tier.name}:`, error.response?.data || error.message);
        }
      }
    }

    console.log('\n📋 Final board labels:');
    
    // Get updated labels
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

testDirectLabelCreation().then(() => {
  console.log('\n🎉 Direct label creation test complete!');
  process.exit(0);
}).catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});