/**
 * Service for managing Frame.io share configuration and comments control
 */

import { frameioV4Service } from './frameioV4Service.js';

export class ShareConfigService {
  
  /**
   * Enable comments on an existing Frame.io share
   * @param shareId Frame.io share ID
   * @param accountId Frame.io account ID
   */
  async enableCommentsOnShare(shareId: string, accountId: string): Promise<boolean> {
    try {
      console.log(`📝 ENABLING comments on share ${shareId}...`);
      
      await frameioV4Service.loadServiceAccountToken();
      
      // Update share to enable comments
      await frameioV4Service.makeRequest(
        'PATCH',
        `/accounts/${accountId}/shares/${shareId}`,
        {
          data: {
            allow_comments: true,
            description: 'Public share with downloads and comments enabled, expires in 30 days'
          }
        }
      );
      
      console.log(`✅ Comments ENABLED on share ${shareId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to enable comments on share ${shareId}:`, error);
      return false;
    }
  }
  
  /**
   * Disable comments on an existing Frame.io share
   * @param shareId Frame.io share ID
   * @param accountId Frame.io account ID
   */
  async disableCommentsOnShare(shareId: string, accountId: string): Promise<boolean> {
    try {
      console.log(`🚫 DISABLING comments on share ${shareId}...`);
      
      await frameioV4Service.loadServiceAccountToken();
      
      // Update share to disable comments
      await frameioV4Service.makeRequest(
        'PATCH',
        `/accounts/${accountId}/shares/${shareId}`,
        {
          data: {
            allow_comments: false,
            description: 'Public share with downloads enabled, comments disabled, expires in 30 days'
          }
        }
      );
      
      console.log(`✅ Comments DISABLED on share ${shareId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to disable comments on share ${shareId}:`, error);
      return false;
    }
  }
  
  /**
   * Get current comment settings for a share
   * @param shareId Frame.io share ID or f.io URL
   * @param accountId Frame.io account ID
   */
  async getShareCommentSettings(shareId: string, accountId: string): Promise<{ commentsEnabled: boolean; actualShareId?: string; actualShareUrl?: string } | null> {
    try {
      console.log(`🔍 Getting comment settings for share ${shareId}...`);
      
      await frameioV4Service.loadServiceAccountToken();
      
      // If it's an f.io URL short ID, we need to find the actual share ID by searching all shares
      if (shareId.length < 20 || !shareId.includes('-')) {
        console.log(`🔍 Short ID detected (${shareId}), searching for full share UUID...`);
        
        // Get all shares and find the one with matching f.io URL
        const sharesResponse = await frameioV4Service.makeRequest(
          'GET',
          `/accounts/${accountId}/shares`
        );
        
        const shares = sharesResponse.data || [];
        console.log(`🔍 Searching through ${shares.length} shares for f.io URL containing ${shareId}...`);
        
        for (const share of shares) {
          const shareUrl = share.short_url || share.public_url || share.url || '';
          if (shareUrl.includes(shareId)) {
            console.log(`✅ Found matching share: ${share.id} with URL: ${shareUrl}`);
            const commentsEnabled = share.allow_comments || false;
            console.log(`📊 Share ${share.id} comments: ${commentsEnabled ? 'ENABLED' : 'DISABLED'}`);
            
            return { 
              commentsEnabled,
              actualShareId: share.id,
              actualShareUrl: shareUrl
            };
          }
        }
        
        console.log(`❌ No share found with f.io URL containing ${shareId}`);
        return null;
      }
      
      // Direct UUID lookup
      const shareResponse = await frameioV4Service.makeRequest(
        'GET',
        `/accounts/${accountId}/shares/${shareId}`
      );
      
      const commentsEnabled = shareResponse?.data?.allow_comments || false;
      console.log(`📊 Share ${shareId} comments: ${commentsEnabled ? 'ENABLED' : 'DISABLED'}`);
      
      return { 
        commentsEnabled,
        actualShareId: shareId 
      };
      
    } catch (error) {
      console.error(`❌ Failed to get comment settings for share ${shareId}:`, error);
      return null;
    }
  }
}

export const shareConfigService = new ShareConfigService();