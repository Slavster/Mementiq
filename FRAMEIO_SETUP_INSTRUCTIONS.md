# Frame.io OAuth App Configuration

## The Problem
Your Frame.io OAuth app has pre-registered redirect URIs that don't match what we're trying to use. This is causing the "invalid_request" error.

## Solution: Update Your Frame.io OAuth App

### Step 1: Access Frame.io Developer Settings
1. Go to https://developer.frame.io/app
2. Log in to your Frame.io account
3. Find your OAuth application (the one with Client ID: 4fee919c-aad0-4aea-b835-842e2067dcdb)

### Step 2: Update Redirect URIs
Add these exact redirect URIs to your Frame.io OAuth app:

**Required redirect URIs:**
```
https://bb0a5c69-363f-451b-9bc8-306c97c51a42-00-zggicmdh4byf.picard.replit.dev/api/frameio/oauth/callback
http://localhost:5000/api/frameio/oauth/callback
```

**Optional (for future flexibility):**
```
https://localhost:5000/api/frameio/oauth/callback
```

### Step 3: Save Changes
1. Click "Save" or "Update" in your Frame.io app settings
2. Wait a few minutes for the changes to propagate

### Step 4: Test Again
1. Return to your `/frameio-test` page
2. Click "Get OAuth URL" 
3. Click "Authorize Frame.io"
4. The authorization should now work properly

## What We Fixed
- Added your specific Replit domain to the redirect URI options
- Updated the OAuth URL generation to use HTTPS for Replit domains
- Provided fallback options for local development

## Current OAuth URL
After the fix, your OAuth URL will use:
`https://bb0a5c69-363f-451b-9bc8-306c97c51a42-00-zggicmdh4byf.picard.replit.dev/api/frameio/oauth/callback`

This should match what you register in Frame.io.