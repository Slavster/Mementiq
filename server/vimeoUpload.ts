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