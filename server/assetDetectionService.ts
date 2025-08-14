/**
 * Asset Detection Service
 * Automatically detects new video assets uploaded to projects in "edit in progress" status
 * and transitions them to "video is ready" status when videos are delivered.
 */

import { storage } from './storage.js';
import { frameioV4Service } from './frameioV4Service.js';
import { emailService } from './emailService.js';

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
   * Check all projects in "edit in progress" status for new video assets
   */
  private async checkForNewAssets(): Promise<{ checked: number; updated: number; projects: any[] }> {
    try {
      console.log('🔍 Checking for new video assets in projects...');
      
      // Get all projects in "edit in progress" status
      const projectsInProgress = await storage.getProjectsByStatus(['edit in progress']);
      console.log(`📊 Found ${projectsInProgress.length} projects in "edit in progress" status`);

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
      assets: [] as any[]
    };

    if (!project.mediaFolderId) {
      console.log(`⚠️ Project ${project.id} (${project.title}) has no media folder - skipping`);
      return result;
    }

    console.log(`🔍 Checking project ${project.id} (${project.title}) - folder: ${project.mediaFolderId}`);

    // Get assets in the project folder
    const folderAssets = await frameioV4Service.getFolderAssets(project.mediaFolderId);
    const allVideoAssets = folderAssets.filter(asset => 
      asset.type === 'file' && 
      asset.media_type && 
      asset.media_type.startsWith('video/')
    );

    console.log(`🎬 Project ${project.id}: Found ${allVideoAssets.length} total video assets`);

    // Filter videos uploaded AFTER project was submitted to editor
    let videoAssets = allVideoAssets;
    if (project.submittedToEditorAt) {
      const submissionTime = new Date(project.submittedToEditorAt);
      videoAssets = allVideoAssets.filter(asset => {
        const assetTime = new Date(asset.created_at);
        const isAfterSubmission = assetTime > submissionTime;
        console.log(`📅 Asset "${asset.name}": created ${asset.created_at}, submitted ${project.submittedToEditorAt}, after submission: ${isAfterSubmission}`);
        return isAfterSubmission;
      });
      console.log(`⏰ Project ${project.id}: ${videoAssets.length} videos uploaded after submission to editor`);
    } else {
      console.log(`⚠️ Project ${project.id}: No submission timestamp found, considering all videos`);
    }

    // Sort by creation date (most recent first) and take the newest video only
    if (videoAssets.length > 1) {
      videoAssets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      console.log(`📊 Multiple videos found, using most recent: "${videoAssets[0].name}" (${videoAssets[0].created_at})`);
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
      console.log(`🚀 Updating project ${project.id} status to "video is ready" based on video: "${selectedVideo.name}"`);
      
      await storage.updateProject(project.id, {
        status: 'video is ready',
        updatedAt: new Date(),
      });

      // Update timestamp
      await this.updateProjectTimestamp(project.id, `video delivered: "${selectedVideo.name}" (auto-detected)`);
      
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

    // Use Frame.io view URL for the video
    const videoViewUrl = videoAsset.view_url || `https://next.frame.io/project/${videoAsset.project_id}/view/${videoAsset.id}`;

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