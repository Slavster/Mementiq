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
   * @param shareId Frame.io share ID
   * @param accountId Frame.io account ID
   */
  async getShareCommentSettings(shareId: string, accountId: string): Promise<{ commentsEnabled: boolean } | null> {
    try {
      console.log(`🔍 Getting comment settings for share ${shareId}...`);
      
      await frameioV4Service.loadServiceAccountToken();
      
      // Get share details
      const shareResponse = await frameioV4Service.makeRequest(
        'GET',
        `/accounts/${accountId}/shares/${shareId}`
      );
      
      const commentsEnabled = shareResponse?.data?.allow_comments || false;
      console.log(`📊 Share ${shareId} comments: ${commentsEnabled ? 'ENABLED' : 'DISABLED'}`);
      
      return { commentsEnabled };
      
    } catch (error) {
      console.error(`❌ Failed to get comment settings for share ${shareId}:`, error);
      return null;
    }
  }
}

export const shareConfigService = new ShareConfigService();