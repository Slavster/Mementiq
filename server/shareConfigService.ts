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
      
      // Find which project this share belongs to
      const projectsResponse = await frameioV4Service.makeRequest(
        'GET',
        `/accounts/${accountId}/projects`
      );
      
      const projects = projectsResponse.data || [];
      for (const project of projects) {
        try {
          // Update share to enable comments
          await frameioV4Service.makeRequest(
            'PATCH',
            `/accounts/${accountId}/projects/${project.id}/shares/${shareId}`,
            {
              data: {
                allow_comments: true,
                description: 'Public share with downloads and comments enabled, expires in 30 days'
              }
            }
          );
          
          console.log(`✅ Comments ENABLED on share ${shareId} in project ${project.id}`);
          return true;
        } catch (shareError) {
          // Share not in this project, continue searching
          continue;
        }
      }
      
      console.log(`❌ Share ${shareId} not found in any project for comment enabling`);
      return false;
      
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
      
      // Find which project this share belongs to
      const projectsResponse = await frameioV4Service.makeRequest(
        'GET',
        `/accounts/${accountId}/projects`
      );
      
      const projects = projectsResponse.data || [];
      for (const project of projects) {
        try {
          // Update share to disable comments
          await frameioV4Service.makeRequest(
            'PATCH',
            `/accounts/${accountId}/projects/${project.id}/shares/${shareId}`,
            {
              data: {
                allow_comments: false,
                description: 'Public share with downloads enabled, comments disabled, expires in 30 days'
              }
            }
          );
          
          console.log(`✅ Comments DISABLED on share ${shareId} in project ${project.id}`);
          return true;
        } catch (shareError) {
          // Share not in this project, continue searching
          continue;
        }
      }
      
      console.log(`❌ Share ${shareId} not found in any project for comment disabling`);
      return false;
      
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
        
        // Get all projects and search for shares within them (Frame.io V4 pattern)
        const projectsResponse = await frameioV4Service.makeRequest(
          'GET',
          `/accounts/${accountId}/projects`
        );
        
        const projects = projectsResponse.data || [];
        console.log(`🔍 Searching through ${projects.length} projects for shares containing ${shareId}...`);
        
        for (const project of projects) {
          try {
            // Get shares for this project
            const sharesResponse = await frameioV4Service.makeRequest(
              'GET',
              `/accounts/${accountId}/projects/${project.id}/shares`
            );
            
            const shares = sharesResponse.data || [];
            for (const share of shares) {
              const shareUrl = share.short_url || share.public_url || share.url || '';
              if (shareUrl.includes(shareId)) {
                console.log(`✅ Found matching share: ${share.id} with URL: ${shareUrl} in project ${project.id}`);
                const commentsEnabled = share.allow_comments || false;
                console.log(`📊 Share ${share.id} comments: ${commentsEnabled ? 'ENABLED' : 'DISABLED'}`);
                
                return { 
                  commentsEnabled,
                  actualShareId: share.id,
                  actualShareUrl: shareUrl
                };
              }
            }
          } catch (projectError) {
            console.log(`⚠️ Failed to get shares for project ${project.id}: ${projectError instanceof Error ? projectError.message : String(projectError)}`);
            continue;
          }
        }
        
        console.log(`❌ No share found with f.io URL containing ${shareId} across all projects`);
        return null;
      }
      
      // Direct UUID lookup - need to find which project this share belongs to
      console.log(`🔍 Full UUID detected (${shareId}), searching across projects...`);
      
      const projectsResponse = await frameioV4Service.makeRequest(
        'GET',
        `/accounts/${accountId}/projects`
      );
      
      const projects = projectsResponse.data || [];
      for (const project of projects) {
        try {
          const shareResponse = await frameioV4Service.makeRequest(
            'GET',
            `/accounts/${accountId}/projects/${project.id}/shares/${shareId}`
          );
          
          const commentsEnabled = shareResponse?.data?.allow_comments || false;
          console.log(`📊 Share ${shareId} comments: ${commentsEnabled ? 'ENABLED' : 'DISABLED'}`);
          
          return { 
            commentsEnabled,
            actualShareId: shareId 
          };
        } catch (shareError) {
          // Share not in this project, continue searching
          continue;
        }
      }
      
      console.log(`❌ Share ${shareId} not found in any project`);
      return null;
      
    } catch (error) {
      console.error(`❌ Failed to get comment settings for share ${shareId}:`, error);
      return null;
    }
  }
}

export const shareConfigService = new ShareConfigService();