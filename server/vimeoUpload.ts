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
 * Get video details
 */
export const getVideoDetails = async (videoUri: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    client.request({
      method: 'GET',
      path: videoUri
    }, (error: any, body: any) => {
      if (error) {
        console.error('Vimeo get video error:', error);
        reject(new Error(`Failed to get video details: ${error.message}`));
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
          per_page: 100
        }
      }, (error: any, body: any) => {
        if (error) {
          console.error(`Endpoint ${endpoint} failed:`, error);
          tryEndpoint(index + 1);
          return;
        }

        console.log(`Success with endpoint: ${endpoint}`, body.data?.length || 0, 'videos found');
        resolve(body.data || []);
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

export const vimeoService = {
  createUploadSession,
  completeUpload,
  verifyVideoUpload,
  createUserFolder,
  createProjectFolder,
  getFolderVideos
};