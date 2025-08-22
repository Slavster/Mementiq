/**
 * Direct Trello API test without imports
 */

import axios from 'axios';

const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const BOARD_ID = 'kg3EFU40';

async function testTrelloDirect() {
  console.log('🧪 Testing Trello API directly...\n');

  if (!TRELLO_KEY || !TRELLO_TOKEN) {
    console.error('❌ Missing Trello credentials');
    console.log('TRELLO_KEY:', !!TRELLO_KEY);
    console.log('TRELLO_TOKEN:', !!TRELLO_TOKEN);
    return;
  }

  console.log('✅ Trello credentials found');

  try {
    // Test 1: Get board lists
    console.log(`\n1. Fetching lists for board: ${BOARD_ID}`);
    const listsResponse = await axios.get(`https://api.trello.com/1/boards/${BOARD_ID}/lists`, {
      params: {
        key: TRELLO_KEY,
        token: TRELLO_TOKEN
      }
    });

    const lists = listsResponse.data;
    console.log(`✅ Found ${lists.length} lists:`);
    
    lists.forEach((list, index) => {
      console.log(`   ${index + 1}. ${list.name} (${list.id})`);
    });

    // Auto-map lists
    const listMapping = {};
    const patterns = {
      new: ['new', 'to do', 'todo', 'backlog', 'incoming'],
      inProgress: ['in progress', 'doing', 'working', 'active', 'current'],  
      revisions: ['revision', 'revisions', 'changes', 'feedback'],
      done: ['done', 'complete', 'completed', 'finished', 'delivered']
    };

    lists.forEach(list => {
      const name = list.name.toLowerCase();
      
      if (patterns.new.some(p => name.includes(p)) && !listMapping.new) {
        listMapping.new = { id: list.id, name: list.name };
      } else if (patterns.inProgress.some(p => name.includes(p)) && !listMapping.inProgress) {
        listMapping.inProgress = { id: list.id, name: list.name };
      } else if (patterns.revisions.some(p => name.includes(p)) && !listMapping.revisions) {
        listMapping.revisions = { id: list.id, name: list.name };
      } else if (patterns.done.some(p => name.includes(p)) && !listMapping.done) {
        listMapping.done = { id: list.id, name: list.name };
      }
    });

    console.log('\n2. Suggested list mapping:');
    console.log('New Projects:', listMapping.new ? `${listMapping.new.name} (${listMapping.new.id})` : 'Not found');
    console.log('In Progress:', listMapping.inProgress ? `${listMapping.inProgress.name} (${listMapping.inProgress.id})` : 'Not found');  
    console.log('Revisions:', listMapping.revisions ? `${listMapping.revisions.name} (${listMapping.revisions.id})` : 'Not found');
    console.log('Done:', listMapping.done ? `${listMapping.done.name} (${listMapping.done.id})` : 'Not found');

    // Test 2: Create test card if we have lists mapped
    if (listMapping.new) {
      console.log('\n3. Creating test card...');
      const cardResponse = await axios.post('https://api.trello.com/1/cards', {
        key: TRELLO_KEY,
        token: TRELLO_TOKEN,
        name: `🧪 Mementiq Test - ${new Date().toLocaleString()}`,
        desc: `Test card created by Mementiq integration\n\nBoard ID: ${BOARD_ID}\nCreated: ${new Date().toISOString()}\n\nThis card can be safely deleted.`,
        idList: listMapping.new.id
      });

      const card = cardResponse.data;
      console.log(`✅ Test card created: ${card.name}`);
      console.log(`   Card ID: ${card.id}`);
      console.log(`   URL: https://trello.com/c/${card.shortLink}`);
    }

    console.log('\n🎉 Trello integration test successful!');
    console.log('\nConfiguration values to use:');
    console.log(`BOARD_ID: ${BOARD_ID}`);
    if (listMapping.new) console.log(`TODO_LIST_ID: ${listMapping.new.id}`);
    if (listMapping.done) console.log(`DONE_LIST_ID: ${listMapping.done.id}`);  
    if (listMapping.revisions) console.log(`REVISION_LIST_ID: ${listMapping.revisions.id}`);

  } catch (error) {
    console.error('\n❌ Trello test failed:', error.response?.data || error.message);
  }
}

testTrelloDirect().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});