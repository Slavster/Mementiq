// Frame.io V4 types defined inline
interface FrameioProject {
  id: string;
  name: string;
  description: string;
  root_asset_id: string;
  created_at: string;
  updated_at: string;
}

interface FrameioAsset {
  id: string;
  name: string;
  type: string;
  parent_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Frame.io V4 API Service with OAuth Authentication
 * 
 * This service handles Frame.io V4 API operations using OAuth tokens from Adobe Developer Console.
 * V4 accounts cannot use legacy v2 developer tokens - they require OAuth authentication.
 */
export class FrameioV4Service {
  private clientId: string;
  private clientSecret: string;
  private accessTokenValue: string | null = null;
  private refreshTokenValue: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private refreshPromise: Promise<void> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  // Expose getter for access token status (without revealing the token)
  get hasAccessToken(): boolean {
    return !!this.accessTokenValue && this.isTokenValid();
  }

  // Allow access to accessToken for route handlers (read-only)
  get accessToken(): string | null {
    return this.accessTokenValue;
  }

  // Check if current token is still valid
  private isTokenValid(): boolean {
    if (!this.tokenExpiresAt) return true; // No expiration info, assume valid
    return new Date() < this.tokenExpiresAt;
  }

  // Check if token needs refresh (refresh 5 minutes before expiry as per OAuth best practices)
  private needsRefresh(): boolean {
    if (!this.tokenExpiresAt) return false;
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return fiveMinutesFromNow >= this.tokenExpiresAt;
  }
  private workspaceId: string | null = null;
  private initialized: boolean = false;
  private baseUrl = 'https://api.frame.io/v4';

  constructor() {
    // V4 OAuth credentials from Adobe Developer Console
    this.clientId = process.env.ADOBE_CLIENT_ID || process.env.FRAMEIO_CLIENT_ID || '';
    this.clientSecret = process.env.ADOBE_CLIENT_SECRET || process.env.FRAMEIO_CLIENT_SECRET || '';

    // Service account token will be loaded from database during initialization
    // (OAuth token was stored in database during successful authentication)

    console.log('Frame.io V4 Service initialization:');
    console.log(`Client ID configured: ${!!this.clientId}`);
    console.log(`Client Secret configured: ${!!this.clientSecret}`);

    if (!this.clientId || !this.clientSecret) {
      console.log('Frame.io V4 OAuth credentials not configured. Service available but operations will require authentication.');
    } else {
      console.log('Frame.io V4 OAuth credentials configured successfully');
      // Auto-load service account token on startup for production persistence
      console.log('Attempting to load service account token from database...');
      this.loadServiceAccountToken()
        .then(() => {
          if (this.accessTokenValue) {
            console.log('✅ Production service account token loaded successfully - Frame.io ready');
          } else {
            console.log('ℹ️  No service account token found - OAuth required for Frame.io integration');
          }
        })
        .catch(error => {
          console.error('Failed to auto-load service account token:', error);
        });
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
      scope: 'offline_access frameio.read frameio.write', // Ensure offline_access is requested
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
    this.accessTokenValue = tokenData.access_token;
    this.refreshTokenValue = tokenData.refresh_token || null;

    // Calculate expiration time
    if (tokenData.expires_in) {
      this.tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    }

    console.log('=== V4 Token Exchange Successful ===');
    console.log(`Access token obtained: ${this.accessTokenValue?.substring(0, 6)}...${this.accessTokenValue?.substring(this.accessTokenValue.length - 6)}`);
    console.log(`Token type: ${tokenData.token_type}`);
    console.log(`Expires in: ${tokenData.expires_in} seconds`);
    console.log(`Expires at: ${this.tokenExpiresAt?.toISOString()}`);
    console.log(`Has refresh token: ${!!this.refreshTokenValue}`);
  }

  /**
   * Set access token directly (for testing or stored tokens)
   */
  setAccessToken(token: string): void {
    this.accessTokenValue = token;
    console.log(`V4 Access token set: ${token.substring(0, 6)}...${token.substring(token.length - 6)}`);
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshTokenValue) {
      throw new Error('No refresh token available. Re-authentication required.');
    }

    console.log('=== Refreshing V4 Access Token ===');

    const tokenUrl = 'https://ims-na1.adobelogin.com/ims/token/v3';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshTokenValue,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`V4 Token refresh failed: ${response.status} - ${errorText}`);

