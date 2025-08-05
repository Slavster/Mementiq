import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Vimeo } = require('@vimeo/vimeo');

const vimeoAccessToken = process.env.VIMEO_ACCESS_TOKEN;

if (!vimeoAccessToken) {
  throw new Error('VIMEO_ACCESS_TOKEN environment variable is required');
}

const client = new Vimeo(null, null, vimeoAccessToken);

export interface VimeoUploadSession {
  upload_link: string;
  video_uri: string;
  complete_uri: string;
  ticket_id: string;
}

/**
 * Create a direct upload session for Vimeo
 */
export const createUploadSession = async (
  fileName: string,
  fileSize: number,
  folderId?: string
): Promise<VimeoUploadSession> => {
  return new Promise((resolve, reject) => {
    const uploadData: any = {
      upload: {
        approach: 'tus',
        size: fileSize
      },
      name: fileName
    };

    // Add folder if specified
    if (folderId) {
      uploadData.folder_uri = `/me/projects/${folderId}`;
    }

    client.request({
      method: 'POST',
      path: '/me/videos',
      query: uploadData
    }, (error: any, body: any) => {
      if (error) {
        console.error('Vimeo upload session error:', error);
        reject(new Error(`Failed to create upload session: ${error.message}`));
        return;
      }

      if (!body.upload || !body.upload.upload_link) {
        console.error('Invalid Vimeo response:', body);
        reject(new Error('Invalid response from Vimeo API'));
        return;
      }

      // Note: complete_uri is deprecated in Vimeo API 3.4+
      // Upload completion is checked via video status instead
      resolve({
        upload_link: body.upload.upload_link,
        video_uri: body.uri,
        complete_uri: body.upload.complete_uri || null, // May be undefined in newer API
        ticket_id: body.upload.ticket_id || body.uri.split('/').pop()
      });
    });
  });
};

/**
 * Complete a direct upload session
 */
export const completeUpload = async (completeUri: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    client.request({
      method: 'DELETE',
      path: completeUri
    }, (error: any, body: any, statusCode: number) => {
      if (error) {
        console.error('Vimeo complete upload error:', error);
        reject(new Error(`Failed to complete upload: ${error.message}`));
        return;
      }

      // Success is indicated by 201 status code for complete upload
      if (statusCode === 201 || statusCode === 204) {
        resolve(body);
      } else {
        reject(new Error(`Unexpected status code: ${statusCode}`));
      }
    });
  });
};

/**
 * Get video details with file information
 */
export const getVideoDetails = async (videoId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Handle both full URI and just video ID
    const path = videoId.startsWith('/videos/') ? videoId : `/videos/${videoId}`;
    
    client.request({
      method: 'GET',
      path: path,
      query: {
        fields: 'uri,name,created_time,files,status,transcode,file_size'
      }
    }, (error: any, body: any) => {
      if (error) {
        console.error('Error getting video details:', error);
        reject(error);
        return;
      }
      resolve(body);
    });
  });
};

/**
 * Move video to specific folder
 */
export const moveVideoToFolder = async (videoUri: string, folderId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    client.request({
      method: 'PUT',
      path: `${videoUri}/projects/${folderId}`
    }, (error: any, body: any) => {
      if (error) {
        console.error('Vimeo move video error:', error);
        reject(new Error(`Failed to move video to folder: ${error.message}`));
        return;
      }

      resolve(body);
    });
  });
};

/**
 * Get videos in a Vimeo folder/project
 */

export const getFolderVideos = async (folderId: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    console.log('Attempting to fetch videos from folder:', folderId);
    
    // Extract project ID from full folder path if needed
    let projectId = folderId;
    if (folderId.includes('/projects/')) {
      projectId = folderId.split('/projects/')[1];
      console.log('Extracted project ID:', projectId);
    }
    
    // Try different API endpoints 
    const endpoints = [
      `${folderId}/videos`, // Use full path as stored
      `/me/projects/${projectId}/videos`, // Use extracted project ID
      `/projects/${projectId}/videos` // Direct project access
    ];
    
    const tryEndpoint = (index: number) => {
      if (index >= endpoints.length) {
        reject(new Error('All folder video endpoints failed'));
        return;
      }
      
      const endpoint = endpoints[index];
      console.log(`Trying endpoint ${index + 1}/${endpoints.length}: ${endpoint}`);
      
      client.request({
        method: 'GET',
        path: endpoint,
        query: {
          per_page: 100,
          fields: 'uri,name,created_time,status,transcode'
        }
      }, async (error: any, body: any) => {
        if (error) {
          console.error(`Endpoint ${endpoint} failed:`, error);
          tryEndpoint(index + 1);
          return;
        }

        console.log(`Success with endpoint: ${endpoint}`, body.data?.length || 0, 'videos found');
        
        // Get detailed info for each video to fetch file sizes
        try {
          const videosWithDetails = await Promise.all(
            (body.data || []).map(async (video: any) => {
              const videoId = video.uri.split('/').pop();
              try {
                const details = await getVideoDetails(videoId);
                console.log(`Video ${videoId} details:`, {
                  name: details.name,
                  files: details.files?.length || 0,
                  fileSize: details.file_size
                });
                return details;
              } catch (err) {
                console.warn(`Failed to get details for video ${videoId}:`, err);
                return video; // Return basic video if details fail
              }
            })
          );
          
          console.log('Videos with details fetched:', videosWithDetails.length);
          resolve(videosWithDetails);
        } catch (err) {
          console.error('Error fetching video details:', err);
          resolve(body.data || []); // Fallback to basic data
        }
      });
    };
    
    tryEndpoint(0);
  });
};

