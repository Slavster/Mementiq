/**
 * Setup script to configure Trello board with the provided board ID
 */

import { trelloService } from './server/services/trello.js';
import { trelloAutomation } from './server/services/trello-automation.js';

const BOARD_ID = 'kg3EFU40';

async function setupTrelloBoard() {
  console.log('🔧 Setting up Trello board configuration...\n');

  try {
    // Get board details
    console.log(`1. Fetching board details for: ${BOARD_ID}`);
    const boards = await trelloService.getBoards();
    const targetBoard = boards.find(b => b.id === BOARD_ID);
    
    if (!targetBoard) {
      console.error(`❌ Board ${BOARD_ID} not found in your accessible boards`);
      console.log('Available boards:');
      boards.forEach(board => console.log(`   - ${board.name} (${board.id})`));
      return;
    }
    
    console.log(`✅ Found board: "${targetBoard.name}"`);

    // Get board lists
    console.log('\n2. Fetching board lists...');
    const lists = await trelloService.getBoardLists(BOARD_ID);
    console.log(`✅ Found ${lists.length} lists:`);
    
    lists.forEach((list, index) => {
      console.log(`   ${index + 1}. ${list.name} (${list.id})`);
    });

    // Try to auto-map lists based on common names
    const listMapping = {
      todoListId: null,
      inProgressListId: null,
      revisionListId: null,
      doneListId: null
    };

    // Common patterns for list names
    const patterns = {
      todo: ['new', 'to do', 'todo', 'backlog', 'incoming'],
      inProgress: ['in progress', 'doing', 'working', 'active', 'current'],
      revision: ['revision', 'revisions', 'changes', 'feedback'],
      done: ['done', 'complete', 'completed', 'finished', 'delivered']
    };

    lists.forEach(list => {
      const name = list.name.toLowerCase();
      
      if (patterns.todo.some(pattern => name.includes(pattern)) && !listMapping.todoListId) {
        listMapping.todoListId = list.id;
        console.log(`🎯 Auto-mapped TODO: "${list.name}"`);
      }
      else if (patterns.inProgress.some(pattern => name.includes(pattern)) && !listMapping.inProgressListId) {
        listMapping.inProgressListId = list.id;
        console.log(`🎯 Auto-mapped IN PROGRESS: "${list.name}"`);
      }
      else if (patterns.revision.some(pattern => name.includes(pattern)) && !listMapping.revisionListId) {
        listMapping.revisionListId = list.id;
        console.log(`🎯 Auto-mapped REVISIONS: "${list.name}"`);
      }
      else if (patterns.done.some(pattern => name.includes(pattern)) && !listMapping.doneListId) {
        listMapping.doneListId = list.id;
        console.log(`🎯 Auto-mapped DONE: "${list.name}"`);
      }
    });

    // Use first and last lists as fallback
    if (!listMapping.todoListId && lists.length > 0) {
      listMapping.todoListId = lists[0].id;
      console.log(`📌 Using first list as TODO: "${lists[0].name}"`);
    }
    
    if (!listMapping.doneListId && lists.length > 1) {
      listMapping.doneListId = lists[lists.length - 1].id;
      console.log(`📌 Using last list as DONE: "${lists[lists.length - 1].name}"`);
    }

    console.log('\n3. Proposed configuration:');
    console.log(`   Board ID: ${BOARD_ID}`);
    console.log(`   TODO List: ${listMapping.todoListId} (${lists.find(l => l.id === listMapping.todoListId)?.name})`);
    console.log(`   IN PROGRESS List: ${listMapping.inProgressListId || 'Not mapped'}`);
    console.log(`   REVISIONS List: ${listMapping.revisionListId || 'Not mapped'}`);
    console.log(`   DONE List: ${listMapping.doneListId} (${lists.find(l => l.id === listMapping.doneListId)?.name})`);

    // Save configuration
    if (listMapping.todoListId && listMapping.doneListId) {
      console.log('\n4. Saving Trello configuration...');
      await trelloAutomation.setupTrelloConfig(
        BOARD_ID,
        listMapping.todoListId,
        listMapping.doneListId,
        listMapping.revisionListId
      );
      console.log('✅ Trello configuration saved successfully!');

      // Test with a sample card
      console.log('\n5. Creating test card...');
      const testCard = await trelloService.createCard({
        name: `🧪 Test Card - ${new Date().toLocaleString()}`,
        desc: `This is a test card created by Mementiq integration\n\nBoard: ${targetBoard.name}\nCreated: ${new Date().toISOString()}`,
        idList: listMapping.todoListId
      });

      console.log(`✅ Test card created: ${testCard.id}`);
      console.log(`   You can view it at: https://trello.com/c/${testCard.shortLink}`);

    } else {
      console.log('\n❌ Could not find suitable TODO and DONE lists');
      console.log('Please manually configure using the API endpoints');
    }

    console.log('\n🎉 Trello board setup completed!');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
  }
}

setupTrelloBoard().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Setup script error:', error);
  process.exit(1);
});