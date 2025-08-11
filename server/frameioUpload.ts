/**
 * Frame.io Upload Service - Media platform upload functionality
 * Handles video upload sessions, TUS-like upload protocol, and upload completion
 */

import { frameioV4Service } from './frameioV4Service.js';

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
 * Create upload session for Frame.io V4 (TUS-like session creation)
 */
export async function createFrameioUploadSession(
  fileName: string,
  fileSize: number,
  mimeType: string,
  parentFolderId: string
): Promise<FrameioUploadSession> {
  try {
    console.log(`Creating Frame.io V4 upload session for: ${fileName} (${fileSize} bytes)`);

    // Create asset placeholder in Frame.io V4
    await frameioV4Service.loadServiceAccountToken();
    const asset = await frameioV4Service.createUploadSession(parentFolderId, fileName, fileSize, mimeType);

    // Generate upload URL for the asset using V4 session data
    const uploadSession: FrameioUploadSession = {
      uploadUrl: asset.uploadUrl,
      completeUri: asset.completeUri,
      assetId: asset.assetId,
      parentFolderId,
      fileName,
      fileSize,
      mimeType
    };

    console.log('Frame.io V4 upload session created:', {
      assetId: asset.assetId,
      fileName,
      fileSize
    });

    return uploadSession;
  } catch (error) {
    console.error('Error creating Frame.io V4 upload session:', error);
    throw new Error(`Failed to create upload session: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Complete Frame.io V4 upload
 */
export async function completeFrameioUpload(
  assetId: string,
  fileName: string,
  fileSize: number
): Promise<FrameioUploadResponse> {
  try {
    console.log(`Completing Frame.io V4 upload for asset: ${assetId}`);

    // Get the uploaded asset details from V4
    await frameioV4Service.loadServiceAccountToken();
    const asset = await frameioV4Service.getAsset(assetId);
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

    console.log('Frame.io V4 upload completed:', {
      assetId: response.id,
      name: response.name,
      ready: !!response.upload_completed_at
    });

    return response;
  } catch (error) {
    console.error('Error completing Frame.io V4 upload:', error);
    throw new Error(`Failed to complete upload: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get folder videos using Frame.io V4
 */
export async function getFolderVideos(folderId: string): Promise<FrameioUploadResponse[]> {
  try {
    await frameioV4Service.loadServiceAccountToken();
    const assets = await frameioV4Service.getFolderAssets(folderId);
    
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
    console.error('Error getting folder videos from Frame.io V4:', error);
    return [];
  }
}

/**
 * Create Frame.io V4 review link
 */
export async function createFrameioReviewLink(projectFolderId: string): Promise<string | null> {
  try {
    console.log(`Creating Frame.io V4 review link for project folder: ${projectFolderId}`);

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

    console.log(`Creating V4 review link for video: ${latestVideo.id}`, {
      name: latestVideo.name,
      created: latestVideo.created_time,
      modified: latestVideo.modified_time
    });

    // Create review link using Frame.io V4 API
    await frameioV4Service.loadServiceAccountToken();
    const reviewLinkData = await frameioV4Service.createAssetReviewLink(
      latestVideo.id,
      `Project Video Review - ${latestVideo.name}`
    );

    if (reviewLinkData && reviewLinkData.url) {
      console.log(`✅ Frame.io V4 review link created: ${reviewLinkData.url}`);
      return reviewLinkData.url;
    } else {
      console.log(`⚠️ Could not create V4 review link for video ${latestVideo.id}`);
      return null;
    }
  } catch (error) {
    console.error('Error creating Frame.io V4 review link:', error);
    return null;
  }
}

/**
 * Verify Frame.io V4 video upload status
 */
export async function verifyFrameioUpload(assetId: string): Promise<{
  isUploaded: boolean;
  isProcessing: boolean;
  isReady: boolean;
  status: string;
  progress?: number;
}> {
  try {
    await frameioV4Service.loadServiceAccountToken();
    const asset = await frameioV4Service.getAsset(assetId);
    
    console.log(`Frame.io V4 asset ${assetId} verification:`, asset);
    
    const isReady = !!asset.upload_completed_at;
    const isUploaded = !!asset.id;
    const isProcessing = isUploaded && !isReady;
    
    return {
      isUploaded,
      isProcessing,
      isReady,
      status: isReady ? 'ready' : isProcessing ? 'processing' : 'pending',
      progress: isReady ? 100 : isProcessing ? 50 : 0
    };
  } catch (error) {
    console.error('Error verifying Frame.io V4 upload:', error);
    return {
      isUploaded: false,
      isProcessing: false,
      isReady: false,
      status: 'error'
    };
  }
}

/**
 * Delete Frame.io V4 asset (new functionality)
 */
export async function deleteFrameioAsset(assetId: string): Promise<boolean> {
  try {
    await frameioV4Service.loadServiceAccountToken();
    return await frameioV4Service.deleteAsset(assetId);
  } catch (error) {
    console.error('Error deleting Frame.io V4 asset:', error);
    return false;
  }
}