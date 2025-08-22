/**
 * Setup script to add editor mappings and prepare webhook system
 */

import { db } from './server/db.js';
import { trelloEditors } from './shared/schema.js';

async function setupEditors() {
  console.log('👥 Setting up Trello editor mappings...\n');

  // Sample editor data - replace with your actual editors
  const editors = [
    {
      trelloMemberId: '5d53c3cf7e6c7a22e0b8e12a', // Replace with actual Trello member IDs
      editorName: 'John Smith',
      editorEmail: 'john.smith@example.com'
    },
    {
      trelloMemberId: '5d53c3cf7e6c7a22e0b8e12b', // Replace with actual Trello member IDs
      editorName: 'Jane Doe',
      editorEmail: 'jane.doe@example.com'
    },
    {
      trelloMemberId: '5d53c3cf7e6c7a22e0b8e12c', // Replace with actual Trello member IDs
      editorName: 'Bob Wilson',
      editorEmail: 'bob.wilson@example.com'
    }
  ];

  try {
    for (const editor of editors) {
      console.log(`📝 Adding editor: ${editor.editorName}`);
      
      await db.insert(trelloEditors).values({
        trelloMemberId: editor.trelloMemberId,
        editorName: editor.editorName,
        editorEmail: editor.editorEmail,
        isActive: true
      }).onConflictDoUpdate({
        target: trelloEditors.trelloMemberId,
        set: {
          editorName: editor.editorName,
          editorEmail: editor.editorEmail,
          isActive: true,
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ Editor added/updated: ${editor.editorName} (${editor.trelloMemberId})`);
    }

    console.log('\n🎯 Editor mapping setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Get real Trello member IDs from your board members');
    console.log('2. Update the editor data above with actual member IDs');
    console.log('3. Deploy your application to get a public HTTPS URL');
    console.log('4. Run webhook setup script with the deployed URL');
    console.log('5. Test editor assignments in Trello cards');

    console.log('\n🔍 To get Trello member IDs:');
    console.log('curl "https://api.trello.com/1/boards/684bfec9a3ce706ae8b8ca03/members?key=YOUR_KEY&token=YOUR_TOKEN"');

  } catch (error) {
    console.error('❌ Error setting up editors:', error);
  }
}

setupEditors().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Setup error:', error);
  process.exit(1);
});