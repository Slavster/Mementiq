/**
 * Asset Detection Service
 * Automatically detects new video assets uploaded to projects in "edit in progress" status
 * and transitions them to "video is ready" status when videos are delivered.
 */

import { storage } from './storage.js';
import { frameioV4Service } from './frameioV4Service.js';
import { emailService } from './emailService.js';
import { trelloAutomation } from './services/trello-automation.js';

class AssetDetectionService {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

  /**
   * Start the automatic asset detection service
   */
  start() {
    if (this.isRunning) {
      console.log('🔍 Asset detection service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting automatic asset detection service');
    
    // Run immediate check on startup
    this.checkForNewAssets().catch(error => {
      console.error('❌ Initial asset check failed:', error);
    });

    // Schedule periodic checks
    this.interval = setInterval(() => {
      this.checkForNewAssets().catch(error => {
        console.error('❌ Scheduled asset check failed:', error);
      });
    }, this.CHECK_INTERVAL_MS);

    console.log(`✅ Asset detection service started (checking every ${this.CHECK_INTERVAL_MS / 60000} minutes)`);
  }

  /**
   * Stop the automatic asset detection service
   */
  stop() {
    if (!this.isRunning) {
      console.log('🛑 Asset detection service is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    console.log('🛑 Asset detection service stopped');
  }

  /**
   * Manual trigger for asset detection (for debugging)
   */
  async triggerManualCheck(): Promise<{ checked: number; updated: number; projects: any[] }> {
    console.log('🔧 Manual asset detection triggered');
    return await this.checkForNewAssets();
  }

  /**
   * Check all projects in "edit in progress" and "revision in progress" status for new video assets
   */
  private async checkForNewAssets(): Promise<{ checked: number; updated: number; projects: any[] }> {
    try {
      console.log('🔍 Checking for new video assets in projects...');
      
      // Get all projects in "edit in progress" and "revision in progress" status
      const projectsInProgress = await storage.getProjectsByStatus(['edit in progress', 'revision in progress']);
      console.log(`📊 Found ${projectsInProgress.length} projects in "edit in progress" or "revision in progress" status`);

      const results = {
        checked: projectsInProgress.length,
        updated: 0,
        projects: [] as any[]
      };

      if (projectsInProgress.length === 0) {
        return results;
      }

      // Initialize Frame.io service
      await frameioV4Service.initialize();

      for (const project of projectsInProgress) {
        try {
          const projectResult = await this.checkProjectForAssets(project);
          results.projects.push(projectResult);
          
          if (projectResult.statusUpdated) {
            results.updated++;
          }
        } catch (error) {
          console.error(`❌ Failed to check project ${project.id}:`, error instanceof Error ? error.message : String(error));
          results.projects.push({
            id: project.id,
            title: project.title,
            error: error instanceof Error ? error.message : String(error),
            statusUpdated: false
          });
        }
      }

      if (results.updated > 0) {
        console.log(`🎉 Asset detection completed: ${results.updated} projects updated to "video is ready"`);
      } else {
        console.log(`✅ Asset detection completed: no new videos found`);
      }

      return results;
    } catch (error) {
      console.error('❌ Asset detection service failed:', error);
      throw error;
    }
  }

  /**
   * Check a specific project for new video assets
   */
  private async checkProjectForAssets(project: any): Promise<any> {
    const result = {
      id: project.id,
      title: project.title,
      folderId: project.mediaFolderId,
      videoCount: 0,
      statusUpdated: false,
      assets: [] as any[],
      isRevision: project.status === 'revision in progress'
    };

    if (!project.mediaFolderId) {
      console.log(`⚠️ Project ${project.id} (${project.title}) has no media folder - skipping`);
      return result;
    }

    console.log(`🔍 Checking project ${project.id} (${project.title}) - status: ${project.status} - folder: ${project.mediaFolderId}`);

    // Get assets in the project folder
    const folderAssets = await frameioV4Service.getFolderAssets(project.mediaFolderId);
    const allVideoAssets = folderAssets.filter(asset => 
      asset.type === 'file' && 
      asset.media_type && 
      asset.media_type.startsWith('video/')
    );

    console.log(`🎬 Project ${project.id}: Found ${allVideoAssets.length} total video assets`);

    // Different filtering logic based on project status
    let videoAssets = allVideoAssets;
    let timestampToCheck: Date | null = null;
    
    if (project.status === 'revision in progress') {
      // For revisions, check for videos uploaded after the revision was requested
      // Get the most recent revision payment or status log entry
      const statusLogs = await storage.getProjectStatusHistory(project.id);
      const revisionLog = statusLogs
        .filter(log => log.newStatus === 'revision in progress')
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())[0];
      
      if (revisionLog && revisionLog.changedAt) {
        timestampToCheck = new Date(revisionLog.changedAt);
        console.log(`🔄 Revision mode: checking for videos after ${revisionLog.changedAt}`);
      } else {
        console.log(`⚠️ No revision timestamp found for project ${project.id}, will NOT update status`);
        // For revision projects without timestamp, we should not detect anything
        // This prevents false positives from existing videos
        return result;
      }
    } else if (project.status === 'edit in progress' && project.submittedToEditorAt) {
      // For initial edits, check for videos uploaded after submission
      timestampToCheck = new Date(project.submittedToEditorAt);
      console.log(`📝 Initial edit mode: checking for videos after ${project.submittedToEditorAt}`);
    }

    // Filter videos based on the appropriate timestamp
    // Check both created_at (new files) and updated_at (new versions)
    if (timestampToCheck) {
      videoAssets = allVideoAssets.filter(asset => {
        const createdTime = new Date(asset.created_at);
        const updatedTime = new Date(asset.updated_at || asset.created_at);
        const latestTime = updatedTime > createdTime ? updatedTime : createdTime;
        
        const isAfterTimestamp = latestTime > timestampToCheck;
        
        if (updatedTime > createdTime) {
          console.log(`📅 Asset "${asset.name}": created ${asset.created_at}, updated ${asset.updated_at}, checking against ${timestampToCheck.toISOString()}: ${isAfterTimestamp} (version update detected)`);
        } else {
          console.log(`📅 Asset "${asset.name}": created ${asset.created_at}, checking against ${timestampToCheck.toISOString()}: ${isAfterTimestamp}`);
        }
        
        return isAfterTimestamp;
      });
      console.log(`⏰ Project ${project.id}: ${videoAssets.length} videos (new or versioned) after the relevant timestamp`);
      
      // If no videos found after timestamp, do not update status
      if (videoAssets.length === 0) {
        console.log(`📍 Project ${project.id}: No new/updated videos found, status remains unchanged`);
        return result;
      }
    } else {
      console.log(`⚠️ Project ${project.id}: No timestamp found, considering all videos`);
    }

    // Sort by latest activity (created or updated) and take the newest video only
    if (videoAssets.length > 1) {
      videoAssets.sort((a, b) => {
        const aLatest = Math.max(
          new Date(a.created_at).getTime(),
          new Date(a.updated_at || a.created_at).getTime()
        );
        const bLatest = Math.max(
          new Date(b.created_at).getTime(),
          new Date(b.updated_at || b.created_at).getTime()
        );
        return bLatest - aLatest;
      });
      
      const mostRecent = videoAssets[0];
      const mostRecentTime = new Date(mostRecent.updated_at || mostRecent.created_at);
      console.log(`📊 Multiple videos found, using most recent: "${mostRecent.name}" (last activity: ${mostRecentTime.toISOString()})`);
      videoAssets = [videoAssets[0]]; // Keep only the most recent
    }

    result.videoCount = videoAssets.length;
    result.assets = videoAssets.map(asset => ({
      id: asset.id,
      name: asset.name,
      created_at: asset.created_at,
      media_type: asset.media_type
    }));

    console.log(`🎯 Project ${project.id}: Using ${videoAssets.length} video for detection`);

    // If we have valid video assets (uploaded after submission), update project status
    if (videoAssets.length > 0) {
      const selectedVideo = videoAssets[0];
      const videoType = result.isRevision ? "revision" : "initial";
      console.log(`🚀 Updating project ${project.id} status to "video is ready" based on ${videoType} video: "${selectedVideo.name}"`);
      
      // Log the status change
      await storage.logProjectStatusChange(project.id, project.status, 'video is ready');
      
      await storage.updateProject(project.id, {
        status: 'video is ready',
        updatedAt: new Date(),
      });

      // Move Trello card to waiting on approval
      try {
        if (result.isRevision) {
          await trelloAutomation.moveToWaitingOnApproval(project.id, true, project.revisionCount);
        } else {
          await trelloAutomation.moveToWaitingOnApproval(project.id, false);
        }
      } catch (error) {
        console.error('Failed to move Trello card to waiting on approval:', error);
      }

      // Update timestamp
      const actionMessage = result.isRevision 
        ? `revision video delivered: "${selectedVideo.name}" (auto-detected)`
        : `video delivered: "${selectedVideo.name}" (auto-detected)`;
      await this.updateProjectTimestamp(project.id, actionMessage);
      
      result.statusUpdated = true;

      // Send email notification to user with the most recent video
      try {
        await this.sendVideoDeliveryNotification(project, selectedVideo);
        console.log(`📧 Video delivery notification sent for project ${project.id} with video: "${selectedVideo.name}"`);
      } catch (emailError) {
        console.error(`❌ Failed to send email for project ${project.id}:`, emailError instanceof Error ? emailError.message : String(emailError));
      }
    }

    return result;
  }

  /**
   * Send video delivery notification email
   */
  private async sendVideoDeliveryNotification(project: any, videoAsset: any) {
    const user = await storage.getUserById(project.userId);
    if (!user) {
      console.log(`⚠️ User not found for project ${project.id}`);
      return;
    }

    // For revisions, use the existing share link
    // For initial deliveries, use the Frame.io view URL
    let videoViewUrl = project.frameioReviewLink || '';
    
    if (!videoViewUrl) {
      // Fallback to direct Frame.io view URL if no share link exists
      videoViewUrl = videoAsset.view_url || `https://next.frame.io/project/${videoAsset.project_id}/view/${videoAsset.id}`;
    }

    const isRevision = project.status === 'revision in progress';
    console.log(`📧 Sending ${isRevision ? 'revision' : 'initial'} delivery email with URL: ${videoViewUrl}`);

    // Generate and send email
    const emailTemplate = emailService.generateVideoDeliveryEmail(
      user.email,
      project.title,
      videoViewUrl,
      project.id
    );

    await emailService.sendEmail(emailTemplate);
  }

  /**
   * Helper function to update project timestamp
   */
  private async updateProjectTimestamp(projectId: number, action?: string) {
    const now = new Date();
    await storage.updateProject(projectId, { updatedAt: now });
    if (action) {
      console.log(`📅 Updated project ${projectId} timestamp for action: ${action} at ${now.toISOString()}`);
    }
    return now;
  }
}

// Export singleton instance
export const assetDetectionService = new AssetDetectionService();