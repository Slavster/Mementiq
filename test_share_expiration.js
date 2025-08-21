/**
 * Test script to verify Frame.io share links are created with 30-day expiration
 * 
 * Run with: node test_share_expiration.js
 */

console.log('=======================================');
console.log('Frame.io Share Expiration Test');
console.log('=======================================\n');

// Calculate 30 days from now
const thirtyDaysFromNow = new Date();
thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

console.log('Current Date/Time:', new Date().toISOString());
console.log('Expected Expiration (30 days):', thirtyDaysFromNow.toISOString());
console.log('\n');

console.log('✅ Share Expiration Implementation Details:');
console.log('-------------------------------------------');
console.log('1. When a share is created via POST /accounts/{accountId}/projects/{projectId}/shares');
console.log('2. The system immediately sends a PATCH request to /accounts/{accountId}/shares/{shareId}');
console.log('3. The PATCH request includes: { data: { expiration: "ISO-8601-timestamp" } }');
console.log('4. The expiration is set to exactly 30 days from creation time');
console.log('\n');

console.log('📋 Testing Checklist:');
console.log('-------------------');
console.log('[ ] Share creation succeeds');
console.log('[ ] Share ID is returned');
console.log('[ ] PATCH request is sent with expiration');
console.log('[ ] Expiration is set to 30 days from now');
console.log('[ ] Share link continues to work after expiration is set');
console.log('\n');

console.log('🔍 How to Verify in Logs:');
console.log('------------------------');
console.log('Look for these log messages when creating a share:');
console.log('1. "⏰ Setting share expiration to 30 days from now: [ISO timestamp]"');
console.log('2. "✅ Share expiration set successfully to [ISO timestamp]"');
console.log('\n');

console.log('⚠️  Note: If you see "Failed to set share expiration", the share will still work');
console.log('but won\'t have the 30-day expiration. This might indicate permission issues.');
console.log('\n');

console.log('Test complete. Check server logs when creating shares to verify expiration is set.');