/**
 * Verify video upload status
 */
export const verifyVideoUpload = async (videoId: string): Promise<{
  isUploaded: boolean;
  isTranscoding: boolean;
  isReady: boolean;
  status: string;
  transcode?: {
    status: string;
    progress?: number;
  };
}> => {
  return new Promise((resolve, reject) => {
    client.request({
      method: 'GET',
      path: `/videos/${videoId}`,
      query: {
        fields: 'status,transcode,upload'
      }
    }, (error: any, body: any) => {
      if (error) {
        console.error('Error verifying video upload:', error);
        reject(error);
        return;
      }
      
      const uploadStatus = body.upload?.status || 'unknown';
      const transcodeStatus = body.transcode?.status || 'unknown';
      
      const result = {
        isUploaded: uploadStatus === 'complete',
        isTranscoding: transcodeStatus === 'in_progress',
        isReady: transcodeStatus === 'complete',
        status: body.status || 'unknown',
        transcode: body.transcode ? {
          status: transcodeStatus,
          progress: body.transcode.progress || 0
        } : undefined
      };
      
      resolve(result);
    });
  });
};

/**
 * Create user folder
 */
export const createUserFolder = async (userId: string, userEmail: string): Promise<string> => {
  const folderName = `User_${userId.substring(0, 8)}_${userEmail.split('@')[0]}`;
  
  return new Promise((resolve, reject) => {
    client.request({
      method: 'POST',
      path: '/me/projects',
      query: {
        name: folderName
      }
    }, (error: any, body: any) => {
      if (error) {
        console.error('Error creating user folder:', error);
        reject(error);
        return;
      }
      
      resolve(body.uri);
    });
  });
};

/**
 * Create project folder
 */
