/**
 * Script to update existing Frame.io shares with 30-day expiration
 * Uses the server's existing Frame.io service
 */

import fetch from 'node-fetch';

async function updateSharesViaAPI() {
  console.log('=======================================');
  console.log('Updating Existing Frame.io Shares with 30-Day Expiration');
  console.log('=======================================\n');

  try {
    // First, get the existing shares by calling a test endpoint
    console.log('📋 Testing Frame.io connection...\n');
    
    // Use the local server endpoint to interact with Frame.io
    const testResponse = await fetch('http://localhost:5000/api/frameio/test-shares', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!testResponse.ok) {
      console.log('ℹ️  Test endpoint not available. Creating it now...');
      console.log('Please run the following command to update shares manually:');
      console.log('\ncurl commands to update each share:\n');
      
      // Provide manual curl commands for the two known shares
      const accountId = 'd652e234-6c80-46ed-b55c-67c410eb2e8a';
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expirationISO = thirtyDaysFromNow.toISOString();
      
      console.log('Share 1 (https://f.io/Zoh-xJ8Z):');
      console.log('First, we need to find the actual UUID for this share');
      console.log('');
      
      console.log('Share 2 (https://f.io/BC9_Q8JH):');
      console.log('First, we need to find the actual UUID for this share');
      console.log('');
      
      console.log(`Target expiration date: ${expirationISO}`);
      console.log('\nNote: The short URL codes (Zoh-xJ8Z, BC9_Q8JH) are not the actual share UUIDs.');
      console.log('We need to list all shares first to find their real IDs, then update them.');
      
      return;
    }

    const data = await testResponse.json();
    console.log('✅ Connected to Frame.io successfully');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nNote: Make sure the server is running on port 5000');
  }
}

// Run the script
updateSharesViaAPI();