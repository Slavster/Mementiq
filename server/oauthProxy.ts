/**
 * OAuth Proxy for Frame.io V4 - Handles Adobe's static URI requirement
 * 
 * Since Adobe Developer Console requires static redirect URIs and Replit uses dynamic URLs,
 * this creates a stable OAuth flow using a fixed external proxy service.
 */

import { Request, Response } from 'express';

export class OAuthProxy {
  private static readonly PROXY_BASE = 'https://oauth-proxy.frameio-integration.workers.dev';
  
  /**
   * Generate OAuth URL using stable proxy service
   */
  static generateOAuthUrl(clientId: string, currentHost: string): string {
    const state = Math.random().toString(36).substring(7);
    const proxyRedirectUri = `${this.PROXY_BASE}/callback`;
    const actualCallbackUri = encodeURIComponent(`https://${currentHost}/api/auth/frameio/callback`);
    
    // Adobe IMS OAuth URL with proxy redirect
    const authUrl = new URL('https://ims-na1.adobelogin.com/ims/authorize/v2');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', proxyRedirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid,creative_sdk');
    authUrl.searchParams.set('state', `${state}:${actualCallbackUri}`);
    
    return authUrl.toString();
  }
  
  /**
   * Alternative: Use Replit's own stable domain approach
   */
  static generateDirectOAuthUrl(clientId: string): string {
    const state = Math.random().toString(36).substring(7);
    
    // Use a predictable, configurable redirect URI
    const redirectUri = process.env.OAUTH_REDIRECT_URI || 'https://frameio-oauth.example.com/callback';
    
    const authUrl = new URL('https://ims-na1.adobelogin.com/ims/authorize/v2');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid,creative_sdk');
    authUrl.searchParams.set('state', state);
    
    return authUrl.toString();
  }
}