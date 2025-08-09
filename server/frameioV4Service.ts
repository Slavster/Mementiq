import { FrameioAsset, FrameioFolder, FrameioProject } from '../shared/types.js';

/**
 * Frame.io V4 API Service with OAuth Authentication
 * 
 * This service handles Frame.io V4 API operations using OAuth tokens from Adobe Developer Console.
 * V4 accounts cannot use legacy v2 developer tokens - they require OAuth authentication.
 */
export class FrameioV4Service {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;

  // Expose getter for access token status (without revealing the token)
  get hasAccessToken(): boolean {
    return !!this.accessToken;
  }

  // Allow access to accessToken for route handlers (read-only)
  get accessToken(): string | null {
    return this.accessToken;
  }
  private workspaceId: string | null = null;
  private initialized: boolean = false;
  private baseUrl = 'https://api.frame.io/v4';

  constructor() {
    // V4 OAuth credentials from Adobe Developer Console
    this.clientId = process.env.ADOBE_CLIENT_ID || process.env.FRAMEIO_CLIENT_ID || '';
    this.clientSecret = process.env.ADOBE_CLIENT_SECRET || process.env.FRAMEIO_CLIENT_SECRET || '';
    
    console.log('Frame.io V4 Service initialization:');
    console.log(`Client ID configured: ${!!this.clientId}`);
    console.log(`Client Secret configured: ${!!this.clientSecret}`);
    
    if (!this.clientId || !this.clientSecret) {
      console.log('Frame.io V4 OAuth credentials not configured. Service available but operations will require authentication.');
    } else {
      console.log('Frame.io V4 OAuth credentials configured successfully');
    }
  }

