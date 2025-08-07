/**
 * Frame.io Upload Service - Media platform upload functionality
 * Handles video upload sessions, TUS-like upload protocol, and upload completion
 */

import { frameioService } from './frameioService.js';

export interface FrameioUploadSession {
  uploadUrl: string;
  completeUri: string;
  assetId: string;
  parentFolderId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface FrameioUploadResponse {
  id: string;
  name: string;
  type: string;
  filetype?: string;
  filesize?: number;
  parent_id: string;
  upload_completed_at?: string;
  download_url?: string;
  stream_url?: string;
  thumb_url?: string;
  review_link?: string;
  created_time?: string;
  modified_time?: string;
}

/**
 * Create upload session for Frame.io (TUS-like session creation)
 */
export async function createFrameioUploadSession(
  fileName: string,
  fileSize: number,
  mimeType: string,
  parentFolderId: string
): Promise<FrameioUploadSession> {
  try {
    console.log(`Creating Frame.io upload session for: ${fileName} (${fileSize} bytes)`);

    // Create asset placeholder in Frame.io
    const asset = await frameioService.uploadFile('', fileName, fileSize, mimeType, parentFolderId);

    // Generate upload URL for the asset
    // Note: Frame.io uses its own upload mechanism
    // We'll create a session structure compatible with our existing frontend
    const uploadSession: FrameioUploadSession = {
      uploadUrl: `https://api.frame.io/v2/assets/${asset.id}/upload`,
      completeUri: `/assets/${asset.id}/complete`,
      assetId: asset.id,
      parentFolderId,
      fileName,
      fileSize,
      mimeType
    };

    console.log('Frame.io upload session created:', {
      assetId: asset.id,
      fileName,
      fileSize
    });

    return uploadSession;
  } catch (error) {
    console.error('Error creating Frame.io upload session:', error);
    throw new Error(`Failed to create upload session: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Complete Frame.io upload
 */
export async function completeFrameioUpload(
  assetId: string,
  fileName: string,
  fileSize: number
): Promise<FrameioUploadResponse> {
  try {
    console.log(`Completing Frame.io upload for asset: ${assetId}`);

    // Get the uploaded asset details
    const asset = await frameioService.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    // Return response in format compatible with existing code
    const response: FrameioUploadResponse = {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      filetype: asset.filetype,
      filesize: asset.filesize,
      parent_id: asset.parent_id,
      upload_completed_at: asset.upload_completed_at,
      download_url: asset.download_url,
      stream_url: asset.stream_url,
      thumb_url: asset.thumb_url,
      review_link: asset.review_link,
      created_time: asset.created_at,
      modified_time: asset.updated_at
    };

    console.log('Frame.io upload completed:', {
      assetId: response.id,
      name: response.name,
      ready: !!response.upload_completed_at
    });

    return response;
  } catch (error) {
    console.error('Error completing Frame.io upload:', error);
    throw new Error(`Failed to complete upload: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get folder videos
 */
export async function getFolderVideos(folderId: string): Promise<FrameioUploadResponse[]> {
  try {
    const assets = await frameioService.getFolderAssets(folderId);
    
    // Filter for video files only
    const videoAssets = assets.filter(asset => 
      asset.type === 'file' && 
      asset.filetype && 
      asset.filetype.startsWith('video/')
    );

    // Convert to response format
    return videoAssets.map(asset => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      filetype: asset.filetype,
      filesize: asset.filesize,
      parent_id: asset.parent_id,
      upload_completed_at: asset.upload_completed_at,
      download_url: asset.download_url,
      stream_url: asset.stream_url,
      thumb_url: asset.thumb_url,
      review_link: asset.review_link,
      created_time: asset.created_at,
      modified_time: asset.updated_at
    }));
  } catch (error) {
    console.error('Error getting folder videos:', error);
    return [];
  }
}

/**
 * Create Frame.io review link
 */
export async function createFrameioReviewLink(projectFolderId: string): Promise<string | null> {
  try {
    console.log(`Creating Frame.io review link for project folder: ${projectFolderId}`);

    // Get the latest video from the project folder
    const videos = await getFolderVideos(projectFolderId);
    if (!videos || videos.length === 0) {
      console.log(`No videos found in project folder ${projectFolderId}`);
      return null;
    }

    // Get the most recent video
    const latestVideo = videos.sort((a, b) => {
      const aTime = new Date(a.created_time || a.modified_time || 0).getTime();
      const bTime = new Date(b.created_time || b.modified_time || 0).getTime();
      return bTime - aTime;
    })[0];

    console.log(`Creating review link for video: ${latestVideo.id}`, {
      name: latestVideo.name,
      created: latestVideo.created_time,
      modified: latestVideo.modified_time
    });

    // Create review link using Frame.io API
    const reviewLink = await frameioService.createReviewLink(latestVideo.id, {
      allow_comments: true,
      allow_download: false
    });

    if (reviewLink) {
      console.log(`✅ Frame.io review link created: ${reviewLink}`);
      return reviewLink;
    } else {
      console.log(`⚠️ Could not create review link for video ${latestVideo.id}`);
      return null;
    }
  } catch (error) {
    console.error('Error creating Frame.io review link:', error);
    return null;
  }
}

/**
 * Verify Frame.io video upload status
 */
export async function verifyFrameioUpload(assetId: string): Promise<{
  isUploaded: boolean;
  isProcessing: boolean;
  isReady: boolean;
  status: string;
  progress?: number;
}> {
  try {
    const result = await frameioService.verifyUploadStatus(assetId);
    
    console.log(`Frame.io asset ${assetId} verification:`, result);
    
    return {
      isUploaded: result.isUploaded,
      isProcessing: result.isProcessing,
      isReady: result.isReady,
      status: result.status,
      progress: result.isReady ? 100 : result.isProcessing ? 50 : 0
    };
  } catch (error) {
    console.error('Error verifying Frame.io upload:', error);
    return {
      isUploaded: false,
      isProcessing: false,
      isReady: false,
      status: 'error'
    };
  }
}

/**
 * Delete Frame.io asset (new functionality)
 */
export async function deleteFrameioAsset(assetId: string): Promise<boolean> {
  try {
    return await frameioService.deleteAsset(assetId);
  } catch (error) {
    console.error('Error deleting Frame.io asset:', error);
    return false;
  }
}

