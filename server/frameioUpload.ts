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
  parent_id: string | null;
  status?: string;  // Frame.io processing status: 'uploading', 'transcoding', 'transcoded', etc.
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

// Valid post-upload statuses (anything except 'created' which means chunks were never uploaded)
const VALID_UPLOAD_STATUSES = ['preparing', 'uploading', 'processing', 'transcoding', 'transcoded', 'complete', 'ready'];

/**
 * Verify asset exists in folder using V4 folder children endpoint with retry logic.
 * Frame.io V4 doesn't have a direct asset lookup endpoint, so we query the parent folder.
 */
async function verifyAssetInFolder(
  assetId: string,
  folderId: string,
  maxRetries: number = 5,
  delayMs: number = 2000
): Promise<any | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Verification attempt ${attempt}/${maxRetries}: Looking for asset ${assetId} in folder ${folderId}`);
      
      const folderAssets = await frameioV4Service.getFolderAssets(folderId);
      const asset = folderAssets.find((a: any) => a.id === assetId);
      
      if (asset) {
        console.log(`✅ Asset found on attempt ${attempt}: ${asset.name} (status: ${asset.status})`);
        return asset;
      }
      
      console.log(`Asset not found yet, ${maxRetries - attempt} retries remaining...`);
      
      if (attempt < maxRetries) {
        // Wait before retrying - Frame.io may need time to index the uploaded file
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Verification attempt ${attempt} failed:`, error instanceof Error ? error.message : error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  console.log(`❌ Asset ${assetId} not found after ${maxRetries} attempts`);
  return null;
}

/**
 * Complete Frame.io V4 upload with verification
 * Uses folder-based verification (V4 compatible) with retry logic.
 */
export async function completeFrameioUpload(
  assetId: string,
  fileName: string,
  fileSize: number,
  projectFolderId?: string
): Promise<FrameioUploadResponse> {
  try {
    console.log(`Completing Frame.io V4 upload for asset: ${assetId}`);

    // V4 API requires folder-based verification - projectFolderId is required
    if (!projectFolderId) {
      console.warn(`⚠️ No projectFolderId provided - skipping V4 verification and trusting frontend data`);
      // Return minimal response when we can't verify (edge case for legacy projects)
      return {
        id: assetId,
        name: fileName,
        type: 'file',
        filetype: 'video/mp4',
        filesize: fileSize,
        parent_id: null,
        status: 'unknown',
        upload_completed_at: new Date().toISOString(),
        created_time: new Date().toISOString(),
        modified_time: new Date().toISOString()
      };
    }

    await frameioV4Service.loadServiceAccountToken();
    
    // STEP 1: Verify the asset exists in Frame.io using folder-based lookup
    // V4 API doesn't have direct asset lookup, so we query the parent folder with retries
    const asset = await verifyAssetInFolder(assetId, projectFolderId, 5, 2000);
    
    // STEP 2: Validate asset was found
    if (!asset) {
      throw new Error(`Upload verification failed: Could not locate asset ${assetId} in Frame.io folder ${projectFolderId}. The asset may still be processing - please wait a moment and try again.`);
    }
    
    const status = asset.status;
    const assetParentId = asset.parent_id;
    console.log(`Asset status: ${status}`);
    console.log(`Asset parent_id: ${assetParentId}`);
    console.log(`Expected project folder: ${projectFolderId}`);
    
    // STEP 3: Validate status - reject only 'created' (chunks never uploaded)
    // Accept all valid post-upload statuses including 'preparing'
    if (status === 'created') {
      throw new Error(`Upload incomplete: asset status is 'created'. The file chunks may not have been uploaded successfully. Please try uploading the file again.`);
    }
    
    // Log if status is unexpected but don't reject - Frame.io may add new statuses
    if (!VALID_UPLOAD_STATUSES.includes(status)) {
      console.warn(`⚠️ Unexpected asset status: ${status}. Proceeding anyway since it's not 'created'.`);
    }
    
    // STEP 4: Verify folder hierarchy - asset must be in the correct project folder
    if (projectFolderId && assetParentId) {
      if (assetParentId !== projectFolderId) {
        console.error(`❌ Folder hierarchy validation failed!`);
        console.error(`Asset parent: ${assetParentId}, Expected: ${projectFolderId}`);
        throw new Error(`Upload validation failed: Asset is not in the correct project folder. Expected folder ${projectFolderId}, but asset is in ${assetParentId}.`);
      }
      console.log(`✅ Folder hierarchy verified: asset is in correct project folder`);
    } else if (projectFolderId && !assetParentId) {
      console.warn(`⚠️ Could not verify folder hierarchy: asset has no parent_id`);
    }
    
    console.log(`✅ Asset fully verified with status: ${status}`);

    // STEP 5: Build response with verified data
    const response: FrameioUploadResponse = {
      id: assetId,
      name: asset?.name || fileName,
      type: asset?.type || 'file',
      filetype: asset?.filetype || asset?.media_type || 'video/mp4',
      filesize: asset?.filesize || asset?.file_size || fileSize,
      parent_id: asset?.parent_id || null,
      status: status,  // Include Frame.io processing status for frontend
      upload_completed_at: asset?.upload_completed_at || new Date().toISOString(),
      download_url: asset?.download_url || null,
      stream_url: asset?.stream_url || null,
      thumb_url: asset?.thumb_url || null,
      review_link: asset?.review_link || null,
      created_time: asset?.created_at || new Date().toISOString(),
      modified_time: asset?.updated_at || new Date().toISOString()
    };

    console.log('Frame.io V4 upload completed:', {
      assetId: response.id,
      name: response.name,
      filesize: response.filesize,
      status: status,
      verificationMethod: 'folderAssets'
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