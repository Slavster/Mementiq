// Simple test to directly call the folder creation logic
const { db } = require('./server/db.ts');
const { FrameioV4Service } = require('./server/frameioV4Service.ts');

async function testFolderCreation() {
  console.log('🧪 Testing folder creation logic directly...');
  
  try {
    const frameio = new FrameioV4Service();
    await frameio.initialize();
    
    // Test creating a folder with the current user folder ID
    const userFolderId = 'ea6e24b3-d1d9-4109-86c6-a1aae2fe00ea';
    const testFolderName = 'Test Direct Creation';
    
    console.log(`Creating test folder "${testFolderName}" under user folder ${userFolderId}`);
    
    const result = await frameio.createFolder(testFolderName, userFolderId);
    console.log('✅ Folder created successfully:', result);
    
  } catch (error) {
    console.error('❌ Folder creation failed:', error.message);
  }
}

testFolderCreation();