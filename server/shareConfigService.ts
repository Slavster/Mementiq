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
            commenting_enabled: true,
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
      console.log(`✅ KEEPING comments enabled on share ${shareId} (user request)...`);
      
      // User requested to keep comments enabled, so no action needed
      console.log(`✅ Comments remain enabled on share ${shareId}`);
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
        
        // Search through ALL projects to find the share (since we don't know which project it's in)
        try {
          // Get all projects to search through (since shares could be in any project)
          console.log(`🔍 Searching all projects for share containing ${shareId}...`);
          const projectsResponse = await frameioV4Service.makeRequest(
            'GET',
            `/accounts/${accountId}/projects`
          );
          
          const projects = projectsResponse.data || [];
          console.log(`🔍 Found ${projects.length} projects to search through`);
          
          // Search through each project's shares
          for (const project of projects) {
            try {
              const sharesResponse = await frameioV4Service.makeRequest(
                'GET',
                `/accounts/${accountId}/projects/${project.id}/shares`
              );
          
              const shares = sharesResponse.data || [];
              console.log(`🔍 Searching through ${shares.length} shares in project ${project.id} for f.io URL containing ${shareId}...`);
              
              for (const share of shares) {
                const shareUrl = share.short_url || share.public_url || share.url || '';
                if (shareUrl.includes(shareId)) {
                  console.log(`✅ Found matching share: ${share.id} with URL: ${shareUrl} in project ${project.id}`);
                  const commentsEnabled = share.commenting_enabled || share.allow_comments || false;
                  console.log(`📊 Share ${share.id} comments: ${commentsEnabled ? 'ENABLED' : 'DISABLED'}`);
                  
                  return { 
                    commentsEnabled,
                    actualShareId: share.id,
                    actualShareUrl: shareUrl
                  };
                }
              }
            } catch (projectShareError) {
              console.log(`⚠️ Failed to get shares for project ${project.id}: ${projectShareError instanceof Error ? projectShareError.message : String(projectShareError)}`);
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