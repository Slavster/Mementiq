/**
 * Script to update existing Frame.io share links with 30-day expiration
 * Uses direct API calls with the existing authenticated token
 */

import { db } from './server/db';
import { projects, serviceTokens } from './shared/schema';
import { eq, isNotNull } from 'drizzle-orm';

async function updateExistingShares() {
  console.log('=======================================');
  console.log('Updating Existing Share Links with 30-Day Expiration');
  console.log('=======================================\n');

  try {
    // Get the Frame.io token from database
    const frameioToken = await db
      .select()
      .from(serviceTokens)
      .where(eq(serviceTokens.service, 'frameio-v4'))
      .limit(1);

    if (!frameioToken.length || !frameioToken[0].accessToken) {
      console.error('❌ No Frame.io access token found in database. Please authenticate first.');
      process.exit(1);
    }

    const accessToken = frameioToken[0].accessToken;
    const accountId = 'd652e234-6c80-46ed-b55c-67c410eb2e8a'; // Your Frame.io account ID
    console.log(`✅ Found Frame.io access token`);
    console.log(`Account ID: ${accountId}\n`);

    // Find all projects with share links
    const projectsWithShares = await db
      .select()
      .from(projects)
      .where(isNotNull(projects.frameioReviewLink));

    console.log(`Found ${projectsWithShares.length} projects with share links\n`);

    // Calculate expiration date (30 days from now)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expirationISO = thirtyDaysFromNow.toISOString();
    console.log(`New expiration date: ${expirationISO}\n`);

    // Process each share link
    for (const project of projectsWithShares) {
      console.log(`Processing Project ID: ${project.id}`);
      console.log(`Project Name: ${project.name}`);
      console.log(`Share Link: ${project.frameioReviewLink}`);
      
      // Extract share ID from the link
      // Frame.io share links typically look like: https://f.io/XXXXXXXX
      const shareLink = project.frameioReviewLink;
      let shareId = null;
      
      // Try to extract share ID from different URL formats
      if (shareLink.includes('f.io/')) {
        shareId = shareLink.split('f.io/')[1]?.split('?')[0];
      } else if (shareLink.includes('/reviews/')) {
        shareId = shareLink.split('/reviews/')[1]?.split('?')[0];
      } else if (shareLink.includes('/share/')) {
        shareId = shareLink.split('/share/')[1]?.split('?')[0];
      }

      if (!shareId) {
        console.log(`⚠️ Could not extract share ID from URL: ${shareLink}`);
        console.log('   Will attempt to use the full path as ID...');
        // Sometimes the share ID might be the entire path after the domain
        shareId = shareLink.split('.io/')[1]?.split('?')[0];
      }

      console.log(`Share ID: ${shareId}`);

      try {
        // Update the share with expiration using direct API call
        const expirationUpdateBody = {
          data: {
            expiration: expirationISO
          }
        };

        console.log(`⏰ Updating share expiration...`);
        
        const response = await fetch(
          `https://api.frame.io/v4/accounts/${accountId}/shares/${shareId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'api-version': '4.0'
            },
            body: JSON.stringify(expirationUpdateBody)
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Successfully updated share ${shareId} to expire on ${expirationISO}`);
          console.log(`   New expiration:`, data?.data?.expiration || 'Not returned in response');
        } else {
          const errorData = await response.text();
          console.error(`❌ Failed to update share ${shareId}: HTTP ${response.status}`);
          console.error(`   Response:`, errorData);
        }
      } catch (error) {
        console.error(`❌ Failed to update share ${shareId}:`, error.message);
      }

      console.log('\n---\n');
    }

    console.log('✅ Update process complete!');
    console.log(`Attempted to set all existing shares to expire on: ${expirationISO}`);

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
updateExistingShares();