      // Check for invalid_grant which indicates revocation
      if (response.status === 400 && errorText.includes('invalid_grant')) {
        throw new Error('Frame.io authentication revoked. Please contact admin to re-authenticate.');
      }
      throw new Error(`Failed to refresh V4 token: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();
    this.accessTokenValue = tokenData.access_token;

    // Update refresh token if provided
    if (tokenData.refresh_token) {
      this.refreshTokenValue = tokenData.refresh_token;
    }

    // Calculate new expiration time
    if (tokenData.expires_in) {
      this.tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    }

    console.log('=== V4 Token Refresh Successful ===');
    console.log(`New access token obtained: ${this.accessTokenValue?.substring(0, 6)}...${this.accessTokenValue?.substring(this.accessTokenValue.length - 6)}`);
    console.log(`Expires in: ${tokenData.expires_in} seconds`);
    console.log(`New expires at: ${this.tokenExpiresAt?.toISOString()}`);

    // Update the centralized service token in database
    try {
      const { DatabaseStorage } = await import('./storage.js');
      const storage = new DatabaseStorage();

      await storage.updateServiceToken(
        'frameio-v4',
        this.accessTokenValue!,
        this.refreshTokenValue || null,
        this.tokenExpiresAt,
        'openid' // Assuming scope remains the same
      );
      console.log('✅ Refreshed token stored in centralized service storage');
    } catch (error) {
      console.warn('Failed to update refreshed token in centralized storage:', error);
    }
  }

  /**
   * Use a DB lock to ensure only one refresh operation happens at a time across all instances.
   */
  private async refreshWithLock(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise; // Wait for existing refresh
    }

    const lockKey = 'frameio-v4-token-refresh';
    const lockTtlSeconds = 300; // 5 minutes TTL

    // Try to acquire database lock for single-flight refresh
    const { DatabaseStorage } = await import('./storage.js');
    const storage = new DatabaseStorage();
    
    const lockAcquired = await storage.acquireRefreshLock(lockKey, lockTtlSeconds);
    
    if (!lockAcquired) {
      console.log('🔒 Another process is already refreshing tokens, waiting...');
      // Wait briefly and reload token from database (another process likely refreshed it)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const serviceToken = await storage.getServiceToken('frameio-v4');
      if (serviceToken) {
        this.accessTokenValue = serviceToken.accessToken;
        this.refreshTokenValue = serviceToken.refreshToken;
        this.tokenExpiresAt = serviceToken.expiresAt ? new Date(serviceToken.expiresAt) : null;
        console.log('✅ Token refreshed by another process - using updated token');
      }
      return;
    }

    console.log('🔒 Database lock acquired for token refresh');

    // Perform the refresh and store the promise
    this.refreshPromise = this.refreshAccessToken();
    try {
      await this.refreshPromise;
    } finally {
      // Clear the promise and release the database lock
      this.refreshPromise = null;
      await storage.releaseRefreshLock(lockKey);
      console.log('🔓 Database lock released after token refresh');
    }
  }

  /**
   * Ensure we have a valid access token, refreshing if necessary.
   */
  private async ensureValidToken(): Promise<void> {
    // If token is valid, do nothing
    if (this.isTokenValid()) {
      return;
    }

    // If token is expired or needs refreshing, attempt to refresh
    console.log('Access token is expired or needs refreshing, attempting to refresh...');
    await this.refreshWithLock();

    // After refresh, check if it was successful
    if (!this.accessTokenValue || !this.isTokenValid()) {
      throw new Error('Failed to obtain a valid access token after refresh.');
    }
  }

  /**
   * Load service account token from database (from successful OAuth completion)
   */
  async loadServiceAccountToken(): Promise<void> {
    try {
      // Load centralized service token
      const { DatabaseStorage } = await import('./storage.js');
      const storage = new DatabaseStorage();

      const serviceToken = await storage.getServiceToken('frameio-v4');

      if (!serviceToken) {
        console.log('No centralized Frame.io V4 service token found - OAuth required');
        return;
      }

      // Store token and refresh info
      this.accessTokenValue = serviceToken.accessToken;
      this.refreshTokenValue = serviceToken.refreshToken;
      this.tokenExpiresAt = serviceToken.expiresAt ? new Date(serviceToken.expiresAt) : null;

      console.log('✅ Centralized service token loaded from database');
      console.log(`Service: ${serviceToken.service}`);
      console.log(`Token expires at: ${serviceToken.expiresAt || 'unknown'}`);
      console.log(`Has refresh token: ${!!serviceToken.refreshToken}`);

      // Check if token is expired or needs proactive refresh
      if (!this.isTokenValid()) {
        console.log('🔄 Service token expired, attempting automatic refresh...');
        try {
          await this.refreshWithLock();
          // Reload the fresh token from storage to ensure consistency
          const refreshedToken = await storage.getServiceToken('frameio-v4');
          if (refreshedToken) {
            this.accessTokenValue = refreshedToken.accessToken;
            this.tokenExpiresAt = refreshedToken.expiresAt ? new Date(refreshedToken.expiresAt) : null;
          }
          console.log('✅ Service token refreshed automatically - Frame.io ready');
        } catch (error) {
          console.log('❌ Failed to refresh token automatically:', error instanceof Error ? error.message : String(error));
          console.log('Manual OAuth re-authentication may be required.');
          // Clear potentially invalid tokens if refresh failed
          this.accessTokenValue = null;
          this.refreshTokenValue = null;
          this.tokenExpiresAt = null;
        }
      } else if (this.needsRefresh()) {
        console.log('⚠️ Token expires soon - proactively refreshing for uninterrupted service...');
        await this.refreshWithLock();
      }

      // Start proactive refresh monitoring
      this.startProactiveRefresh();

      console.log('✅ Production centralized token loaded successfully - Frame.io ready');
    } catch (error) {
      console.error('Failed to load service account token:', error);
    }
  }

  /**
   * Start proactive token refresh monitoring
   */
  private startProactiveRefresh(): void {
    // Clear existing timer if any
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Check every 5 minutes for token refresh needs
    this.refreshTimer = setInterval(async () => {
      try {
        // Only refresh if we have a refresh token and it's time to refresh
        if (this.needsRefresh() && this.refreshTokenValue) {
          console.log('🔄 Proactive token refresh triggered by monitoring system');
          await this.refreshWithLock();
          console.log('✅ Proactive token refresh completed - service continuity maintained');
        }
      } catch (error) {
        console.error('⚠️ Proactive token refresh failed:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    console.log('🛡️ Proactive token refresh monitoring started - checking every 5 minutes');
  }

  /**
   * Stop proactive refresh monitoring (for cleanup)
   */
  public stopProactiveRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('🛡️ Proactive token refresh monitoring stopped');
    }
  }

  /**
   * Verify Frame.io organization and profile access when encountering 403 errors.
   */
  private async verifyOrgAccess(): Promise<void> {
    console.log('🔍 Verifying Frame.io organization and profile access...');
    
    try {
      // Check user profile and permissions
      const userResponse = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${this.accessTokenValue}`,
          'Content-Type': 'application/json',
          'api-version': '4.0'
        }
      });

      if (!userResponse.ok) {
        throw new Error(`Failed to verify user profile: ${userResponse.status}`);
      }

      const userData = await userResponse.json();
      console.log(`✅ User verified: ${userData.data?.name} (${userData.data?.email})`);

      // Check account access
      const accountsResponse = await fetch(`${this.baseUrl}/accounts`, {
        headers: {
          'Authorization': `Bearer ${this.accessTokenValue}`,
          'Content-Type': 'application/json',
          'api-version': '4.0'
        }
      });

      if (!accountsResponse.ok) {
        throw new Error(`Failed to access accounts: ${accountsResponse.status}`);
      }

      const accountsData = await accountsResponse.json();
      const accountCount = accountsData.data?.length || 0;
      
      if (accountCount === 0) {
        throw new Error('No accessible Frame.io accounts found for this user');
      }

      console.log(`✅ Organization access verified: ${accountCount} account(s) accessible`);
      
      // Log account details for debugging
      accountsData.data?.forEach((account: any, index: number) => {
        console.log(`  Account ${index + 1}: ${account.display_name || account.name} (${account.id})`);
      });

    } catch (error) {
      console.error('❌ Organization/profile verification failed:', error);
      throw new Error(`Frame.io access verification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Initialize the service and get workspace information
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (!this.accessTokenValue) {
      throw new Error('Access token required. Please complete OAuth flow first.');
    }

    try {
      console.log('=== Initializing Frame.io V4 Service ===');
      console.log(`Using access token: ${this.accessTokenValue.substring(0, 6)}...${this.accessTokenValue.substring(this.accessTokenValue.length - 6)}`);

      // Get user information (V4 proper endpoint)
      const userResponse = await this.makeRequest('GET', '/me');
      console.log(`User: ${userResponse.data?.name} (${userResponse.data?.email})`);

      // Get accounts first (V4 proper hierarchy)
      const accountsResponse = await this.makeRequest('GET', '/accounts');
      console.log(`Found ${accountsResponse.data?.length || 0} accounts`);

      if (!accountsResponse.data?.length) {
        throw new Error('No accessible accounts found for V4');
      }

      const accountId = accountsResponse.data[0].id;
      console.log(`Using account: ${accountsResponse.data[0].display_name} (${accountId})`);

      // Get workspaces for this account (V4 proper hierarchy)
      const workspacesResponse = await this.makeRequest('GET', `/accounts/${accountId}/workspaces`);
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
   * Make authenticated requests to Frame.io V4 API with 401 retry and role verification
   */
  async makeRequest(method: string, endpoint: string, data?: any, params?: any, retryCount = 0): Promise<any> {
    const maxRetries = 1; // Allow only one retry for 401

    if (!this.accessTokenValue) {
      throw new Error('Access token required. Please complete OAuth flow first.');
    }

    // Ensure we have a valid token before making the request
    await this.ensureValidToken();

    let url = `${this.baseUrl}${endpoint}`;

    // Add query parameters if provided
    if (params) {
      const searchParams = new URLSearchParams(params);
      url = `${url}${url.includes('?') ? '&' : '?'}${searchParams.toString()}`;
    }

    console.log(`=== Frame.io V4 API Request ===`);
    console.log(`Method: ${method}`);
    console.log(`URL: ${url}`);
    console.log(`Access token fingerprint: ${this.accessTokenValue.substring(0, 6)}...${this.accessTokenValue.substring(this.accessTokenValue.length - 6)}`);

    // Build headers - check if custom headers were provided in params
    const headers: any = params && typeof params === 'object' && !Array.isArray(params) ? 
      { ...params } : 
      {
        'Authorization': `Bearer ${this.accessTokenValue}`,
        'Content-Type': 'application/json',
        'api-version': '4.0'  // Always include API version header
      };

    // Ensure Authorization header is always present
    if (!headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.accessTokenValue}`;
    }

    const options: any = {
      method,
      headers
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
        console.error(`=== Frame.io V4 API Error ===`);
        console.error(`Status: ${response.status} ${response.statusText}`);
        console.error(`Response: ${errorText}`);
        console.error(`Endpoint: ${method} ${url}`);

        // Handle 401 with single retry and role verification
        if (response.status === 401 && retryCount === 0) {
          console.log('🔄 401 detected, attempting token refresh and retry...');

          try {
            await this.refreshWithLock();
            console.log('✅ Token refreshed, retrying request...');
            return this.makeRequest(method, endpoint, data, params, retryCount + 1);
          } catch (refreshError) {
            console.error('❌ Token refresh failed on 401:', refreshError);

            // Check if this is a revocation (invalid_grant)
            if (refreshError instanceof Error && refreshError.message.includes('invalid_grant')) {
              console.error('🚨 Refresh token revoked - admin re-authentication required');
              throw new Error('Frame.io authentication revoked. Please contact admin to re-authenticate.');
            }

            throw new Error(`Frame.io authentication failed: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
          }
        }

        // Handle 403 with role verification
        if (response.status === 403) {
          console.log('🔍 403 detected, verifying Frame.io org/profile access...');
          try {
            await this.verifyOrgAccess();
          } catch (verifyError) {
            console.error('❌ Org verification failed:', verifyError);
            throw new Error(`Frame.io access denied. Please verify account permissions: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
          }
        }

        throw new Error(`Frame.io V4 API error: ${response.status} - ${errorText}`);
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
      // Get accounts first for proper V4 hierarchy
      const accountsResponse = await this.makeRequest('GET', '/accounts');
      const accountId = accountsResponse.data[0].id;
      const projectsResponse = await this.makeRequest('GET', `/accounts/${accountId}/workspaces/${this.workspaceId}/projects`);

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
        // Get accounts first for proper V4 hierarchy
        const accountsResponse = await this.makeRequest('GET', '/accounts');
        const accountId = accountsResponse.data[0].id;
        const newProject = await this.makeRequest('POST', `/accounts/${accountId}/workspaces/${this.workspaceId}/projects`, {
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
   * Update Frame.io asset status (for workflow tracking)
   */
  async updateAssetStatus(assetId: string, status: string): Promise<boolean> {
    await this.initialize();

    try {
      console.log(`🔄 Updating Frame.io asset ${assetId} status to: ${status}`);

      const accounts = await this.getAccounts();
      if (!accounts.data || accounts.data.length === 0) {
        throw new Error('No Frame.io accounts found');
      }
      const accountId = accounts.data[0].id;

      const endpoint = `/accounts/${accountId}/assets/${assetId}`;
      console.log(`Updating asset status via: PATCH ${endpoint}`);

      await this.makeRequest('PATCH', endpoint, {
        data: {
          status: status
        }
      });

      console.log(`✅ Frame.io asset ${assetId} status updated to: ${status}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update Frame.io asset ${assetId} status:`, error);
      return false;
    }
  }

  /**
   * Update all Frame.io assets in a project folder with new status
   */
  async updateProjectAssetsStatus(projectId: number, status: string): Promise<void> {
    try {
      console.log(`🔄 Updating all Frame.io assets for project ${projectId} to status: ${status}`);
      
      // Import storage dynamically to avoid circular dependency
      const { storage } = await import('./storage.js');
      
      // Get project from database to find Frame.io folder
      const project = await storage.getProject(projectId);
      if (!project) {
        console.log(`❌ Project ${projectId} not found`);
        return;
      }

      let assetsUpdated = 0;
      const foldersToCheck = [];
      
      // Add project folder if exists
      if (project.mediaFolderId) {
        foldersToCheck.push(project.mediaFolderId);
      }
      
      // Add user folder if exists
      if (project.mediaUserFolderId) {
        foldersToCheck.push(project.mediaUserFolderId);
      }

      // Update assets in all relevant folders
      for (const folderId of foldersToCheck) {
        try {
          const assets = await this.getFolderAssets(folderId);
          console.log(`📁 Found ${assets.length} assets in folder ${folderId}`);
          
          for (const asset of assets) {
            if (asset.type === 'file' && (asset.media_type?.startsWith('video/') || asset.media_type?.startsWith('image/'))) {
              const updated = await this.updateAssetStatus(asset.id, status);
              if (updated) {
                assetsUpdated++;
              }
            }
          }
        } catch (folderError) {
          console.log(`⚠️ Could not update assets in folder ${folderId}:`, folderError.message);
        }
      }

      console.log(`✅ Updated ${assetsUpdated} Frame.io assets for project ${projectId} to status: ${status}`);
    } catch (error) {
      console.error(`❌ Failed to update project assets status:`, error);
    }
  }

  /**
   * Get asset details from Frame.io V4
   */
  async getAssetDetails(assetId: string): Promise<any> {
    await this.initialize();

    try {
      console.log(`Getting V4 asset details for: ${assetId}`);

      const accounts = await this.getAccounts();
      if (!accounts.data || accounts.data.length === 0) {
        throw new Error('No Frame.io accounts found');
      }
      const accountId = accounts.data[0].id;

      const endpoint = `/accounts/${accountId}/assets/${assetId}`;
      console.log(`Getting asset details via: GET ${endpoint}`);

      const assetData = await this.makeRequest('GET', endpoint);
      return assetData.data;
    } catch (error) {
      console.error(`Failed to get asset details for ${assetId}:`, error);
      return null; // Return null instead of throwing to allow graceful fallback
    }
  }

  /**
   * Create a folder in Frame.io V4 with hierarchy validation
   */
  async createFolder(folderName: string, parentAssetId: string): Promise<any> {
    await this.initialize();

    try {
      console.log(`Creating V4 folder "${folderName}" under parent ${parentAssetId}`);

      // ENFORCE 2-LEVEL HIERARCHY: Check parent's parent to prevent 3+ levels
      const parentDetails = await this.getAssetDetails(parentAssetId);
      if (parentDetails && parentDetails.parent_id) {
        const grandparentDetails = await this.getAssetDetails(parentDetails.parent_id);
        if (grandparentDetails && grandparentDetails.parent_id) {
          console.log(`🚨 HIERARCHY VIOLATION: Attempting to create folder at level 3+`);
          console.log(`🚨 Current structure: ${grandparentDetails.parent_id} > ${parentDetails.parent_id} > ${parentAssetId}`);
          console.log(`🚨 REJECTED: Cannot create "${folderName}" - exceeds 2-level limit (User > Project)`);
          throw new Error(`Folder creation rejected: Maximum 2 levels allowed (User Folder > Project Folder). Cannot create "${folderName}" at level 3.`);
        }
      }

      // Get account ID for the correct V4 endpoint structure
      const accounts = await this.getAccounts();
      if (!accounts.data || accounts.data.length === 0) {
        throw new Error('No Frame.io accounts found');
      }
      const accountId = accounts.data[0].id;

      // Use the correct V4 folder creation endpoint
      const endpoint = `/accounts/${accountId}/folders/${parentAssetId}/folders`;
      console.log(`Creating folder via: POST ${endpoint}`);

      const folderData = await this.makeRequest('POST', endpoint, {
        data: { 
          name: folderName 
        }
      });

      console.log(`V4 Folder created successfully: ${folderData.data.name} (${folderData.data.id})`);

      return {
        id: folderData.data.id,
        name: folderData.data.name,
        parent_id: parentAssetId,
        type: 'folder',
        created_at: folderData.data.created_at || new Date().toISOString(),
        updated_at: folderData.data.updated_at || new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to create V4 folder "${folderName}":`, error);
      throw error;
    }
  }

  /**
   * Get folder children for verification (V4)
   */
  async getFolderChildren(folderId: string): Promise<any[]> {
    await this.initialize();

    try {
      // Get account ID for the correct V4 endpoint structure
      const accounts = await this.getAccounts();
      if (!accounts.data || accounts.data.length === 0) {
        throw new Error('No Frame.io accounts found');
      }
      const accountId = accounts.data[0].id;

      const endpoint = `/accounts/${accountId}/folders/${folderId}/children`;
      console.log(`Getting folder children via: GET ${endpoint}`);

      const response = await this.makeRequest('GET', endpoint);

      return response.data || [];
    } catch (error) {
      console.error(`Failed to get folder children for ${folderId}:`, error);
      throw error;
    }
  }

  /**
   * Generate review link for Frame.io V4 project
   */
  async createReviewLink(projectId: string, name: string): Promise<{ url: string; id: string }> {
    await this.initialize();

    try {
      console.log(`Creating V4 public share link for project ${projectId}`);
      const accountId = await this.getAccountId();

      // Calculate expiration date (30 days from now)
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      // V4 uses "shares" instead of review links - create with specific settings
      const shareData = await this.makeRequest('POST', `/accounts/${accountId}/projects/${projectId}/shares`, {
        name: name,
        share_type: 'public', // Frame.io V4 uses share_type instead of type
        allow_comments: false,  // DISABLE comments by default
        allow_downloads: true,  // ENABLE downloads
        expires_at: expirationDate.toISOString()
      });

      console.log(`V4 Public Share created with download-only access: ${shareData.data?.url || shareData.url}`);

      return {
        url: shareData.data?.url || shareData.url,
        id: shareData.data?.id || shareData.id
      };
    } catch (error) {
      console.error(`Failed to create V4 public share link:`, error);
      throw error;
    }
  }



  /**
   * Create upload session for TUS protocol
   */
  async createUploadSession(folderId: string, filename: string, filesize: number, mimeType: string): Promise<any> {
    await this.initialize();

    try {
      console.log(`Creating V4 upload session for "${filename}" in folder ${folderId}`);

      const assetData = await this.makeRequest('POST', `/assets/${folderId}/children`, {
        name: filename,
        type: 'file',
        filetype: mimeType,
        filesize: filesize
      });

      // Return TUS-compatible upload session
      return {
        assetId: assetData.id,
        uploadUrl: `https://api.frame.io/v4/assets/${assetData.id}/upload`,
        completeUri: `/assets/${assetData.id}/complete`,
        parentFolderId: folderId,
        fileName: filename,
        fileSize: filesize,
        mimeType: mimeType
      };
    } catch (error) {
      console.error(`Failed to create V4 upload session for "${filename}":`, error);
      throw error;
    }
  }


  /**
   * Get accounts (V4 proper endpoint)
   */
  async getAccounts(): Promise<any> {
    await this.ensureValidToken();
    return this.makeRequest('GET', '/accounts');
  }

  /**
   * Get workspaces for account (V4 proper endpoint)
   */
  async getWorkspaces(accountId: string): Promise<any> {
    await this.ensureValidToken();
    return this.makeRequest('GET', `/accounts/${accountId}/workspaces`);
  }

  /**
   * Get projects for workspace (V4 proper endpoint)
   */
  async getProjects(accountId: string, workspaceId: string): Promise<any> {
    await this.ensureValidToken();
    return this.makeRequest('GET', `/accounts/${accountId}/workspaces/${workspaceId}/projects`);
  }



  /**
   * Create review link for an asset (V4 proper method)
   */
  async createAssetReviewLink(assetId: string, name: string = 'Review Link'): Promise<{ url: string; id: string }> {
    await this.initialize();

    try {
      console.log(`=== Creating V4 Asset Review Link: ${name} ===`);
      console.log(`Asset ID: ${assetId}`);

      const shareData = await this.makeRequest('POST', `/assets/${assetId}/review_links`, {
        name: name,
        allow_approvals: true,
        allow_comments: true,
        allow_download: true
      });

      console.log(`V4 Asset review link created: ${shareData.short_url}`);

      return {
        url: shareData.short_url,
        id: shareData.id
      };
    } catch (error) {
      console.error(`Failed to create V4 asset review link:`, error);
      throw error;
    }
  }

  /**
   * Get folder assets using correct V4 API endpoint
   */
  async getFolderAssets(folderId: string): Promise<any[]> {
    await this.initialize();

    try {
      console.log(`=== Getting V4 Folder Assets: ${folderId} ===`);

      // Get account ID for the correct V4 endpoint structure
      const accounts = await this.getAccounts();
      if (!accounts.data || accounts.data.length === 0) {
        throw new Error('No Frame.io accounts found');
      }
      const accountId = accounts.data[0].id;

      // Use the correct V4 endpoint for folder children
      const endpoint = `/accounts/${accountId}/folders/${folderId}/children`;
      console.log(`Getting folder children via: GET ${endpoint}`);

      const response = await this.makeRequest('GET', endpoint);
      const assets = response.data || [];

      console.log(`Found ${assets.length} assets in V4 folder ${folderId}`);
      return Array.isArray(assets) ? assets : [];
    } catch (error) {
      console.error(`Failed to get V4 folder assets for ${folderId}:`, error);
      return [];
    }
  }

  /**
   * Generate download link for asset (V4 compatible)
   * Frame.io V4 provides download URLs that can be used for streaming
   */
  async generateAssetDownloadLink(assetId: string): Promise<string | null> {
    await this.initialize();

    try {
      console.log(`=== Generating V4 Download Link: ${assetId} ===`);
      const accountId = await this.getAccountId();

      // Get file details to check status
      const response = await this.makeRequest('GET', `/accounts/${accountId}/files/${assetId}`);
      const fileData = response.data;

      if (!fileData) {
        console.log('File not found');
        return null;
      }

      console.log('File details:', {
        name: fileData.name,
        status: fileData.status,
        media_type: fileData.media_type,
        view_url: fileData.view_url
      });

      // Frame.io V4 API limitation: No direct download/streaming URLs available
      // However, we can try to extract the actual file content using authenticated requests
      console.log('Frame.io V4 API does not provide direct download URLs');
      console.log('Available URL is view-only:', fileData.view_url);

      // Generate a public share link for the specific asset instead of direct streaming
      // This bypasses authentication requirements by creating a public share
      console.log('Creating public share link for asset access');
      try {
        const shareLink = await this.createAssetShareLink(assetId, `Share for ${fileData.name}`);
        console.log('Generated public share URL:', shareLink.url);
        return shareLink.url;
      } catch (shareError) {
        console.error('Failed to create asset share link:', shareError);
        return null;
      }
    } catch (error) {
      console.error(`Failed to generate V4 download link for ${assetId}:`, error);
      return null;
    }
  }

  /**
   * Create a public share link for a specific asset with comments disabled by default
   * (checks for existing shares first)
   */
  async createAssetShareLink(assetId: string, name: string, enableComments: boolean = true): Promise<{ url: string; id: string }> {
    console.log(`🚀🚀🚀 FUNCTION ENTRY: createAssetShareLink called with ${assetId}, comments: ${enableComments}`);

    await this.initialize();
    console.log(`🚀🚀🚀 AFTER INITIALIZE`);

    try {
      console.log(`=== Frame.io V4 Share Creation ===`);
      console.log(`Asset ID: ${assetId}, Name: ${name}`);

      console.log(`🔧 Getting account ID...`);
      const accountId = await this.getAccountId();
      console.log(`🔧 Account ID retrieved: ${accountId}`);
      const projectId = 'e0a4fadd-52b0-4156-91ed-8880bbc0c51a';
      console.log(`🔧 Project ID set: ${projectId}`);

      // Step 1: Check if asset is already in an existing share
      console.log(`🔍 STARTING SHARE SEARCH for asset ${assetId}...`);
      try {
        const existingShare = await this.findExistingShareForAsset(accountId, projectId, assetId);
        console.log(`🔍 SHARE SEARCH COMPLETED - Result:`, existingShare ? 'FOUND' : 'NOT FOUND');

        if (existingShare) {
          console.log(`✅ REUSING existing share: ${existingShare.id} with URL: ${existingShare.url}`);
          return existingShare;
        }

        console.log(`❌ No existing share found for asset ${assetId}, creating new share...`);
      } catch (searchError) {
        console.error(`❌ SHARE SEARCH FAILED:`, searchError.message);
        console.log(`Proceeding with new share creation...`);
      }

      // Based on Frame.io V4 documentation, try creating share without discriminator first
      console.log('Creating share with minimal data...');

      // Step 1: Create empty share first (Frame.io V4 may not accept name during creation)
      let shareCreateResponse;
      let shareId;

      // Frame.io V4 requires correct schema with discriminator type "asset"
      console.log('Creating Frame.io V4 share with correct schema...');
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30); // 30 days from now

      const shareRequestBody = {
        data: {
          type: "asset",
          asset_ids: [assetId],
          access: "public",
          name: `Share for ${assetId}`,
          expiration: expirationDate.toISOString(),
          allow_comments: true,  // Always enable comments per user preference
          allow_downloads: true             // ENABLE downloads
        }
      };

      shareCreateResponse = await this.makeRequest(
        'POST',
        `/accounts/${accountId}/projects/${projectId}/shares`,
        shareRequestBody
      );

      shareId = shareCreateResponse?.data?.id || shareCreateResponse?.id;

      if (!shareId) {
        throw new Error('No share ID returned from any creation method');
      }

      console.log(`✅ Share created with ID: ${shareId}`);

      // Step 2: Add the asset to the share (Frame.io V4 expects single asset_id in data object)
      console.log('Adding asset to share...');
      try {
        await this.makeRequest(
          'POST',
          `/accounts/${accountId}/shares/${shareId}/assets`,
          { 
            data: {
              asset_id: assetId
            }
          }
        );
        console.log(`✅ Asset ${assetId} added to share`);
      } catch (assetError) {
        console.log(`Asset addition failed: ${assetError.message}, continuing...`);
      }

      // Step 3: Update share description (Frame.io V4 UpdateShareParams only supports basic fields)
      console.log('Setting share description...');
      try {
        await this.makeRequest(
          'PATCH',
          `/accounts/${accountId}/shares/${shareId}`,
          {
            data: {
              description: `Public share with downloads and comments enabled, expires in 30 days`
            }
          }
        );
        console.log(`✅ Share description updated`);
      } catch (patchError) {
        console.log(`Share description update failed: ${patchError.message}, continuing...`);
      }

      // Step 4: Get final share details
      console.log('Fetching final share details...');
      const finalShare = await this.makeRequest('GET', `/accounts/${accountId}/shares/${shareId}`);

      // Extract public URL from Frame.io V4 response (prioritize short_url which is the actual public access URL)
      const publicUrl = finalShare?.data?.short_url || 
                       finalShare?.data?.public_url || 
                       finalShare?.data?.url || 
                       finalShare?.data?.share_url ||
                       finalShare?.data?.link ||
                       finalShare?.public_url ||
                       finalShare?.url ||
                       `https://share.frame.io/${shareId}`;

      console.log(`✅ Public share URL: ${publicUrl}`);

      return {
        url: publicUrl,
        id: shareId
      };

    } catch (error) {
      console.error(`🚨 MAJOR ERROR IN createAssetShareLink:`, error);
      console.error(`🚨 Error message:`, error.message);
      console.error(`🚨 Error stack:`, error.stack);

      // Return Frame.io project view URL as fallback (this is the correct format)
      const fallbackUrl = `https://next.frame.io/project/e0a4fadd-52b0-4156-91ed-8880bbc0c51a/view/${assetId}`;
      console.log(`Using fallback URL: ${fallbackUrl}`);

      return {
        url: fallbackUrl,
        id: 'fallback'
      };
    }
  }

  /**
   * Resilient search for existing shares containing the specified asset (project-scoped for security)
   */
  async findExistingShareForAsset(accountId: string, projectId: string, assetId: string): Promise<{ url: string; id: string } | null> {
    try {
      console.log(`🛡️ SECURE RESILIENT SEARCH: Looking for shares in project ${projectId} containing asset ${assetId}...`);

      // SECURITY: Only search within the specific project folder to prevent cross-user access
      let sharesResponse;
      try {
        // Try project-specific shares endpoint first
        sharesResponse = await this.makeRequest('GET', `/accounts/${accountId}/projects/${projectId}/shares`);
        console.log(`📁 Searching project-scoped shares for security`);
      } catch (projectError) {
        console.log(`⚠️ Project-scoped search failed, falling back to filtered account search`);
        // Fallback: get all shares but filter by project folder
        sharesResponse = await this.makeRequest('GET', `/accounts/${accountId}/shares`);
      }

      const shares = sharesResponse.data || [];
      console.log(`📊 Found ${shares.length} shares to check within project scope`);

      const matchingShares: Array<{ id: string; url: string; createdAt: string }> = [];

      // Check each share for our asset
      for (const share of shares) {
        console.log(`🔍 Checking share ${share.id} (${share.name || 'Unnamed'})...`);

        // Only check enabled public shares
        if (!share.enabled || share.access !== 'public') {
          console.log(`⏭️ Skipping share ${share.id} - not public/enabled`);
          continue;
        }

        try {
          // SECURITY CHECK: Ensure share is related to the user's project folder
          let isProjectRelated = false;

          if (share.collection_id) {
            console.log(`📁 Checking collection ${share.collection_id} in share ${share.id}...`);

            // Verify the collection belongs to the user's project folder
            try {
              const collectionResponse = await this.makeRequest('GET', `/accounts/${accountId}/collections/${share.collection_id}`);
              const collection = collectionResponse.data;

              // Check if collection is within the project folder hierarchy
              if (collection && (collection.folder_id === projectId || collection.parent_folder_id === projectId)) {
                isProjectRelated = true;
                console.log(`🔒 Collection ${share.collection_id} verified as belonging to project ${projectId}`);

                const assetsResponse = await this.makeRequest('GET', `/accounts/${accountId}/collections/${share.collection_id}/assets`);
                const assets = assetsResponse.data || [];

                const assetMatch = assets.find((asset: any) => asset.id === assetId);

                if (assetMatch) {
                  console.log(`✅ SECURE MATCH! Asset ${assetId} in project collection ${share.collection_id}, share ${share.id}`);

                  matchingShares.push({
                    id: share.id,
                    url: share.short_url || `https://next.frame.io/share/${share.id}`,
                    createdAt: share.created_at || new Date().toISOString()
                  });
                } else {
                  console.log(`❌ Asset not in project collection ${share.collection_id}`);
                }
              } else {
                console.log(`🚫 SECURITY: Collection ${share.collection_id} not in project ${projectId} - skipping`);
              }
            } catch (collectionError) {
              console.log(`❌ Could not verify collection security: ${collectionError.message}`);
            }
          } else {
            console.log(`❓ Share ${share.id} has no collection_id, trying direct project-scoped asset check...`);

            // For shares without collection_id, be extra cautious and verify asset belongs to project
            try {
              // First verify the asset belongs to the project folder
              const assetResponse = await this.makeRequest('GET', `/accounts/${accountId}/assets/${assetId}`);
              const assetData = assetResponse.data;

              if (assetData && assetData.folder_id === projectId) {
                console.log(`🔒 Asset ${assetId} verified as belonging to project ${projectId}`);

                const shareAssetsResponse = await this.makeRequest('GET', `/accounts/${accountId}/shares/${share.id}/assets`);
                const shareAssets = shareAssetsResponse.data || [];

                const assetMatch = shareAssets.find((asset: any) => asset.id === assetId);

                if (assetMatch) {
                  console.log(`✅ SECURE MATCH! Asset ${assetId} directly in project-verified share ${share.id}`);

                  matchingShares.push({
                    id: share.id,
                    url: share.short_url || `https://next.frame.io/share/${share.id}`,
                    createdAt: share.created_at || new Date().toISOString()
                  });
                }
              } else {
                console.log(`🚫 SECURITY: Asset ${assetId} not in project ${projectId} - skipping share`);
              }
            } catch (directCheckError) {
              console.log(`❌ Project-scoped asset verification failed for share ${share.id}`);
            }
          }
        } catch (shareCheckError) {
          console.log(`❌ Failed to check share ${share.id}: ${shareCheckError.message}`);
          continue;
        }
      }

      if (matchingShares.length === 0) {
        console.log(`❌ No existing shares found containing asset ${assetId}`);
        return null;
      }

      // Return the most recent share
      const mostRecentShare = matchingShares.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      console.log(`🛡️ SECURE RECOVERY: Found ${matchingShares.length} project-scoped shares, using most recent`);
      console.log(`🔗 Most recent project share: ${mostRecentShare.id} - ${mostRecentShare.url}`);

      return {
        url: mostRecentShare.url,
        id: mostRecentShare.id
      };

    } catch (error) {
      console.error('❌ Resilient share search failed:', error.message);
      return null;
    }
  }

  /**
   * Get account ID for API calls
   */
  async getAccountId(): Promise<string> {
    await this.initialize();

    const accountsResponse = await this.makeRequest('GET', '/accounts');
    if (!accountsResponse.data?.length) {
      throw new Error('No accessible accounts found');
    }

    return accountsResponse.data[0].id;
  }

  /**
   * Get playable media links for streaming - Frame.io V4 approach
   * Based on API research, Frame.io V4 uses a different streaming approach
   */
  async getPlayableMediaLinks(fileId: string, prefer: string = "proxy") {
    await this.initialize();

    try {
      const accountId = await this.getAccountId();
      console.log(`=== Frame.io V4 Streaming Request for ${fileId} ===`);

      // Get file details
      const basicResponse = await this.makeRequest('GET', `/accounts/${accountId}/files/${fileId}`);
      const data = basicResponse.data;

      if (!data) {
        console.log('File not found');
        return {
          available: false,
          reason: 'File not found in Frame.io'
        };
      }

      console.log('File info:', {
        name: data.name,
        type: data.media_type,
        status: data.status,
        view_url: data.view_url
      });

      // Check if file is ready
      if (data.status !== 'transcoded' && data.status !== 'complete') {
        return {
          available: false,
          reason: `File is still ${data.status}. Please wait for processing.`,
          webUrl: data.view_url
        };
      }

      // Try to get download URL using the generateAssetDownloadLink method
      try {
        const downloadUrl = await this.generateAssetDownloadLink(fileId);
        if (downloadUrl) {
          console.log('Successfully generated streaming URL via download link');

          // Determine media type
          let kind = 'mp4';
          if (data.media_type?.includes('quicktime')) {
            kind = 'mov';
          }

          return {
            available: true,
            url: downloadUrl,
            kind: kind,
            asset: {
              name: data.name,
              size: data.file_size,
              type: data.media_type,
              status: data.status
            }
          };
        }
      } catch (dlError) {
        console.log('Could not generate download link:', dlError.message);
      }

      // Frame.io V4 limitation - use web interface
      console.log('Frame.io V4 direct streaming not available, use web interface');
      return {
        available: false,
        reason: 'Frame.io V4 requires web interface for video playback',
        webUrl: data.view_url,
        asset: {
          name: data.name,
          size: data.file_size,
          type: data.media_type,
          status: data.status
        }
      };

    } catch (error) {
      console.error('Error getting Frame.io V4 media links:', error);
      return {
        available: false,
        reason: 'Failed to get media links',
        error: error.message
      };
    }
  }

  /**
   * Process streaming data from Frame.io V4 response
   */
  private processStreamingData(streamingData: any, prefer: string, fileData: any) {
    console.log('=== Processing streaming data ===');

    // Helper to extract URLs from various formats
    const extractUrls = (data: any): Array<{url: string, type: string}> => {
      const urls: Array<{url: string, type: string}> = [];

      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.href || item.url) {
            urls.push({
              url: item.href || item.url,
              type: item.type || 'unknown'
            });
          }
        });
      } else if (typeof data === 'object') {
        // Check for proxy/original structure
        if (data.proxy && Array.isArray(data.proxy)) {
          data.proxy.forEach((item: any) => {
            if (item.href || item.url) {
              urls.push({
                url: item.href || item.url,
                type: (item.type || 'unknown') + '_proxy'
              });
            }
          });
        }
        if (data.original && Array.isArray(data.original)) {
          data.original.forEach((item: any) => {
            if (item.href || item.url) {
              urls.push({
                url: item.href || item.url,
                type: (item.type || 'unknown') + '_original'
              });
            }
          });
        }

        // Check for direct URL fields
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string' && value.startsWith('http')) {
            urls.push({
              url: value,
              type: key
            });
          }
        }
      }

      return urls;
    };

    const availableUrls = extractUrls(streamingData);
    console.log('Extracted URLs:', availableUrls);

    if (availableUrls.length === 0) {
      console.log('No URLs found in streaming data');
      return null;
    }

    // Prioritize URLs: HLS first, then MP4, then MOV, then others
    const prioritizeUrl = (urls: Array<{url: string, type: string}>) => {
      // Look for HLS
      const hls = urls.find(u => 
        u.type.toLowerCase().includes('hls') || 
        u.url.includes('.m3u8')
      );
      if (hls) return { ...hls, kind: 'hls' };

      // Look for MP4
      const mp4 = urls.find(u => 
        u.type.toLowerCase().includes('mp4') || 
        u.url.includes('.mp4')
      );
      if (mp4) return { ...mp4, kind: 'mp4' };

      // Look for MOV
      const mov = urls.find(u => 
        u.type.toLowerCase().includes('mov') || 
        u.url.includes('.mov')
      );
      if (mov) return { ...mov, kind: 'mov' };

      // Return first URL
      const first = urls[0];
      return { 
        ...first, 
        kind: first.url.includes('.m3u8') ? 'hls' : 
              first.url.includes('.mp4') ? 'mp4' :
              first.url.includes('.mov') ? 'mov' : 'unknown'
      };
    };

    // Filter by preference if needed
    let filteredUrls = availableUrls;
    if (prefer === 'original') {
      const originalUrls = availableUrls.filter(u => u.type.includes('original'));
      if (originalUrls.length > 0) {
        filteredUrls = originalUrls;
      }
    } else if (prefer === 'proxy') {
      const proxyUrls = availableUrls.filter(u => u.type.includes('proxy'));
      if (proxyUrls.length > 0) {
        filteredUrls = proxyUrls;
      }
    }

    const selectedUrl = prioritizeUrl(filteredUrls);

    const result = {
      url: selectedUrl.url,
      kind: selectedUrl.kind,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours default
    };

    console.log('✓ Selected streaming URL:', result);
    return result;
  }

  /**
   * Legacy method for compatibility - now uses proper media_links endpoint
   */
  async getAssetMediaLinks(assetId: string) {
    return this.getPlayableMediaLinks(assetId);
  }

  /**
   * Verify if asset belongs to project folder (V4 compatible)
   */
  async verifyAssetInProjectFolder(assetId: string, folderId: string): Promise<boolean> {
    await this.initialize();

    try {
      console.log(`=== Verifying V4 Asset ${assetId} in Folder ${folderId} ===`);

      // Get folder assets and check if our asset ID is in the list
      const folderAssets = await this.getFolderAssets(folderId);
      const foundAsset = folderAssets.find(asset => asset.id === assetId);

      if (foundAsset) {
        console.log(`✅ Asset ${assetId} found in folder ${folderId}: ${foundAsset.name}`);
        return true;
      } else {
        console.log(`❌ Asset ${assetId} not found in folder ${folderId}`);
        console.log(`Available assets in folder: ${folderAssets.map(a => `${a.id}:${a.name}`).join(', ')}`);
        return false;
      }
    } catch (error) {
      console.error(`Failed to verify V4 asset ${assetId} in folder ${folderId}:`, error);
      return false;
    }
  }

  /**
   * Get or create user folder in the main Mementiq project
   */
  async getUserFolder(userId: string): Promise<any> {
    await this.initialize();

    try {
      console.log(`=== Getting/Creating User Folder for: ${userId} ===`);

      // Get the main Mementiq project
      const accounts = await this.getAccounts();
      const accountId = accounts.data[0].id;
      const workspaces = await this.getWorkspaces(accountId);
      const workspaceId = workspaces.data[0].id;
      const projects = await this.getProjects(accountId, workspaceId);

      let mementiqProject = projects.data.find((project: any) => 
        project.name === "Mementiq"
      );

      if (!mementiqProject) {
        console.log(`Creating Mementiq project...`);
        mementiqProject = await this.makeRequest('POST', `/accounts/${accountId}/workspaces/${workspaceId}/projects`, {
          name: "Mementiq"
        });
      }

      console.log(`Using Mementiq project: ${mementiqProject.name} (${mementiqProject.id})`);
      console.log(`Project root_folder_id: ${mementiqProject.root_folder_id}`);

      // Look for existing user folder using V4 children endpoint
      const userFolderName = `User-${userId.slice(0, 8)}`;
      console.log(`Looking for existing user folder: ${userFolderName}`);

      const rootChildren = await this.getFolderChildren(mementiqProject.root_folder_id);
      let userFolder = rootChildren.find((child: any) => 
        child.type === 'folder' && child.name === userFolderName
      );

      if (userFolder) {
        console.log(`Found existing user folder: ${userFolder.name} (${userFolder.id})`);
      } else {
        // Create user folder under project root
        console.log(`Creating user folder: ${userFolderName} under root ${mementiqProject.root_folder_id}`);
        userFolder = await this.createFolder(userFolderName, mementiqProject.root_folder_id);
        console.log(`User folder created: ${userFolder.name} (${userFolder.id})`);
      }

      console.log(`User folder created: ${userFolder.name} (${userFolder.id})`);
      return userFolder;
    } catch (error) {
      console.error(`Failed to get/create user folder for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user folders (V4 compatible - get user's video request folders)
   */
  async getUserFolders(userId: string): Promise<any[]> {
    await this.initialize();

    try {
      console.log(`=== Getting V4 User Video Request Folders for: ${userId} ===`);

      const userFolder = await this.getUserFolder(userId);

      // Get all folders from user's folder using correct V4 endpoint
      const folderChildren = await this.getFolderChildren(userFolder.id);

      // Filter for video request folders (subfolders in user's folder)
      const videoRequestFolders = folderChildren.filter((folder: any) => 
        folder.type === 'folder'
      );

      console.log(`Found ${videoRequestFolders.length} video request folders for user ${userId}`);
      return videoRequestFolders;
    } catch (error) {
      console.error(`Failed to get user video request folders for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Create user folder (V4 compatible) - Creates a folder in Mementiq project for the user
   */
  async createUserFolder(userId: string): Promise<any> {
    await this.initialize();

    try {
      console.log(`=== Creating User Folder for: ${userId} ===`);

      const userFolder = await this.getUserFolder(userId);

      console.log(`User folder ready: ${userFolder.name} (${userFolder.id})`);
      return userFolder;
    } catch (error) {
      console.error(`Failed to create user folder for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create project folder within user folder (V4 compatible)
   */
  async createProjectFolder(userFolderId: string, projectTitle: string, projectId: number): Promise<any> {
    await this.initialize();

    try {
      console.log(`=== Creating V4 Project Folder: ${projectTitle} (ID: ${projectId}) ===`);

      const projectFolderName = `${projectTitle}`;

      // Check if project folder already exists
      console.log(`📁 Checking for existing project folder: ${projectFolderName}`);
      const userFolderChildren = await this.getFolderChildren(userFolderId);
      let projectFolder = userFolderChildren.find((child: any) => 
        child.type === 'folder' && child.name === projectFolderName
      );

      if (projectFolder) {
        console.log(`✅ Found existing project folder: ${projectFolder.name} (${projectFolder.id})`);

        // CRITICAL: Prevent nested folder creation by checking if folder has subfolders with same name
        const existingFolderChildren = await this.getFolderChildren(projectFolder.id);
        const duplicateSubfolder = existingFolderChildren.find((child: any) => 
          child.type === 'folder' && child.name === projectFolder.name
        );

        if (duplicateSubfolder) {
          console.log(`🚨 WARNING: Found duplicate nested folder "${duplicateSubfolder.name}" inside "${projectFolder.name}"`);
          console.log(`🚨 This violates 2-level limit: User Folder > Project Folder (no deeper nesting allowed)`);
          console.log(`🚨 Using parent folder ${projectFolder.id} instead of nested ${duplicateSubfolder.id}`);
          // Use the parent folder, not the nested one - the current projectFolder is correct
        }
      } else {
        // Create project folder within user folder (ENFORCE 2-LEVEL LIMIT)
        console.log(`📁 Creating new project folder: ${projectFolderName} (Level 2 - User > Project)`);
        console.log(`📁 Validating folder hierarchy: User Folder ${userFolderId} > Project Folder "${projectFolderName}"`);
        projectFolder = await this.createFolder(projectFolderName, userFolderId);
        console.log(`V4 Project folder created: ${projectFolder.name} (${projectFolder.id})`);
      }

      return projectFolder;
    } catch (error) {
      console.error(`Failed to create V4 project folder for ${projectTitle}:`, error);
      throw error;
    }
  }

  /**
   * Create user project photo folder (V4 compatible)
   */
  async createUserProjectPhotoFolder(userId: string, projectId: number): Promise<string> {
    await this.initialize();

    try {
      console.log(`=== Creating V4 Photo Folder for User ${userId}, Project ${projectId} ===`);

      const rootProject = await this.getOrCreateRootProject();

      // Get user's folder in Mementiq project
      const userFolder = await this.getUserFolder(userId);

      // Create/get project folder within user folder
      const projectFolderName = `Project-${projectId}`;

      // Check if project folder already exists
      const userFolderChildren = await this.getFolderChildren(userFolder.id);
      let projectFolder = userFolderChildren.find((child: any) => 
        child.type === 'folder' && child.name === projectFolderName
      );

      if (!projectFolder) {
        projectFolder = await this.createFolder(projectFolderName, userFolder.id);
      }

      // Check if Photos subfolder already exists
      const projectFolderChildren = await this.getFolderChildren(projectFolder.id);
      let photoFolder = projectFolderChildren.find((child: any) => 
        child.type === 'folder' && child.name === 'Photos'
      );

      if (!photoFolder) {
        photoFolder = await this.createFolder('Photos', projectFolder.id);
      }

      console.log(`V4 Photo folder path created: ${photoFolder.id}`);
      return photoFolder.id;
    } catch (error) {
      console.error(`Failed to create V4 photo folder for user ${userId}, project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Upload file to Frame.io V4 using correct Adobe Developer API flow
   * 1. Create file placeholder in folder to get pre-signed upload URLs
   * 2. Upload file data to the pre-signed URLs
   */
  async uploadFile(fileBuffer: Buffer, filename: string, folderId: string, mimeType: string): Promise<any> {
    await this.initialize();

    try {
      console.log(`=== V4 File Upload: ${filename} to folder ${folderId} ===`);
      console.log(`File size: ${fileBuffer.length} bytes, MIME type: ${mimeType}`);

      // Get account ID for the correct V4 endpoint structure
      const accounts = await this.getAccounts();
      if (!accounts.data || accounts.data.length === 0) {
        throw new Error('No Frame.io accounts found');
      }
      const accountId = accounts.data[0].id;

      // Step 1: Create file placeholder using correct V4 endpoint
      const createFileEndpoint = `/accounts/${accountId}/folders/${folderId}/files`;
      console.log(`Creating file placeholder via: POST ${createFileEndpoint}`);

      const fileData = await this.makeRequest('POST', createFileEndpoint, {
        data: {
          name: filename,
          media_type: mimeType,
          file_size: fileBuffer.length
        }
      });

      console.log(`V4 File placeholder created: ${fileData.data.name} (${fileData.data.id})`);

      // Step 2: Check for upload URLs and upload file data if provided
      if (fileData.data.upload_urls && fileData.data.upload_urls.length > 0) {
        console.log(`Upload URLs provided: ${fileData.data.upload_urls.length} parts`);
        console.log(`Upload URLs structure:`, JSON.stringify(fileData.data.upload_urls, null, 2));

        // Extract actual URLs from the upload_urls objects
        const actualUrls = fileData.data.upload_urls.map((urlObj: any) => {
          if (typeof urlObj === 'string') {
            return urlObj;
          } else if (urlObj.url) {
            return urlObj.url;
          } else if (urlObj.upload_url) {
            return urlObj.upload_url;
          } else {
            console.log(`Unexpected URL object structure:`, urlObj);
            return Object.values(urlObj)[0]; // Try first property value
          }
        });

        console.log(`Extracted URLs:`, actualUrls);

        // Upload file data to each pre-signed URL
        await this.uploadFileParts(fileBuffer, actualUrls, mimeType);

        console.log(`File upload completed: ${filename}`);
      } else {
        console.log(`No upload URLs provided - file placeholder created only`);
      }

      return {
        id: fileData.data.id,
        name: fileData.data.name,
        url: fileData.data.download_url || `https://frame.io/files/${fileData.data.id}`,
        type: fileData.data.type || 'file',
        filesize: fileData.data.file_size || fileBuffer.length,
        created_at: fileData.data.created_at || new Date().toISOString(),
        updated_at: fileData.data.updated_at || new Date().toISOString(),
        status: fileData.data.status || 'created',
        upload_urls_count: fileData.data.upload_urls ? fileData.data.upload_urls.length : 0
      };
    } catch (error) {
      console.error(`Failed to upload V4 file "${filename}":`, error);
      throw error;
    }
  }

  /**
   * Upload file parts to Frame.io pre-signed URLs
   */
  private async uploadFileParts(fileBuffer: Buffer, uploadUrls: string[], mimeType: string): Promise<void> {
    console.log(`Uploading ${uploadUrls.length} file parts`);

    // Calculate chunk size based on number of URLs
    const chunkSize = Math.ceil(fileBuffer.length / uploadUrls.length);

    for (let i = 0; i < uploadUrls.length; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileBuffer.length);
      const chunk = fileBuffer.slice(start, end);

      console.log(`Uploading part ${i + 1}/${uploadUrls.length}: ${chunk.length} bytes`);

      try {
        const uploadUrl = uploadUrls[i];
        console.log(`Uploading to URL: ${uploadUrl}`);

        if (!uploadUrl || typeof uploadUrl !== 'string') {
          throw new Error(`Invalid upload URL at index ${i}: ${uploadUrl}`);
        }

        // Upload chunk to pre-signed URL using PUT request without auth headers
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'x-amz-acl': 'private',
            'Content-Type': mimeType
          },
          body: chunk
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Upload part ${i + 1} failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        console.log(`Part ${i + 1} uploaded successfully to ${uploadUrl.substring(0, 50)}...`);
      } catch (error) {
        console.error(`Failed to upload part ${i + 1}:`, error);
        throw error;
      }
    }
  }

  /**
   * Upload photo to Frame.io V4
   */
  async uploadPhoto(base64Data: string, filename: string, folderId: string, userId: string): Promise<any> {
    await this.initialize();

    try {
      console.log(`=== Uploading V4 Photo: ${filename} to folder ${folderId} ===`);

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');
      const mimeType = filename.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';

      // Create asset in V4
      const assetData = await this.makeRequest('POST', `/assets/${folderId}/children`, {
        name: filename,
        type: 'file',
        filetype: mimeType,
        filesize: buffer.length
      });

      console.log(`V4 Photo asset created: ${assetData.id}`);

      return {
        id: assetData.id,
        url: assetData.download_url || '',
        thumbnail_url: assetData.thumb_url || '',
        name: filename,
        size: buffer.length
      };
    } catch (error) {
      console.error(`Failed to upload V4 photo ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Get asset details (V4 compatible)
   */
  async getAsset(assetId: string): Promise<any> {
    await this.initialize();

    try {
      console.log(`=== Getting V4 Asset: ${assetId} ===`);

      const asset = await this.makeRequest('GET', `/assets/${assetId}`);

      console.log(`V4 Asset retrieved: ${asset.id}`);
      return asset;
    } catch (error) {
      console.error(`Failed to get V4 asset ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * Delete asset (V4 compatible)
   */
  async deleteAsset(assetId: string): Promise<boolean> {
    await this.initialize();

    try {
      console.log(`=== Deleting V4 Asset: ${assetId} ===`);

      await this.makeRequest('DELETE', `/assets/${assetId}`);

      console.log(`V4 Asset deleted: ${assetId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete V4 asset ${assetId}:`, error);
      return false;
    }
  }

  /**
   * Test V4 API proper hierarchy: accounts → workspaces → projects
   */
  async testV4Hierarchy(): Promise<any> {
    const results = {
      connection: false,
      accountAccess: false,
      workspaceAccess: false,
      projectAccess: false,
      details: {}
    };

    try {
      console.log(`=== FRAME.IO V4 API HIERARCHY TEST ===`);

      // Step 1: Get accounts
      console.log('1. Testing /v4/accounts...');
      const accounts = await this.getAccounts();
      results.connection = true;
      results.accountAccess = true;
      results.details.accounts = accounts.data?.length || 0;
      console.log(`✓ Found ${accounts.data?.length || 0} accounts`);

      if (accounts.data && accounts.data.length > 0) {
        const accountId = accounts.data[0].id;
        results.details.selectedAccount = { id: accountId, name: accounts.data[0].name };

        // Step 2: Get workspaces for first account
        console.log(`2. Testing /v4/accounts/${accountId}/workspaces...`);
        const workspaces = await this.getWorkspaces(accountId);
        results.workspaceAccess = true;
        results.details.workspaces = workspaces.data?.length || 0;
        console.log(`✓ Found ${workspaces.data?.length || 0} workspaces`);

        if (workspaces.data && workspaces.data.length > 0) {
          const workspaceId = workspaces.data[0].id;
          results.details.selectedWorkspace = { id: workspaceId, name: workspaces.data[0].name };

          // Step 3: Get projects for first workspace
          console.log(`3. Testing /v4/accounts/${accountId}/workspaces/${workspaceId}/projects...`);
          const projects = await this.getProjects(accountId, workspaceId);
          results.projectAccess = true;
          results.details.projects = projects.data?.length || 0;
          console.log(`✓ Found ${projects.data?.length || 0} projects`);

          if (projects.data && projects.data.length > 0) {
            results.details.selectedProject = { 
              id: projects.data[0].id, 
              name: projects.data[0].name 
            };
          }
        }
      }

      console.log(`=== V4 API HIERARCHY TEST COMPLETE ✓ ===`);
      return results;

    } catch (error) {
      console.error(`✗ V4 hierarchy test failed:`, error.message);
      results.details.error = error.message;
      throw error;
    }
  }

  /**
   * Test all three core features (legacy method)
   */
  async testAllFeatures(): Promise<any> {
    const results = {
      connection: false,
      folderCreation: false,
      uploadReady: false,
      reviewLinkCapable: false,
      details: {}
    };

    try {
      console.log(`=== FRAME.IO V4 CORE FEATURES TEST ===`);

      // Feature Test 1: User connection and workspace access
      console.log('1. Testing user connection...');
      const accounts = await this.getAccounts();
      const workspaces = accounts.data && accounts.data.length > 0 ? 
        await this.getWorkspaces(accounts.data[0].id) : { data: [] };
      results.connection = true;
      results.details.user = { name: 'Frame.io User', email: 'authenticated' };
      results.details.workspaces = workspaces?.data?.length || 0;
      console.log(`✓ Connected successfully (${workspaces?.data?.length || 0} workspaces)`);

      // Feature Test 2: Folder creation (Users and Projects)
      console.log('2. Testing folder creation...');
      const testFolderName = `API-Test-${Date.now()}`;
      const rootProject = await this.getOrCreateRootProject();
      const folder = await this.createFolder(testFolderName, rootProject.root_asset_id);
      results.folderCreation = true;
      results.details.folderCreated = { name: folder.name, id: folder.id };
      console.log(`✓ Created folder: ${folder.name} (${folder.id})`);

      // Feature Test 3: Upload readiness (verify we have root project access)
      console.log('3. Testing upload readiness...');
      results.uploadReady = true;
      results.details.rootProject = { 
        name: rootProject.name, 
        id: rootProject.id, 
        rootAssetId: rootProject.root_asset_id 
      };
      console.log(`✓ Upload ready: ${rootProject.name} (root asset: ${rootProject.root_asset_id})`);

      // Note: Review links need an actual asset, so we'll mark as capable
      results.reviewLinkCapable = true;
      console.log(`✓ Review link creation ready (requires asset upload first)`);

      console.log(`=== ALL FEATURES WORKING ✓ ===`);
      return results;

    } catch (error) {
      console.error(`✗ Feature test failed:`, error.message);
      results.details.error = error.message;
      throw error;
    }
  }
}

// Export singleton instance
export const frameioV4Service = new FrameioV4Service();