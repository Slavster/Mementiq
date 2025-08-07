# Frame.io OAuth Redirect URI Fix

## Issue
The OAuth error occurs because the redirect URI `http://localhost:5000/api/frameio/oauth/callback` is not registered in your Frame.io OAuth app configuration.

## Solution: Add Redirect URIs to Frame.io App

1. **Go to Frame.io Developer Console:**
   - Visit: https://developer.frame.io/
   - Sign in with your Frame.io account

2. **Edit Your OAuth App:**
   - Find your OAuth app (Client ID: 4fee919c-aad0-4aea-b835-842e2067dcdb)
   - Click "Edit" or "Settings"

3. **Add Redirect URIs:**
   Add these URLs to the "Redirect URIs" field:
   ```
   http://localhost:5000/api/frameio/oauth/callback
   https://workspace.username.repl.co/api/frameio/oauth/callback
   ```

4. **Save Changes:**
   - Save the OAuth app configuration
   - The changes should take effect immediately

## Alternative: Manual Token Generation

If you can't access the OAuth app settings, you can also:

1. **Generate a Personal Access Token:**
   - Go to Frame.io Account Settings
   - Create a personal access token with project permissions
   - Use this token directly as FRAMEIO_API_TOKEN

2. **Test with New Token:**
   - Replace FRAMEIO_API_TOKEN in Replit Secrets
   - Restart the application
   - Test project creation

## After Fix
Once redirect URIs are added, the OAuth flow will work:
1. Authorization URL will work properly
2. You'll get redirected back with an access token
3. Real project creation will be enabled