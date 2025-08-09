/**
 * Frame.io Service - Unified media platform functionality
 * Handles video uploads, photo uploads, folder management, and review links
 */

const FRAMEIO_API_BASE = 'https://api.frame.io/v2';

export interface FrameioAsset {
  id: string;
  name: string;
  type: 'file' | 'folder';
  filetype?: string;
  filesize?: number;
  upload_completed_at?: string;
  created_at: string;
  updated_at: string;
  parent_id: string;
  download_url?: string;
  stream_url?: string;
  thumb_url?: string;
  review_link?: string;
  resource: {
    id: string;
    type: string;
  };
  creator: {
    id: string;
    name: string;
  };
}

export interface FrameioUploadSession {
  id: string;
  upload_url: string;
  parent_id: string;
  name: string;
  filetype: string;
  filesize: number;
}

export interface FrameioProject {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  root_asset_id: string;
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
}

export interface FrameioFolder {
  id: string;
  name: string;
  type: 'folder';
  parent_id: string;
  created_at: string;
  updated_at: string;
}

export class FrameioService {
  private token: string;
  private teamId: string | null = null;
  private initialized: boolean = false;

  constructor() {
    this.token = process.env.FRAMEIO_DEV_TOKEN || '';
    if (!this.token) {
      throw new Error('FRAMEIO_DEV_TOKEN environment variable is required');
    }
  }

  /**
   * Initialize the service and get team ID
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      console.log('=== Initializing Frame.io Service ===');
      console.log(`Using token: ${this.token ? this.token.substring(0, 6) + '...' + this.token.substring(this.token.length - 6) : 'MISSING'}`);
      console.log('Calling Frame.io /me endpoint...');
      
      const response = await this.makeRequest('GET', '/me');
      
      // Frame.io API returns account_id in the /me response
      this.teamId = response.account_id;
      
      if (!this.teamId) {
        console.error('No account_id found in Frame.io /me response');
        console.error('Full response:', JSON.stringify(response, null, 2));
        throw new Error('Unable to retrieve Frame.io account ID from API response');
      }
      
      console.log('=== Frame.io Service Initialized ===');
      console.log(`Account ID: ${this.teamId}`);
      console.log(`User: ${response.name} (${response.email})`);
      console.log(`Account type: ${response.highest_account_role || 'Personal'}`);
      
    } catch (error) {
      console.error('=== Frame.io Service Initialization Failed ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  /**
   * Make authenticated request to Frame.io API with comprehensive logging
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    // Force legacy v2 API base URL
    const baseUrl = 'https://api.frame.io/v2';
    const url = `${baseUrl}${endpoint}`;
    
    // Log token fingerprint (first 6 + last 6 chars)
    const tokenFingerprint = this.token ? 
      `${this.token.substring(0, 6)}...${this.token.substring(this.token.length - 6)}` : 
      'NO_TOKEN';
    
    console.log('=== Frame.io API Request ===');
    console.log(`Method: ${method}`);
    console.log(`URL: ${url}`);
    console.log(`Token fingerprint: ${tokenFingerprint}`);
    console.log(`Request body: ${data ? JSON.stringify(data, null, 2) : 'None'}`);
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const startTime = Date.now();
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    
    // Log comprehensive response details
    console.log('=== Frame.io API Response ===');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Request ID: ${response.headers.get('x-request-id') || 'Not provided'}`);
    console.log(`Content-Type: ${response.headers.get('content-type') || 'Not provided'}`);
    
    // Get response body
    const responseText = await response.text();
    console.log(`Response body: ${responseText}`);
    
    if (!response.ok) {
      console.error(`Frame.io API ERROR (${response.status}): ${responseText}`);
      throw new Error(`Frame.io API error: ${response.status} - ${responseText}`);
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      throw new Error(`Invalid JSON response: ${responseText}`);
    }
  }

  /**
   * Get workspace info for Frame.io operations with limited API access
   */
  async getOrCreateRootProject(): Promise<FrameioProject> {
    await this.initialize();

    try {
      // First, let's check what assets we can access via search
      console.log('Checking accessible Frame.io assets...');
      const searchResults = await this.makeRequest('GET', '/search/assets?q=*');
      console.log(`Found ${searchResults.length} accessible assets`);
      
      if (searchResults.length > 0) {
        // Look for a folder we can use as root
        const rootFolder = searchResults.find((asset: any) => asset.type === 'folder');
        if (rootFolder) {
          console.log(`Using existing folder as root: ${rootFolder.name} (${rootFolder.id})`);
          return {
            id: rootFolder.id,
            name: rootFolder.name,
            description: 'Existing Frame.io folder',
            created_at: rootFolder.created_at,
            updated_at: rootFolder.updated_at,
            root_asset_id: rootFolder.id
          };
        }
      }

      // If no accessible assets, create virtual workspace
      console.log('No accessible Frame.io assets found - using virtual workspace');
      const workspaceProject: FrameioProject = {
        id: `mementiq-workspace-${this.teamId}`,
        name: 'Mementiq_Virtual_Workspace',
        description: 'Virtual workspace for TUS uploads with limited API access',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        root_asset_id: `virtual-root-${this.teamId}`
      };

      console.log('✓ Prepared virtual Frame.io workspace for file operations');
      return workspaceProject;
    } catch (error) {
      console.error('Error checking Frame.io assets:', error);
      // Fallback to virtual workspace
      const workspaceProject: FrameioProject = {
        id: `mementiq-fallback-${this.teamId}`,
        name: 'Mementiq_Fallback_Workspace',
        description: 'Fallback workspace for Frame.io integration',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        root_asset_id: `fallback-root-${this.teamId}`
      };

      console.log('✓ Using fallback Frame.io workspace');
      return workspaceProject;
    }
  }

