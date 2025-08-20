// Test script to verify polling system works for revision detection
import { assetDetectionService } from './server/assetDetectionService.js';

console.log('=== Testing Polling System for Revision Detection ===\n');

// Trigger a manual check
assetDetectionService.triggerManualCheck()
  .then(result => {
    console.log('\n✅ Polling system test completed');
    console.log(`Projects checked: ${result.checked}`);
    console.log(`Projects updated: ${result.updated}`);
    
    if (result.projects.length > 0) {
      console.log('\nProject details:');
      result.projects.forEach(project => {
        console.log(`- Project ${project.id} (${project.title})`);
        console.log(`  Status updated: ${project.statusUpdated}`);
        console.log(`  Videos found: ${project.videoCount}`);
        if (project.isRevision) {
          console.log(`  Type: Revision`);
        }
      });
    }
    
    console.log('\n🎯 The polling system will automatically check for new videos every 5 minutes');
    console.log('   It monitors both "edit in progress" and "revision in progress" projects');
    console.log('   No webhook configuration needed!');
  })
  .catch(error => {
    console.error('❌ Error testing polling system:', error);
  });