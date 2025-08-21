/**
 * Script to list all Frame.io shares and update them with 30-day expiration
 */

import { db } from './server/db';
import { serviceTokens } from './shared/schema';
import { eq } from 'drizzle-orm';

async function listAndUpdateShares() {
  console.log('=======================================');
  console.log('Listing and Updating Frame.io Shares');
  console.log('=======================================\n');

  try {
    // Get the Frame.io token from database
    const frameioToken = await db
      .select()
      .from(serviceTokens)
      .where(eq(serviceTokens.service, 'frameio-v4'))
      .limit(1);

    if (!frameioToken.length || !frameioToken[0].accessToken) {
      console.error('❌ No Frame.io access token found in database.');
      process.exit(1);
    }

    const accessToken = frameioToken[0].accessToken;
    const accountId = 'd652e234-6c80-46ed-b55c-67c410eb2e8a';
    const projectId = 'e0a4fadd-52b0-4156-91ed-8880bbc0c51a'; // Your Frame.io project
    
    console.log(`✅ Found Frame.io access token`);
    console.log(`Account ID: ${accountId}`);
    console.log(`Project ID: ${projectId}\n`);

    // Step 1: List all shares for the project
    console.log('📋 Fetching all shares for the project...\n');
    
    const listResponse = await fetch(
      `https://api.frame.io/v4/accounts/${accountId}/projects/${projectId}/shares`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'api-version': '4.0'
        }
      }
    );

    if (!listResponse.ok) {
      const errorData = await listResponse.text();
      console.error(`❌ Failed to list shares: HTTP ${listResponse.status}`);
      console.error(`   Response:`, errorData);
      process.exit(1);
    }

    const sharesData = await listResponse.json();
    const shares = sharesData?.data || [];
    
    console.log(`Found ${shares.length} shares in the project\n`);

    // Calculate expiration date (30 days from now)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expirationISO = thirtyDaysFromNow.toISOString();
    console.log(`New expiration date: ${expirationISO}\n`);

    // Step 2: Update each share with expiration
    for (const share of shares) {
      console.log(`---`);
      console.log(`Share Name: ${share.name || 'Unnamed'}`);
      console.log(`Share ID (UUID): ${share.id}`);
      console.log(`Short URL: ${share.short_url || 'N/A'}`);
      console.log(`Full URL: ${share.url || 'N/A'}`);
      console.log(`Current Expiration: ${share.expiration || 'None'}`);
      console.log(`Access Type: ${share.access || 'Unknown'}`);
      console.log(`Enabled: ${share.enabled}`);
      
      // Skip if share already has an expiration
      if (share.expiration) {
        const existingExpiration = new Date(share.expiration);
        console.log(`⚠️  Share already has expiration: ${existingExpiration.toISOString()}`);
        console.log(`   Skipping update...\n`);
        continue;
      }

      try {
        // Update the share with expiration
        const expirationUpdateBody = {
          data: {
            expiration: expirationISO
          }
        };

        console.log(`⏰ Setting expiration to: ${expirationISO}`);
        
        const updateResponse = await fetch(
          `https://api.frame.io/v4/accounts/${accountId}/shares/${share.id}`,
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

        if (updateResponse.ok) {
          const updateData = await updateResponse.json();
          console.log(`✅ Successfully updated share "${share.name || share.id}"`);
          console.log(`   New expiration: ${updateData?.data?.expiration || expirationISO}`);
        } else {
          const errorData = await updateResponse.text();
          console.error(`❌ Failed to update share: HTTP ${updateResponse.status}`);
          console.error(`   Response:`, errorData);
        }
      } catch (error) {
        console.error(`❌ Error updating share:`, error.message);
      }
      
      console.log('');
    }

    console.log('=======================================');
    console.log('✅ Update process complete!');
    console.log(`Processed ${shares.length} shares`);
    console.log(`Expiration set to: ${expirationISO}`);

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
listAndUpdateShares();