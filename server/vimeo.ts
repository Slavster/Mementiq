import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Vimeo } = require('@vimeo/vimeo');

const vimeoAccessToken = process.env.VIMEO_ACCESS_TOKEN;

if (!vimeoAccessToken) {
  throw new Error('VIMEO_ACCESS_TOKEN environment variable is required');
}

export const vimeoClient = new Vimeo(null, null, vimeoAccessToken);

export interface VimeoFolder {
  uri: string;
  name: string;
  created_time: string;
  modified_time: string;
  resource_key: string;
}

export interface VimeoUploadResponse {
  uri: string;
  name: string;
  link: string;
  embed?: {
    html: string;
  };
  files?: Array<{
    quality: string;
    type: string;
    width: number;
    height: number;
    link: string;
    size: number;
  }>;
}

export class VimeoService {
  private client: any;

  constructor() {
    this.client = vimeoClient;
  }

  /**
   * Create or get user folder in Vimeo
   */
  async createUserFolder(userId: string, userEmail: string): Promise<string> {
    const folderName = `User_${userId.substring(0, 8)}_${userEmail.split('@')[0]}`;
    
    try {
      // Check if folder already exists
      const existingFolder = await this.findFolderByName(folderName);
      if (existingFolder) {
        console.log('Found existing user folder:', existingFolder.uri);
        return existingFolder.uri;
      }

      // Create new user folder
      console.log('Creating new user folder:', folderName);
      return new Promise((resolve, reject) => {
        this.client.request({
          method: 'POST',
          path: '/me/projects',
          query: {
            name: folderName
          }
        }, (error: any, body: any) => {
          if (error) {
            console.error('Error creating user folder:', error);
            reject(error);
          } else {
            console.log('Created user folder:', body.uri);
            resolve(body.uri);
          }
        });
      });
    } catch (error) {
      console.error('Error in createUserFolder:', error);
      throw error;
    }
  }

  /**
   * Create project sub-folder within user folder
   */
  async createProjectFolder(userFolderUri: string, projectId: number, projectTitle: string): Promise<string> {
    const folderName = `Project_${projectId}_${projectTitle.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    return new Promise((resolve, reject) => {
      this.client.request({
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
        } else {
          console.log('Created project folder:', body.uri);
          resolve(body.uri);
        }
      });
    });
  }

  /**
   * Find folder by name
   */
  private async findFolderByName(name: string): Promise<VimeoFolder | null> {
    return new Promise((resolve, reject) => {
      this.client.request({
        method: 'GET',
        path: '/me/projects',
        query: {
          per_page: 100
        }
      }, (error: any, body: any) => {
        if (error) {
          reject(error);
        } else {
          const folder = body.data?.find((f: VimeoFolder) => f.name === name);
          resolve(folder || null);
        }
      });
    });
  }

  /**
   * Find subfolder by name within a parent folder
   */
  private async findSubfolderByName(name: string, parentFolderUri: string): Promise<VimeoFolder | null> {
    return new Promise((resolve, reject) => {
      this.client.request({
        method: 'GET',
        path: `${parentFolderUri}/projects`,
        query: {
          per_page: 100
        }
      }, (error: any, body: any) => {
        if (error) {
          reject(error);
        } else {
          const folder = body.data?.find((f: VimeoFolder) => f.name === name);
          resolve(folder || null);
        }
      });
    });
  }

  /**
   * Get user's folders (for security - only show their own)
   */
  async getUserFolders(userId: string): Promise<VimeoFolder[]> {
    const userPrefix = `User_${userId.substring(0, 8)}_`;
    
    return new Promise((resolve, reject) => {
      this.client.request({
        method: 'GET',
        path: '/me/projects',
        query: {
          per_page: 100
        }
      }, (error: any, body: any) => {
        if (error) {
          reject(error);
        } else {
          // Filter to only user's folders for security
          const userFolders = body.data?.filter((f: VimeoFolder) => 
            f.name.startsWith(userPrefix)
          ) || [];
          resolve(userFolders);
        }
      });
    });
  }

  /**
   * Upload video to specific folder
   */
  async uploadVideo(
    filePath: string, 
    fileName: string, 
    folderUri: string,
    fileSize: number
  ): Promise<VimeoUploadResponse> {
    // Check 10GB limit (in bytes)
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
    if (fileSize > maxSize) {
      throw new Error('File size exceeds 10GB limit');
    }

    return new Promise((resolve, reject) => {
      this.client.upload(
        filePath,
        {
          name: fileName,
          description: `Uploaded via Mementiq platform`,
          folder_uri: folderUri,
          privacy: {
            view: 'nobody', // Private by default
            embed: 'private'
          }
        },
        (uri: string) => {
          // Upload complete, get video details
          this.client.request({
            method: 'GET',
            path: uri
          }, (error: any, body: any) => {
            if (error) {
              reject(error);
            } else {
              resolve(body as VimeoUploadResponse);
            }
          });
        },
        (bytesUploaded: number, bytesTotal: number) => {
          // Progress callback
          const progress = Math.round((bytesUploaded / bytesTotal) * 100);
          console.log(`Upload progress: ${progress}%`);
        },
        (error: any) => {
          console.error('Upload error:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Verify video upload status and transcoding progress
   */
  async verifyVideoUpload(videoId: string): Promise<{
    isUploaded: boolean;
    isTranscoding: boolean;
    isReady: boolean;
    status: string;
    transcode?: {
      status: string;
      progress?: number;
    };
  }> {
    return new Promise((resolve, reject) => {
      this.client.request({
        method: 'GET',
        path: `/videos/${videoId}`,
        query: {
          fields: 'status,transcode,upload'
        }
      }, (error: any, body: any) => {
        if (error) {
          console.error('Error verifying video upload:', error);
          reject(error);
        } else {
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
          
          console.log(`Video ${videoId} verification:`, result);
          resolve(result);
        }
      });
    });
  }

  /**
   * Get videos in a folder
   */
  async getFolderVideos(folderUri: string): Promise<VimeoUploadResponse[]> {
    return new Promise((resolve, reject) => {
      this.client.request({
        method: 'GET',
        path: `${folderUri}/videos`,
        query: {
          per_page: 100
        }
      }, (error: any, body: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(body.data || []);
        }
      });
    });
  }

  /**
   * Delete video (for cleanup)
   */
  async deleteVideo(videoUri: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.request({
        method: 'DELETE',
        path: videoUri
      }, (error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get folder size and video count
   */
  async getFolderStats(folderUri: string): Promise<{ totalSize: number; videoCount: number }> {
    const videos = await this.getFolderVideos(folderUri);
    const totalSize = videos.reduce((sum, video) => {
      const fileSize = video.files?.reduce((s, f) => s + (f.size || 0), 0) || 0;
      return sum + fileSize;
    }, 0);
    
    return {
      totalSize,
      videoCount: videos.length
    };
  }
}

export const vimeoService = new VimeoService();