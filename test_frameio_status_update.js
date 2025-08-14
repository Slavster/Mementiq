// Test script to manually update Frame.io asset status for Test 9
const { frameioV4Service } = require('./server/frameioV4Service.ts');

async function testFrameioStatusUpdate() {
  try {
    console.log('Testing Frame.io asset status update for Test 9 (Project ID 16)...');
    
    // Initialize the service
    await frameioV4Service.initialize();
    console.log('Frame.io service initialized');
    
    // Update project assets status to "Approved"
    const result = await frameioV4Service.updateProjectAssetsStatus(16, 'Approved');
    console.log('Frame.io assets updated to "Approved" for project 16');
    console.log('Result:', result);
    
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testFrameioStatusUpdate();