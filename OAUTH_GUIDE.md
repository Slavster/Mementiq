# Frame.io OAuth Authorization Guide

## Step-by-Step Process

### Step 1: Access the Test Page
1. Open your app in the browser
2. Navigate to `/frameio-test` 
3. You should see the Frame.io OAuth & Integration Test page

### Step 2: Generate OAuth URL
1. Click the "Get OAuth URL" button
2. This will generate the authorization URL for Frame.io
3. You'll see a new "Authorize Frame.io" button appear

### Step 3: Authorize with Frame.io
1. Click "Authorize Frame.io" - this opens Frame.io in a new tab
2. If not logged in to Frame.io, log in with your account
3. Review the permissions requested:
   - Account read access
   - Asset create/read permissions
   - Project create/read permissions
4. Click "Allow" to authorize the application

### Step 4: Get Your Access Token
1. After authorization, you'll be redirected to a success page
2. Copy the entire access token from the textarea
3. The token will look like: `fio-u-xyz...` (very long string)

### Step 5: Configure the Token
1. Go to Replit Secrets (in your Replit sidebar)
2. Add a new secret:
   - Key: `FRAMEIO_API_TOKEN`
   - Value: [paste the access token you copied]
3. Save the secret

### Step 6: Test Integration
1. Return to the `/frameio-test` page
2. Click "Run All Tests" to verify everything works
3. You should see successful results for:
   - Connection test
   - Photo upload test
   - Project creation capabilities

## Expected Redirect URLs
The system is configured to handle these redirect URLs:
- `http://localhost:5000/api/frameio/oauth/callback`
- `https://[your-replit-domain]/api/frameio/oauth/callback`

## Troubleshooting
- If you get "invalid_request" errors, ensure your Frame.io app has the correct redirect URI
- Tokens expire after 1 hour - you'll need to re-authorize periodically
- Check the browser console for any errors during the OAuth flow