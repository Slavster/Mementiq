import ImageKit from 'imagekit';

// Initialize ImageKit with environment variables
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || ''
});

export interface UploadResult {
  fileId: string;
  url: string;
  filePath: string;
  thumbnailUrl?: string;
  name: string;
  size: number;
  tags: string[];
}

export interface UploadParams {
  fileName: string;
  file: string; // base64 encoded file
  folder: string; // e.g., '/users/user123/projects/project456'
  tags?: string[];
}

export class ImageKitService {
  /**
   * Create folder structure for user/project
   */
  async createUserProjectFolder(userId: string, projectId: number): Promise<string> {
    return `/users/${userId}/projects/${projectId}`;
  }

  /**
   * Upload an image to ImageKit with security checks
   */
  async uploadImage(
    base64Data: string, 
    filename: string, 
    folderPath: string, 
    userId: string
  ): Promise<UploadResult> {
    // Security check: ensure folder path matches user ID
    if (!folderPath.includes(`/users/${userId}/`)) {
      throw new Error('Security violation: User can only upload to their own folders');
    }

    return this.uploadFile({
      file: base64Data,
      fileName: filename,
      folder: folderPath,
      tags: ['mementiq', 'user-upload', `user-${userId}`]
    });
  }

  /**
   * Upload a file to ImageKit with proper folder structure
   */
  async uploadFile(params: UploadParams): Promise<UploadResult> {
    try {
      const result = await imagekit.upload({
        file: params.file,
        fileName: params.fileName,
        folder: params.folder,
        tags: params.tags || ['mementiq', 'project-photo'],
        useUniqueFileName: true,
        overwriteFile: false,
      });

      // Generate thumbnail URL with ImageKit transformations
      const thumbnailUrl = imagekit.url({
        path: result.filePath,
        transformation: [
          { width: 300, height: 300, cropMode: 'maintain_ratio' },
          { quality: 80 }
        ]
      });

      return {
        fileId: result.fileId,
        url: result.url,
        filePath: result.filePath,
        thumbnailUrl,
        name: result.name,
        size: result.size,
        tags: result.tags || []
      };
    } catch (error: any) {
      console.error('ImageKit upload error:', error);
      throw new Error(`ImageKit upload failed: ${error.message}`);
    }
  }

  /**
   * Generate a thumbnail URL for an existing image
   */
  generateThumbnailUrl(filePath: string, width = 300, height = 300): string {
    return imagekit.url({
      path: filePath,
      transformation: [
        { width, height, cropMode: 'maintain_ratio' },
        { quality: 80 }
      ]
    });
  }

  /**
   * Delete a file from ImageKit
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await imagekit.deleteFile(fileId);
    } catch (error: any) {
      console.error('ImageKit delete error:', error);
      throw new Error(`ImageKit delete failed: ${error.message}`);
    }
  }

  /**
   * List files in a specific folder
   */
  async listFiles(folder: string): Promise<any[]> {
    try {
      const result = await imagekit.listFiles({
        path: folder,
        includeFolder: false
      });
      return result;
    } catch (error: any) {
      console.error('ImageKit list files error:', error);
      throw new Error(`ImageKit list files failed: ${error.message}`);
    }
  }

  /**
   * Verify user has access to a specific folder path
   */
  verifyUserFolderAccess(userId: string, folderPath: string): boolean {
    return folderPath.includes(`/users/${userId}/`);
  }

  /**
   * Check if ImageKit is properly configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.IMAGEKIT_PUBLIC_KEY &&
      process.env.IMAGEKIT_PRIVATE_KEY &&
      process.env.IMAGEKIT_URL_ENDPOINT
    );
  }
}

export const imagekitService = new ImageKitService();