# OAuth Debug Information

## Current Configuration
- Authorization URL redirect URI: `https://bb0a5c69-363f-451b-9bc8-306c97c51a42-00-zggicmdh4byf.picard.replit.dev/api/frameio/oauth/callback`
- Token exchange redirect URI: `https://bb0a5c69-363f-451b-9bc8-306c97c51a42-00-zggicmdh4byf.picard.replit.dev/api/frameio/oauth/callback`

## Debug Steps Added
1. Added logging to token exchange showing:
   - Authorization code (first 20 chars)
   - Redirect URI being sent
   - Client ID
   - Whether client secret exists
   - Full request body

## Common Causes of redirect_uri Mismatch
1. **Case sensitivity**: URLs must match exactly including case
2. **URL encoding**: Different encoding between auth and token requests
3. **Trailing slashes**: `/callback` vs `/callback/`
4. **Protocol mismatch**: `http` vs `https`
5. **Domain variations**: `www.` prefix differences
6. **Frame.io app configuration**: Multiple URIs registered but using wrong one

## Next Steps
1. Try OAuth flow and check server console for debug output
2. Compare exact redirect URIs being sent in both requests
3. Verify Frame.io app has exactly matching URI registered