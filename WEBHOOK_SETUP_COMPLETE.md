# Frame.io Webhook Setup - COMPLETE ✓

## Status: READY FOR PRODUCTION

The Frame.io webhook infrastructure is now fully implemented and tested.

## What's Been Set Up

### 1. Webhook Endpoint
- **URL**: `https://workspace.slavsinitsyn.repl.co/api/webhooks/frameio`
- **Method**: POST
- **Content-Type**: application/json
- **Security**: HMAC-SHA256 signature verification

### 2. Database
- **Table Created**: `frameio_share_assets`
- **Purpose**: Maps Frame.io share IDs to asset IDs for tracking revisions
- **Automatic Cleanup**: Cascades on project deletion

### 3. Webhook Secret
- **Status**: Generated and saved to .env
- **Key**: `FRAMEIO_WEBHOOK_SECRET`
- **Value**: Secure 64-character hex string

### 4. Event Handling
The webhook listens for `file.versioned` events and:
1. Verifies the webhook signature for security
2. Checks if the file belongs to a project in "revision in progress" status
3. Updates project status to "video is ready"
4. Sends email notification to the user
5. Logs the status change in the database

## How The Revision Flow Works

1. **User requests revision** → Pays $5 → Submits instructions
2. **Editor uploads new version** → Frame.io sends `file.versioned` webhook
3. **System detects revision** → Updates status to "video is ready"
4. **User gets notification** → Reviews video with same share link
5. **User decides** → Accept (project complete) OR request another revision

## Manual Configuration Required in Frame.io

Since Frame.io requires manual webhook configuration in their UI:

1. Go to [Frame.io Developer Console](https://developer.frame.io)
2. Select your app
3. Navigate to **Webhooks** section
4. Click **Create Webhook**
5. Enter these details:
   - **Endpoint URL**: `https://workspace.slavsinitsyn.repl.co/api/webhooks/frameio`
   - **Events**: Select `file.versioned`
   - **Secret**: Copy from .env file (FRAMEIO_WEBHOOK_SECRET value)
6. Save the webhook

## Testing

The webhook has been tested and verified to:
- ✓ Accept properly signed requests
- ✓ Reject unsigned or incorrectly signed requests
- ✓ Process file.versioned events correctly
- ✓ Update project status appropriately
- ✓ Handle errors gracefully

## Key Features

- **Automatic Detection**: No manual checking needed for revised videos
- **Same Share Link**: Users always access videos through the same link
- **Infinite Revisions**: Users can request as many revisions as needed
- **Email Notifications**: Users are notified immediately when revisions arrive
- **Secure**: All webhooks are verified with HMAC-SHA256 signatures

## Support

If you need to:
- **View webhook logs**: Check server console for detailed webhook processing
- **Test webhook**: Run `npx tsx test_webhook_call.ts`
- **Check configuration**: Run `node test_webhook_config.js`
- **Regenerate secret**: Delete FRAMEIO_WEBHOOK_SECRET from .env and run `npx tsx setup_webhook.ts`

The system is now ready to automatically handle revision workflows!