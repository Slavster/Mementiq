import ImageKit from "imagekit";

export class ImageKitService {
  private imagekit: ImageKit;

  constructor() {
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

    if (!publicKey || !privateKey || !urlEndpoint) {
      throw new Error("ImageKit credentials not configured. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT environment variables.");
    }

    this.imagekit = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });
  }

  /**
   * Create folder structure for user/project organization
   * Mimics Vimeo's structure: /users/{userId}/projects/{projectId}
   */
  async createUserProjectFolder(userId: string, projectId: number): Promise<string> {
    const folderPath = `/users/${userId}/projects/${projectId}`;
    
    try {
      // ImageKit automatically creates folders when uploading files to them
      // We don't need to explicitly create folders - they're created on first upload
      console.log(`ImageKit folder path prepared: ${folderPath}`);
      return folderPath;
    } catch (error) {
      console.error("Error preparing ImageKit folder:", error);
      throw new Error(`Failed to prepare folder structure: ${error}`);
    }
  }

  /**
   * Upload image to ImageKit with proper folder organization
   */
  async uploadImage(
    base64Data: string,
    filename: string,
    folderPath: string,
    userId: string
  ): Promise<{
    fileId: string;
    url: string;
    thumbnailUrl: string;
    filePath: string;
  }> {
    try {
      // Clean base64 data
      const base64Clean = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Create unique filename to prevent conflicts
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}_${filename}`;
      
      const uploadResult = await this.imagekit.upload({
        file: base64Clean,
        fileName: uniqueFilename,
        folder: folderPath,
        useUniqueFileName: false, // We're already making it unique
        tags: [`user_${userId}`, `uploaded_${timestamp}`],
        isPrivateFile: false, // Set to true if you want private access
      });

      // Generate thumbnail URL (ImageKit supports on-the-fly transformations)
      const thumbnailUrl = this.imagekit.url({
        path: uploadResult.filePath,
        transformation: [
          {
            height: "150",
            width: "150",
            crop: "fill",
            quality: "80"
          }
        ]
      });

      return {
        fileId: uploadResult.fileId,
        url: uploadResult.url,
        thumbnailUrl,
        filePath: uploadResult.filePath,
      };
    } catch (error) {
      console.error("ImageKit upload error:", error);
      throw new Error(`Failed to upload to ImageKit: ${error}`);
    }
  }

  /**
   * Delete image from ImageKit
   */
  async deleteImage(fileId: string): Promise<void> {
    try {
      await this.imagekit.deleteFile(fileId);
      console.log(`Successfully deleted ImageKit file: ${fileId}`);
    } catch (error) {
      console.error("Error deleting ImageKit file:", error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * List files in a specific folder (for security verification)
   */
  async listFolderFiles(folderPath: string): Promise<any[]> {
    try {
      const result = await this.imagekit.listFiles({
        path: folderPath,
        limit: 1000, // Adjust as needed
      });
      return result;
    } catch (error) {
      console.error("Error listing ImageKit folder files:", error);
      throw new Error(`Failed to list folder files: ${error}`);
    }
  }

  /**
   * Verify user has access to a specific folder path
   * Security check to prevent cross-user access
   */
  verifyUserFolderAccess(userId: string, folderPath: string): boolean {
    const expectedPrefix = `/users/${userId}/`;
    return folderPath.startsWith(expectedPrefix);
  }

  /**
   * Get file details from ImageKit
   */
  async getFileDetails(fileId: string): Promise<any> {
    try {
      const result = await this.imagekit.getFileDetails(fileId);
      return result;
    } catch (error) {
      console.error("Error getting ImageKit file details:", error);
      throw new Error(`Failed to get file details: ${error}`);
    }
  }

  /**
   * Generate authentication parameters for client-side uploads
   */
  getAuthenticationParameters(): {
    signature: string;
    expire: number;
    token: string;
  } {
    return this.imagekit.getAuthenticationParameters();
  }
}

// Export singleton instance
export const imagekitService = new ImageKitService();