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
      
      // Update share to enable comments using account-based endpoint (like in working code)
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
      
      // Update share to disable comments using account-based endpoint (like in working code)
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
      
      // If it's an f.io URL short ID, we need to find the actual share ID by searching projects for shares
      if (shareId.length < 20 || !shareId.includes('-')) {
        console.log(`🔍 Short ID detected (${shareId}), searching for full share UUID...`);
        
        // Search through project shares using the correct Frame.io V4 API pattern
        try {
          // Use the same project ID as in the working code
          const projectId = 'e0a4fadd-52b0-4156-91ed-8880bbc0c51a';
          
          const sharesResponse = await frameioV4Service.makeRequest(
            'GET',
            `/accounts/${accountId}/projects/${projectId}/shares`
          );
          
          const shares = sharesResponse.data || [];
          console.log(`🔍 Searching through ${shares.length} project shares for f.io URL containing ${shareId}...`);
          
          for (const share of shares) {
            const shareUrl = share.short_url || share.public_url || share.url || '';
            if (shareUrl.includes(shareId)) {
              console.log(`✅ Found matching share: ${share.id} with URL: ${shareUrl}`);
              const commentsEnabled = share.commenting_enabled || share.allow_comments || false;
              console.log(`📊 Share ${share.id} comments: ${commentsEnabled ? 'ENABLED' : 'DISABLED'}`);
              
              return { 
                commentsEnabled,
                actualShareId: share.id,
                actualShareUrl: shareUrl
              };
            }
          }
        } catch (sharesError) {
          console.log(`⚠️ Failed to get project shares: ${sharesError instanceof Error ? sharesError.message : String(sharesError)}`);
        }
        
        console.log(`❌ No share found with f.io URL containing ${shareId} across all projects`);
        return null;
      }
      
      // Direct UUID lookup using account-based shares endpoint (like in working code)
      console.log(`🔍 Full UUID detected (${shareId}), getting share details...`);
      
      try {
        const shareResponse = await frameioV4Service.makeRequest(
          'GET',
          `/accounts/${accountId}/shares/${shareId}`
        );
        
        const commentsEnabled = shareResponse?.data?.commenting_enabled || shareResponse?.data?.allow_comments || false;
        console.log(`📊 Share ${shareId} comments: ${commentsEnabled ? 'ENABLED' : 'DISABLED'}`);
        
        return { 
          commentsEnabled,
          actualShareId: shareId 
        };
      } catch (shareError) {
        console.log(`❌ Share ${shareId} not found: ${shareError instanceof Error ? shareError.message : String(shareError)}`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ Failed to get comment settings for share ${shareId}:`, error);
      return null;
    }
  }
}

export const shareConfigService = new ShareConfigService();