export const createProjectFolder = async (userFolderUri: string, projectId: number, projectTitle: string): Promise<string> => {
  const folderName = `Project_${projectId}_${projectTitle.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  return new Promise((resolve, reject) => {
    client.request({
      method: 'POST',
      path: '/me/projects',
      query: {
        name: folderName,
        parent_folder_uri: userFolderUri
      }
    }, (error: any, body: any) => {
      if (error) {
        console.error('Error creating project folder:', error);
        reject(error);
        return;
      }
      
      resolve(body.uri);
    });
  });
};

// Generate a shareable download link for a Vimeo video
export const generateVideoDownloadLink = async (videoId: string): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    console.log(`Getting download link for video: ${videoId}`);
    
    // First try to enable downloads on the video if they're not available
    client.request({
      method: 'PATCH',
      path: `/videos/${videoId}`,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        privacy: {
          download: true
        }
      })
    }, (patchError: any, patchBody: any) => {
      if (patchError) {
        console.log(`Could not enable downloads for video ${videoId}:`, patchError.message);
      } else {
        console.log(`✅ Successfully enabled downloads for video ${videoId}`);
      }
      
      // Now get the video details with full response
      client.request({
        method: 'GET',
        path: `/videos/${videoId}`
        // Note: Not specifying fields parameter to get full response including download array
      }, (error: any, body: any) => {
        if (error) {
          console.error(`Error getting video download link for ${videoId}:`, error);
          reject(error);
          return;
        }

        // Only log the relevant parts to avoid huge logs
        console.log('Video download info:', {
          hasDownload: !!body.download,
          downloadCount: body.download?.length || 0,
          hasFiles: !!body.files,
          filesCount: body.files?.length || 0,
          privacy: body.privacy
        });

        // Priority 1: Check for direct download URLs in the download array (like the axios example)
        if (body.download && Array.isArray(body.download) && body.download.length > 0) {
          console.log(`✅ Found ${body.download.length} download options for video ${videoId}`);
          
          // Find the best quality MP4 download link (following the axios example pattern)
          const mp4Download = body.download.find((file: any) => file.type === 'video/mp4');
          
          if (mp4Download?.link) {
            console.log(`✅ Direct MP4 download link found for video ${videoId}:`, {
              quality: mp4Download.quality,
              type: mp4Download.type,
              width: mp4Download.width,
              height: mp4Download.height,
              url: mp4Download.link.substring(0, 100) + '...'
            });
            resolve(mp4Download.link);
            return;
          }
          
          // Fallback: get the highest quality download available
          const bestDownload = body.download
            .filter((dl: any) => dl.link && dl.type && dl.type.includes('video'))
            .sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0];
          
          if (bestDownload?.link) {
            console.log(`✅ Best quality download link found for video ${videoId}:`, {
              quality: bestDownload.quality,
              type: bestDownload.type,
              width: bestDownload.width,
              height: bestDownload.height,
              url: bestDownload.link.substring(0, 100) + '...'
            });
            resolve(bestDownload.link);
            return;
          }
        } else {
          console.log(`❌ No download array found for video ${videoId}`);
        }

        // Priority 2: Check files array for direct file links
        if (body.files && Array.isArray(body.files) && body.files.length > 0) {
          console.log(`Found ${body.files.length} file options for video ${videoId}`);
          
          const bestFile = body.files
            .filter((file: any) => file.link && file.quality !== 'hls' && file.quality !== 'dash')
            .sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0];
          
          if (bestFile?.link) {
            console.log(`✅ Direct file link found for video ${videoId}: quality ${bestFile.quality}`);
            resolve(bestFile.link);
            return;
          }
        } else {
          console.log(`❌ No files array found for video ${videoId}`);
        }

        // Final fallback: Use the direct Vimeo link which has the hash for private access
        if (body.link) {
          console.log(`⚠️ No direct download available. Using Vimeo page link: ${body.link}`);
          resolve(body.link);
          return;
        }

        console.log(`❌ No download link available for video ${videoId}`);
        resolve(null);
      });
    });
  });
};

// Verify if a video belongs to a specific project folder
export const verifyVideoInProjectFolder = async (videoId: string, projectFolderId: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    client.request({
      method: 'GET',
      path: `/videos/${videoId}`,
      query: {
        fields: 'parent_folder'
      }
    }, (error: any, body: any) => {
      if (error) {
        console.error(`Error verifying video ${videoId} in folder ${projectFolderId}:`, error);
        reject(error);
        return;
      }

      // Check if the video's parent folder matches the project folder
      const videoFolderId = body.parent_folder?.uri?.split('/').pop();
      resolve(videoFolderId === projectFolderId);
    });
  });
};

/**
 * Configure video privacy settings for delivered videos
 * Ensures videos are: 1) Unlisted, 2) Downloadable, 3) Embeddable
 */
export const configureDeliveredVideo = async (videoId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const videoPath = videoId.startsWith('/videos/') ? videoId : `/videos/${videoId}`;
    
    console.log(`Configuring delivered video privacy settings for: ${videoId}`);
    
    client.request({
      method: 'PATCH',
      path: videoPath,
      query: {
        privacy: {
          view: 'unlisted',      // REQUIREMENT 1: Not publicly accessible but viewable via direct link
          embed: 'public',       // REQUIREMENT 3: Can be embedded
          download: true,        // REQUIREMENT 2: Can be downloaded
          add: false,           // Cannot be added to collections
          comments: 'nobody'     // No comments allowed
        },
        embed: {
          buttons: {
            like: false,
            watchlater: false,
            share: false,
            embed: false,
            hd: true,
            fullscreen: true,
            scaling: true
          },
          color: '7c3aed',        // Purple brand color
          logos: {
            vimeo: false,         // Hide Vimeo branding
            custom: {
              active: false
            }
          },
          playbar: true,
          title: {
            name: 'hide',         // Hide video title
            owner: 'hide',        // Hide owner info
            portrait: 'hide'      // Hide owner portrait
          },
          volume: true
        }
      }
    }, (error: any, body: any) => {
      if (error) {
        console.error('Error configuring delivered video privacy:', error);
        reject(new Error(`Failed to configure video privacy: ${error.message}`));
        return;
      }
      
      console.log(`Video privacy configured successfully: ${videoId} - Unlisted, Downloadable, Embeddable`);
      resolve(body);
    });
  });
};

export const vimeoService = {
  createUploadSession,
  completeUpload,
  verifyVideoUpload,
  createUserFolder,
  createProjectFolder,
  getFolderVideos,
  generateVideoDownloadLink,
  verifyVideoInProjectFolder,
  configureDeliveredVideo
};