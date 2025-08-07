# Frame.io OAuth Authorization Required

## Current Status
The existing Frame.io token has limited developer permissions and cannot create real projects (404 error on account-level APIs).

## Quick Authorization Steps

1. **Click this authorization URL**: 
   https://applications.frame.io/oauth2/auth?response_type=code&client_id=4fee919c-aad0-4aea-b835-842e2067dcdb&redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fapi%2Fframeio%2Foauth%2Fcallback&scope=offline+account.read+asset.create+asset.read+project.create+project.read&state=frameio_oauth_1754563420716

2. **Authorize the application** in Frame.io (you'll be redirected to Frame.io)

3. **Copy the new access token** from the callback page

4. **Replace FRAMEIO_API_TOKEN** in Replit Secrets with the new token

5. **Restart the application** to use the new token

## What This Enables
- Real Frame.io project creation (not virtual)
- Full folder management capabilities  
- Asset upload and management
- Review link generation

## Scopes Requested
- `account.read` - Read account information
- `asset.create` - Create assets (files)
- `asset.read` - Read asset information  
- `project.create` - Create projects
- `project.read` - Read project information
- `offline` - Refresh token capability