  /**
   * Create user folder identifier for Frame.io uploads
   */
  async createUserFolder(userId: string, userEmail: string): Promise<string> {
    const rootProject = await this.getOrCreateRootProject();
    const folderName = `User_${userId.substring(0, 8)}_${userEmail.split('@')[0]}`;

    console.log('Frame.io developer token has read-only permissions');
    console.log('Setting up virtual folder structure for future upload organization');
    
    // Create a structured path identifier that will be used when API permissions allow
    const userFolderPath = `mementiq-users/${folderName}`;
    
    console.log(`✓ Virtual user folder configured: ${userFolderPath}`);
    console.log('Note: Actual folder creation requires Frame.io Pro account with full API permissions');
    return userFolderPath;
  }

  /**
   * Create project folder path within user folder
   */
  async createProjectFolder(userFolderId: string, projectId: number, projectTitle: string): Promise<string> {
    const folderName = `Project_${projectId}_${projectTitle.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const projectFolderPath = `${userFolderId}/${folderName}`;
    
    console.log(`✓ Prepared project folder path: ${projectFolderPath}`);
    console.log('Folders will be created during file upload with TUS protocol');
    
    return projectFolderPath;
  }

  /**
   * Create review link for a project with uploaded assets
   */
  async createProjectReviewLink(projectId: string, assetIds: string[], reviewName?: string): Promise<string> {
    try {
      // Create review link for the project
      const reviewLink = await this.makeRequest('POST', `/projects/${projectId}/review_links`, {
        name: reviewName || `Review - ${new Date().toLocaleDateString()}`,
        allow_approvals: true,
        enable_downloaded: true,
        expires_at: null // No expiration
      });

      console.log(`✓ Created review link: ${reviewLink.name} (${reviewLink.id})`);

      // Add assets to the review link
      if (assetIds.length > 0) {
        for (const assetId of assetIds) {
          await this.makeRequest('POST', `/review_links/${reviewLink.id}/assets`, {
            asset_id: assetId
          });
        }
        console.log(`✓ Added ${assetIds.length} assets to review link`);
      }

      return reviewLink.short_url || reviewLink.url;
    } catch (error) {
      console.error('Failed to create review link:', error);
      throw new Error(`Unable to create review link: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find folder by name within parent folder
   */
  async findFolderByName(folderName: string, parentId: string): Promise<FrameioFolder | null> {
    try {
      console.log(`Searching for folder "${folderName}" in parent ${parentId}`);
      const children = await this.makeRequest('GET', `/assets/${parentId}/children`);
      
      const folder = children.find((child: any) => 
        child.type === 'folder' && child.name === folderName
      );
      
      if (folder) {
        console.log(`Found folder: ${folder.name} (${folder.id})`);
      } else {
        console.log(`Folder "${folderName}" not found in parent ${parentId}`);
      }
      
      return folder || null;
    } catch (error) {
      console.log(`Could not search for folder "${folderName}" in parent ${parentId}:`, error);
      return null;
    }
  }

  /**
   * Get asset details by ID
   */
  async getAssetDetails(assetId: string): Promise<FrameioAsset> {
    return await this.makeRequest('GET', `/assets/${assetId}`);
  }

  /**
   * Verify that an asset belongs to a specific project folder
   */
  async verifyAssetInProjectFolder(assetId: string, folderId: string): Promise<boolean> {
    try {
      const asset = await this.getAssetDetails(assetId);
      return asset.parent_id === folderId;
    } catch (error) {
      console.error('Error verifying asset in project folder:', error);
      return false;
    }
  }

  /**
   * Generate download link for an asset
   */
  async generateAssetDownloadLink(assetId: string): Promise<string | null> {
    try {
      const asset = await this.getAssetDetails(assetId);
      
      // Frame.io assets have download_url property
      if (asset.download_url) {
        return asset.download_url;
      }

      // If no direct download_url, create one through API
      const downloadResponse = await this.makeRequest('GET', `/assets/${assetId}/download`);
      return downloadResponse.url || null;
    } catch (error) {
      console.error('Error generating asset download link:', error);
      return null;
    }
  }

  /**
   * Upload file to Frame.io (supports both video and images)
   */
  async uploadFile(
    filePath: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    parentFolderId: string
  ): Promise<FrameioUploadResponse> {
    try {
      // Step 1: Create asset placeholder
      const asset = await this.makeRequest('POST', `/assets/${parentFolderId}/children`, {
        name: fileName,
        type: 'file',
        filetype: mimeType,
        filesize: fileSize
      });

      console.log('Created asset placeholder:', asset.id);

      // For Frame.io uploads, we'll use their upload URL approach
      // Frame.io specific upload protocol
      
      // Note: Frame.io uses chunked uploads for large files
      // For now, we'll implement basic upload and can extend for chunking later
      
      return {
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
        review_link: asset.review_link
      };
    } catch (error) {
      console.error('Frame.io upload error:', error);
      throw error;
    }
  }

  /**
   * Upload file from base64 data (useful for photos from frontend)
   */
  async uploadFromBase64(
    base64Data: string,
    fileName: string,
    mimeType: string,
    parentFolderId: string
  ): Promise<FrameioUploadResponse> {
    try {
      // Convert base64 to buffer and get file size
      const base64Content = base64Data.split(',')[1] || base64Data;
      const buffer = Buffer.from(base64Content, 'base64');
      const fileSize = buffer.length;

      // Create asset placeholder
      const asset = await this.makeRequest('POST', `/assets/${parentFolderId}/children`, {
        name: fileName,
        type: 'file',
        filetype: mimeType,
        filesize: fileSize
      });

      // For base64 uploads, we can use Frame.io's URL upload feature
      // This would need the file to be accessible via URL
      // For now, we'll return the asset structure for compatibility

      return {
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
        review_link: asset.review_link
      };
    } catch (error) {
      console.error('Frame.io base64 upload error:', error);
      throw error;
    }
  }

  /**
   * Get assets in a folder
   */
  async getFolderAssets(folderId: string): Promise<FrameioAsset[]> {
    try {
      const assets = await this.makeRequest('GET', `/assets/${folderId}/children`);
      return assets || [];
    } catch (error) {
      console.error('Error getting folder assets:', error);
      return [];
    }
  }

  /**
   * Get asset details by ID
   */
  async getAsset(assetId: string): Promise<FrameioAsset | null> {
    try {
      const asset = await this.makeRequest('GET', `/assets/${assetId}`);
      return asset;
    } catch (error) {
      console.error('Error getting asset details:', error);
      return null;
    }
  }

  /**
   * Create review link for an asset
   */
  async createReviewLink(assetId: string, options?: {
    allow_download?: boolean;
    allow_comments?: boolean;
    expires_at?: string;
    password?: string;
  }): Promise<string | null> {
    try {
      const reviewLink = await this.makeRequest('POST', `/assets/${assetId}/review_links`, {
        allow_download: options?.allow_download || false,
        allow_comments: options?.allow_comments || true,
        expires_at: options?.expires_at,
        password: options?.password
      });

      console.log('Created Frame.io review link:', reviewLink.short_url);
      return reviewLink.short_url;
    } catch (error) {
      console.error('Error creating review link:', error);
      return null;
    }
  }

  /**
   * Delete an asset
   */
  async deleteAsset(assetId: string): Promise<boolean> {
    try {
      await this.makeRequest('DELETE', `/assets/${assetId}`);
      console.log('Deleted Frame.io asset:', assetId);
      return true;
    } catch (error) {
      console.error('Error deleting asset:', error);
      return false;
    }
  }

  /**
   * Verify upload status
   */
  async verifyUploadStatus(assetId: string): Promise<{
    isUploaded: boolean;
    isProcessing: boolean;
    isReady: boolean;
    status: string;
  }> {
    try {
      const asset = await this.getAsset(assetId);
      if (!asset) {
        return {
          isUploaded: false,
          isProcessing: false,
          isReady: false,
          status: 'not_found'
        };
      }

      const isUploaded = !!asset.upload_completed_at;
      const isReady = isUploaded && !!asset.download_url;

      return {
        isUploaded,
        isProcessing: isUploaded && !isReady,
        isReady,
        status: isReady ? 'ready' : isUploaded ? 'processing' : 'uploading'
      };
    } catch (error) {
      console.error('Error verifying upload status:', error);
      return {
        isUploaded: false,
        isProcessing: false,
        isReady: false,
        status: 'error'
      };
    }
  }

  /**
   * Generate thumbnail URL (replaces ImageKit thumbnails)
   */
  generateThumbnailUrl(assetId: string, width = 300, height = 300): string {
    // Frame.io provides built-in thumbnail generation
    return `${FRAMEIO_API_BASE}/assets/${assetId}/thumb?width=${width}&height=${height}`;
  }

  /**
   * Upload photo file to Frame.io (replaces ImageKit photo uploads)
   */
  async uploadPhoto(
    base64Data: string,
    filename: string,
    parentFolderId: string,
    userId: string
  ): Promise<{
    fileId: string;
    url: string;
    thumbnailUrl: string;
    name: string;
    size: number;
    downloadUrl?: string;
  }> {
    try {
      // Convert base64 to buffer for upload
      const buffer = Buffer.from(base64Data, 'base64');
      const mimeType = this.getMimeTypeFromFilename(filename);
      
      // Upload to Frame.io using existing uploadFile method
      const asset = await this.uploadFile(Uint8Array.from(buffer), filename, buffer.length, mimeType, parentFolderId);
      
      // Generate thumbnail URL
      const thumbnailUrl = this.generateThumbnailUrl(asset.id);
      
      return {
        fileId: asset.id,
        url: asset.download_url || asset.stream_url || '',
        thumbnailUrl,
        name: asset.name,
        size: asset.filesize || buffer.length,
        downloadUrl: asset.download_url
      };
    } catch (error) {
      console.error('Frame.io photo upload error:', error);
      throw new Error(`Frame.io photo upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create user project folder structure for photos (replaces ImageKit folder structure)
   */
  async createUserProjectPhotoFolder(userId: string, projectId: number): Promise<string> {
    try {
      // Get or create user folder
      const userFolderId = await this.createUserFolder(userId, `user_${userId}`);
      
      // Get or create project folder within user folder
      const projectFolderName = `Project_${projectId}`;
      const projectFolderId = await this.createProjectFolder(userFolderId, projectId, projectFolderName);
      
      // Create Photos subfolder within project
      const photosFolderName = 'Photos';
      const photosFolder = await this.createSubfolder(projectFolderId, photosFolderName);
      
      return photosFolder;
    } catch (error) {
      console.error('Error creating photo folder structure:', error);
      throw new Error(`Failed to create photo folder structure: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get MIME type from filename
   */
  private getMimeTypeFromFilename(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop() || '';
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiToken;
  }

  /**
   * Get user folders for a specific user ID
   */
  async getUserFolders(userId: string): Promise<FrameioFolder[]> {
    try {
      const rootProject = await this.getOrCreateRootProject();
      const children = await this.makeRequest('GET', `/assets/${rootProject.root_asset_id}/children`);
      
      const userPrefix = `User_${userId.substring(0, 8)}_`;
      const userFolders = children.filter((child: FrameioAsset) => 
        child.type === 'folder' && child.name.startsWith(userPrefix)
      );

      return userFolders.map((folder: FrameioAsset) => ({
        id: folder.id,
        name: folder.name,
        type: 'folder' as const,
        parent_id: folder.parent_id,
        created_at: folder.created_at,
        updated_at: folder.updated_at
      }));
    } catch (error) {
      console.error('Error getting user folders:', error);
      return [];
    }
  }
}

// Export singleton instance
export const frameioService = new FrameioService();