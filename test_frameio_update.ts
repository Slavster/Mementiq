// Test script to manually update Frame.io asset status for Test 9
import { frameioV4Service } from './server/frameioV4Service.js';

async function testFrameioStatusUpdate() {
  try {
    console.log('🧪 TESTING: Manual Frame.io asset status update for Test 9 (Project ID 16)...');
    
    // Initialize the service and load tokens
    await frameioV4Service.initialize();
    console.log('✅ Frame.io service initialized');
    
    // Update project assets status to "Approved" 
    console.log('📝 Updating Frame.io assets to "Approved" status...');
    await frameioV4Service.updateProjectAssetsStatus(16, 'Approved');
    console.log('✅ Frame.io assets updated to "Approved" for project 16');
    
    console.log('🎉 Manual test completed successfully - check Frame.io to verify asset status');
  } catch (error) {
    console.error('❌ Manual test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testFrameioStatusUpdate().then(() => {
  console.log('Script execution completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});