  /**
   * Generate OAuth authorization URL for Frame.io V4
   */
  getAuthorizationUrl(redirectUri: string, state?: string): string {
    console.log('=== Frame.io V4 OAuth URL Generation ===');
    console.log(`Client ID: ${this.clientId}`);
    console.log(`Redirect URI: ${redirectUri}`);
    console.log(`State: ${state}`);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid,creative_sdk', // Adobe IMS scopes for Frame.io V4
    });

    if (state) {
      params.append('state', state);
    }

    // Frame.io V4 uses Adobe IMS OAuth endpoints
    const authUrl = `https://ims-na1.adobelogin.com/ims/authorize/v2?${params.toString()}`;
    console.log(`Generated V4 OAuth URL: ${authUrl}`);
    console.log('OAuth URL Parameters:');
    console.log(`  client_id: ${this.clientId}`);
    console.log(`  redirect_uri: ${redirectUri}`);
    console.log(`  response_type: code`);
    console.log(`  scope: offline_access frameio.read frameio.write`);
    console.log(`  state: ${state}`);
    
    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<void> {
    console.log('=== Exchanging OAuth Code for V4 Access Token ===');
    console.log(`Code: ${code.substring(0, 10)}...`);
    console.log(`Redirect URI: ${redirectUri}`);

    const tokenUrl = 'https://ims-na1.adobelogin.com/ims/token/v3';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`V4 Token exchange failed: ${response.status} - ${errorText}`);
      throw new Error(`Failed to exchange code for V4 token: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();
    this.accessToken = tokenData.access_token;
    
    console.log('=== V4 Token Exchange Successful ===');
    console.log(`Access token obtained: ${this.accessToken?.substring(0, 6)}...${this.accessToken?.substring(this.accessToken.length - 6)}`);
    console.log(`Token type: ${tokenData.token_type}`);
    console.log(`Expires in: ${tokenData.expires_in} seconds`);
  }

  /**
   * Set access token directly (for testing or stored tokens)
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
    console.log(`V4 Access token set: ${token.substring(0, 6)}...${token.substring(token.length - 6)}`);
  }

  /**
   * Initialize the service and get workspace information
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (!this.accessToken) {
      throw new Error('Access token required. Please complete OAuth flow first.');
    }

    try {
      console.log('=== Initializing Frame.io V4 Service ===');
      console.log(`Using access token: ${this.accessToken.substring(0, 6)}...${this.accessToken.substring(this.accessToken.length - 6)}`);
      
      // Get user information
      const userResponse = await this.makeRequest('GET', '/me');
      console.log(`User: ${userResponse.display_name} (${userResponse.email})`);
      
      // Get workspaces (V4 equivalent of teams)
      const workspacesResponse = await this.makeRequest('GET', '/workspaces');
      console.log(`Found ${workspacesResponse.data?.length || 0} workspaces`);
      
      if (workspacesResponse.data && workspacesResponse.data.length > 0) {
        this.workspaceId = workspacesResponse.data[0].id;
        console.log(`Using workspace: ${workspacesResponse.data[0].name} (${this.workspaceId})`);
      } else {
        throw new Error('No accessible workspaces found for V4 account');
      }
      
      console.log('=== Frame.io V4 Service Initialized ===');
      
    } catch (error) {
      console.error('=== Frame.io V4 Service Initialization Failed ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  /**
   * Make authenticated requests to Frame.io V4 API
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Access token required. Please complete OAuth flow first.');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`=== Frame.io V4 API Request ===`);
    console.log(`Method: ${method}`);
    console.log(`URL: ${url}`);
    console.log(`Access token fingerprint: ${this.accessToken.substring(0, 6)}...${this.accessToken.substring(this.accessToken.length - 6)}`);
    
    const options: any = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'X-Api-Key': this.clientId, // Frame.io V4 requires both Bearer token and API key
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
      console.log(`Request body:`, JSON.stringify(data, null, 2));
    }

    try {
      const response = await fetch(url, options);
      
      console.log(`=== Frame.io V4 API Response ===`);
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response body:`, errorText);
        throw new Error(`Frame.io V4 API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log(`Response data:`, JSON.stringify(responseData, null, 2));
      
      return responseData;
    } catch (error) {
      console.error(`=== Frame.io V4 API Error ===`);
      console.error(`URL: ${url}`);
      console.error(`Method: ${method}`);
      console.error(`Error:`, error);
      throw error;
    }
  }

  /**
   * Get or create user workspace root folder
   */
  async getOrCreateRootProject(): Promise<FrameioProject> {
    await this.initialize();

    if (!this.workspaceId) {
      throw new Error('No workspace available for project creation');
    }

    try {
      console.log('Getting V4 workspace projects...');
      const projectsResponse = await this.makeRequest('GET', `/workspaces/${this.workspaceId}/projects`);
      
      if (projectsResponse.data && projectsResponse.data.length > 0) {
        const existingProject = projectsResponse.data[0];
        console.log(`Using existing project: ${existingProject.name}`);
        
        return {
          id: existingProject.id,
          name: existingProject.name,
          description: existingProject.description || 'Frame.io V4 Project',
          root_asset_id: existingProject.root_asset_id,
          created_at: existingProject.created_at || new Date().toISOString(),
          updated_at: existingProject.updated_at || new Date().toISOString(),
        };
      } else {
        // Create new project in workspace
        console.log('Creating new V4 project...');
        const newProject = await this.makeRequest('POST', `/workspaces/${this.workspaceId}/projects`, {
          name: 'Mementiq Projects',
          description: 'Video editing project workspace'
        });
        
        return {
          id: newProject.id,
          name: newProject.name,
          description: newProject.description || 'Frame.io V4 Project',
          root_asset_id: newProject.root_asset_id,
          created_at: newProject.created_at || new Date().toISOString(),
          updated_at: newProject.updated_at || new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('Failed to get/create V4 root project:', error);
      throw error;
    }
  }

  /**
   * Create a folder in Frame.io V4
   */
  async createFolder(parentAssetId: string, folderName: string): Promise<FrameioFolder> {
    await this.initialize();

    try {
      console.log(`Creating V4 folder "${folderName}" under parent ${parentAssetId}`);
      
      const folderData = await this.makeRequest('POST', `/assets/${parentAssetId}/children`, {
        name: folderName,
        type: 'folder'
      });

      console.log(`V4 Folder created successfully: ${folderData.name} (${folderData.id})`);

      return {
        id: folderData.id,
        name: folderData.name,
        parent_id: parentAssetId,
        type: 'folder',
        created_at: folderData.created_at || new Date().toISOString(),
        updated_at: folderData.updated_at || new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to create V4 folder "${folderName}":`, error);
      throw error;
    }
  }

  /**
   * Generate review link for Frame.io V4 project
   */
  async createReviewLink(projectId: string, name: string): Promise<{ url: string; id: string }> {
    await this.initialize();

    try {
      console.log(`Creating V4 review link for project ${projectId}`);
      
      // V4 uses "shares" instead of review links
      const shareData = await this.makeRequest('POST', `/projects/${projectId}/shares`, {
        name: name,
        type: 'public',
        permissions: ['comment', 'download']
      });

      console.log(`V4 Share created: ${shareData.url}`);

      return {
        url: shareData.url,
        id: shareData.id
      };
    } catch (error) {
      console.error(`Failed to create V4 review link:`, error);
      throw error;
    }
  }

  /**
   * Upload file to Frame.io V4 folder
   */
  async uploadFile(folderId: string, file: Buffer, filename: string, mimeType: string): Promise<FrameioAsset> {
    await this.initialize();

    try {
      console.log(`Uploading "${filename}" to V4 folder ${folderId}`);
      
      // V4 uses different upload flow - get upload URL first
      const uploadData = await this.makeRequest('POST', `/assets/${folderId}/upload`, {
        name: filename,
        type: 'file',
        filesize: file.length
      });

      // Upload to the provided URL
      const uploadResponse = await fetch(uploadData.upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': mimeType
        }
      });

      if (!uploadResponse.ok) {
        throw new Error(`V4 Upload failed: ${uploadResponse.status}`);
      }

      console.log(`V4 File uploaded successfully: ${filename}`);

      return {
        id: uploadData.id,
        name: filename,
        type: 'file',
        parent_id: folderId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to upload "${filename}" to V4:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const frameioV4Service = new FrameioV4Service();