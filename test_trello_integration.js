/**
 * Test script for Trello integration
 * This script tests the Trello API connection and basic functionality
 */

import { trelloService } from './server/services/trello.js';
import { trelloAutomation } from './server/services/trello-automation.js';

async function testTrelloIntegration() {
  console.log('🧪 Testing Trello Integration...\n');

  try {
    // Test 1: Get boards
    console.log('1. Testing Trello API connection - Getting boards...');
    const boards = await trelloService.getBoards();
    console.log(`✅ Successfully connected! Found ${boards.length} boards`);
    
    if (boards.length > 0) {
      console.log('\nAvailable boards:');
      boards.forEach((board, index) => {
        console.log(`   ${index + 1}. ${board.name} (ID: ${board.id})`);
      });
      
      // Test 2: Get lists from first board
      const firstBoard = boards[0];
      console.log(`\n2. Getting lists from board "${firstBoard.name}"...`);
      const lists = await trelloService.getBoardLists(firstBoard.id);
      console.log(`✅ Found ${lists.length} lists`);
      
      if (lists.length > 0) {
        console.log('\nAvailable lists:');
        lists.forEach((list, index) => {
          console.log(`   ${index + 1}. ${list.name} (ID: ${list.id})`);
        });
      }
      
      // Test 3: Check current Trello configuration
      console.log('\n3. Checking current Trello configuration...');
      const config = await trelloAutomation.getTrelloConfig();
      if (config) {
        console.log('✅ Trello is configured:');
        console.log(`   Board ID: ${config.boardId}`);
        console.log(`   Todo List ID: ${config.todoListId}`);
        console.log(`   Done List ID: ${config.doneListId}`);
        if (config.revisionListId) {
          console.log(`   Revision List ID: ${config.revisionListId}`);
        }
      } else {
        console.log('ℹ️  No Trello configuration found yet');
        console.log('   Use the API endpoints to set up configuration:');
        console.log('   POST /api/trello/config with boardId, todoListId, doneListId');
      }
    }
    
    console.log('\n🎉 Trello integration test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Trello integration test failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('unauthorized')) {
      console.log('\n💡 Make sure you have:');
      console.log('   1. TRELLO_API_KEY set in your environment');
      console.log('   2. TRELLO_TOKEN set in your environment');
      console.log('   3. Valid Trello API credentials');
    }
  }
}

// Run the test
testTrelloIntegration().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test script error:', error);
  process.exit(1);
});

export { testTrelloIntegration };