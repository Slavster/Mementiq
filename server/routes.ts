import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertEmailSignupSchema, 
  insertUserSchema, 
  loginUserSchema,
  insertProjectSchema,
  updateProjectSchema,
  insertProjectFileSchema 
} from "../shared/schema";
import { z } from "zod";
import { Client } from "@replit/object-storage";
import { verifySupabaseToken } from "./supabase";
import { vimeoService } from "./vimeo";
import { getProjectUploadSize } from "./upload";
import { createUploadSession, completeUpload, getVideoDetails, moveVideoToFolder } from './vimeoUpload';
import "./types"; // Import session types

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    company?: string;
    verified: boolean;
  };
}

// Middleware to verify Supabase auth
async function requireAuth(req: AuthenticatedRequest, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Missing or invalid auth header:', authHeader);
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token || token.length < 10) {
    console.log('Invalid token format:', token?.substring(0, 20) + '...');
    return res.status(401).json({ success: false, message: 'Invalid token format' });
  }
  
  console.log('Verifying token for request:', req.method, req.path);
  const result = await verifySupabaseToken(token);
  
  if (!result.success) {
    console.log('Token verification failed:', result.error);
    return res.status(401).json({ success: false, message: result.error });
  }
  
  req.user = result.user;
  next();
}

// Initialize Object Storage client
const objectStorageClient = new Client({ bucketId: "replit-objstore-b07cef7e-47a6-4dcc-aca4-da16dd52e2e9" });

// In-memory cache for assets (thumbnails only - videos are too large)
const assetCache = new Map<string, { content: Uint8Array; contentType: string; timestamp: number }>();
const videoCache = new Map<string, { content: Uint8Array; contentType: string; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const VIDEO_CACHE_TTL = 30 * 60 * 1000; // 30 minutes for videos
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB max cache
const MAX_VIDEO_CACHE_SIZE = 100 * 1024 * 1024; // 100MB max video cache size

// Request deduplication for ongoing downloads
const pendingRequests = new Map<string, Promise<{ content: Uint8Array; contentType: string }>>();

// Clean expired cache entries
function cleanCache() {
  const now = Date.now();
  
  // Clean thumbnail cache
  let totalSize = 0;
  const entries = Array.from(assetCache.entries());
  
  for (const [key, value] of entries) {
    if (now - value.timestamp > CACHE_TTL) {
      assetCache.delete(key);
    } else {
      totalSize += value.content.length;
    }
  }
  
  // Remove oldest thumbnail entries if cache is too large
  if (totalSize > MAX_CACHE_SIZE) {
    const sortedEntries = entries
      .filter(([_, value]) => now - value.timestamp <= CACHE_TTL)
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (const [key, value] of sortedEntries) {
      totalSize -= value.content.length;
      assetCache.delete(key);
      if (totalSize <= MAX_CACHE_SIZE * 0.8) break;
    }
  }
  
  // Clean video cache
  let videoTotalSize = 0;
  const videoEntries = Array.from(videoCache.entries());
  
  for (const [key, value] of videoEntries) {
    if (now - value.timestamp > VIDEO_CACHE_TTL) {
      videoCache.delete(key);
    } else {
      videoTotalSize += value.content.length;
    }
  }
  
  // Remove oldest video entries if cache is too large
  if (videoTotalSize > MAX_VIDEO_CACHE_SIZE) {
    const sortedVideoEntries = videoEntries
      .filter(([_, value]) => now - value.timestamp <= VIDEO_CACHE_TTL)
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (const [key, value] of sortedVideoEntries) {
      videoTotalSize -= value.content.length;
      videoCache.delete(key);
      if (videoTotalSize <= MAX_VIDEO_CACHE_SIZE * 0.8) break;
    }
  }
}

// Helper function to determine content type
function getContentType(extension: string | undefined): string {
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    default:
      return 'application/octet-stream';
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Email signup endpoint
  app.post("/api/email-signup", async (req, res) => {
    try {
      const validatedData = insertEmailSignupSchema.parse(req.body);
      const emailSignup = await storage.createEmailSignup(validatedData);
      res.json({ success: true, message: "Email successfully registered!" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid email format",
          errors: error.errors 
        });
      } else if (error instanceof Error && error.message === "Email already exists") {
        res.status(409).json({ 
          success: false, 
          message: "This email is already registered" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Internal server error" 
        });
      }
    }
  });

  // Get all email signups (for admin purposes)
  app.get("/api/email-signups", async (req, res) => {
    try {
      const emailSignups = await storage.getEmailSignups();
      res.json(emailSignups);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to retrieve email signups" 
      });
    }
  });

  // Get current user (for Supabase auth)
  app.get("/api/auth/me", requireAuth, async (req: AuthenticatedRequest, res) => {
    res.json({
      success: true,
      user: req.user
    });
  });



  // User Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Logout failed"
        });
      }
      res.json({
        success: true,
        message: "Logged out successfully"
      });
    });
  });

  // Email Verification
  app.get("/api/auth/verify-email/:token", async (req, res) => {
    try {
      const token = req.params.token;
      
      // Find user with this token
      const user = await storage.verifyUser(token);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired verification token"
        });
      }
      
      // Update user verification status
      await storage.updateUserVerification(user.id, new Date());
      
      res.json({
        success: true,
        message: "Email verified successfully! You can now log in."
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: "Email verification failed"
      });
    }
  });

  // Get Current User
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }
      
      const user = await storage.getUser(req.session.userId as string);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          company: user.company,
          verified: !!user.verifiedAt
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get user data"
      });
    }
  });

  // Project Management Routes
  
  // Get user's projects
  app.get("/api/projects", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projects = await storage.getProjectsByUser(req.user!.id);
      res.json({
        success: true,
        projects
      });
    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get projects"
      });
    }
  });

  // Create new project
  app.post("/api/projects", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(req.user!.id, validatedData);
      
      // Create hierarchical Vimeo folder structure
      try {
        // Step 1: Ensure user has a main folder in Vimeo
        console.log(`Creating/getting user folder for user ${req.user!.id} (${req.user!.email})`);
        const userFolderUri = await vimeoService.createUserFolder(req.user!.id, req.user!.email);
        
        // Step 2: Create project subfolder within user folder
        console.log(`Creating project subfolder for project ${project.id}: "${project.title}"`);
        const projectFolderUri = await vimeoService.createProjectFolder(userFolderUri, project.id, project.title);
        
        // Step 3: Update project with Vimeo folder information
        await storage.updateProjectVimeoInfo(project.id, projectFolderUri, userFolderUri);
        
        // Get updated project with folder info
        const updatedProject = await storage.getProject(project.id);
        
        console.log(`Successfully created hierarchical folders: User(${userFolderUri}) -> Project(${projectFolderUri})`);
        
        res.status(201).json({
          success: true,
          message: "Project created successfully with hierarchical Vimeo folder structure",
          project: updatedProject,
          folders: {
            userFolder: userFolderUri,
            projectFolder: projectFolderUri
          }
        });
      } catch (vimeoError) {
        console.error("Vimeo folder creation failed:", vimeoError);
        // Project is still created, just without Vimeo integration
        res.status(201).json({
          success: true,
          message: "Project created successfully",
          project,
          warning: "Vimeo folder setup failed - videos will be uploaded to root. Contact support for assistance."
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid project data",
          errors: error.errors
        });
      } else {
        console.error('Create project error:', error);
        res.status(500).json({
          success: false,
          message: "Failed to create project"
        });
      }
    }
  });

  // Get project by ID
  app.get("/api/projects/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }
      
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }
      
      // Check if user owns this project
      if (project.userId !== req.session.userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }
      
      // Get project files
      const files = await storage.getProjectFiles(projectId);
      
      res.json({
        success: true,
        project: {
          ...project,
          files
        }
      });
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to get project"
      });
    }
  });

  // Update project
  app.put("/api/projects/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }
      
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }
      
      // Check if user owns this project
      if (project.userId !== req.session.userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }
      
      const validatedData = updateProjectSchema.parse(req.body);
      const updatedProject = await storage.updateProject(projectId, validatedData);
      
      res.json({
        success: true,
        message: "Project updated successfully",
        project: updatedProject
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid project data",
          errors: error.errors
        });
      } else {
        console.error('Update project error:', error);
        res.status(500).json({
          success: false,
          message: "Failed to update project"
        });
      }
    }
  });



  // List files endpoint for debugging
  app.get("/api/list-files", async (req, res) => {
    try {
      console.log('Attempting to list Object Storage files...');
      const listResult = await objectStorageClient.list();
      console.log('List result:', JSON.stringify(listResult, null, 2));
      res.json(listResult);
    } catch (error) {
      console.error('Object Storage list error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Serve Object Storage assets with HTTP Range support for video streaming
  app.get("/api/assets/*", async (req, res) => {
    try {
      // Strip EditingPortfolioAssets prefix and keep the full Objects/ path
      let assetPath = req.params[0];
      if (assetPath.startsWith('EditingPortfolioAssets/')) {
        assetPath = assetPath.replace('EditingPortfolioAssets/', '');
      }
      
      const isVideo = assetPath.includes('Videos/');
      const isThumbnail = assetPath.includes('Thumbnails/');
      const range = req.headers.range;
      
      // Clean cache periodically
      if (Math.random() < 0.1) cleanCache(); // 10% chance to clean on each request
      
      // Check cache for thumbnails and videos
      if (isThumbnail && assetCache.has(assetPath)) {
        const cached = assetCache.get(assetPath)!;
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          console.log(`Thumbnail cache hit for: ${assetPath}`);
          res.set({
            'Content-Type': cached.contentType,
            'Cache-Control': 'public, max-age=600',
            'ETag': `"${assetPath}-${cached.timestamp}"`,
          });
          return res.send(Buffer.from(cached.content));
        } else {
          assetCache.delete(assetPath);
        }
      }
      
      // Check video cache - serve full video for cached content
      if (isVideo && videoCache.has(assetPath)) {
        const cached = videoCache.get(assetPath)!;
        if (Date.now() - cached.timestamp < VIDEO_CACHE_TTL) {
          console.log(`Video cache hit for: ${assetPath} - serving full video`);
          
          res.set({
            'Content-Type': cached.contentType,
            'Cache-Control': 'public, max-age=3600',
            'Content-Length': cached.content.length.toString(),
            'Accept-Ranges': 'bytes',
            'ETag': `"${assetPath}-${cached.timestamp}"`,
          });
          return res.send(Buffer.from(cached.content));
        } else {
          videoCache.delete(assetPath);
        }
      }
      
      // For video range requests, we need to download full file first
      // Check for ongoing request (deduplication)
      if (pendingRequests.has(assetPath)) {
        console.log(`Waiting for ongoing request: ${assetPath}`);
        const result = await pendingRequests.get(assetPath)!;
        
        // For videos from pending requests, serve full content
        res.set({
          'Content-Type': result.contentType,
          'Cache-Control': isVideo ? 'public, max-age=3600' : 'public, max-age=600',
          'Content-Length': result.content.length.toString(),
          'Accept-Ranges': isVideo ? 'bytes' : 'none',
        });
        return res.send(Buffer.from(result.content));
      }
      
      console.log(`Fetching asset: ${assetPath}`);
      
      // Create pending request promise
      const downloadPromise = downloadAsset(assetPath);
      pendingRequests.set(assetPath, downloadPromise);
      
      try {
        const result = await downloadPromise;
        
        // Cache thumbnails and videos
        if (isThumbnail && result.content.length < 10 * 1024 * 1024) {
          assetCache.set(assetPath, {
            content: result.content,
            contentType: result.contentType,
            timestamp: Date.now()
          });
        } else if (isVideo && result.content.length < 50 * 1024 * 1024) { // Cache videos up to 50MB
          videoCache.set(assetPath, {
            content: result.content,
            contentType: result.contentType,
            timestamp: Date.now()
          });
          console.log(`Cached video: ${assetPath} (${result.content.length} bytes)`);
        }
        
        // For new video downloads, serve full content for smooth playback
        res.set({
          'Content-Type': result.contentType,
          'Cache-Control': isVideo ? 'public, max-age=3600' : 'public, max-age=600',
          'Content-Length': result.content.length.toString(),
          'ETag': `"${assetPath}-${Date.now()}"`,
          'Accept-Ranges': isVideo ? 'bytes' : 'none',
          'Connection': 'keep-alive',
        });
        
        res.send(Buffer.from(result.content));
      } finally {
        pendingRequests.delete(assetPath);
      }
    } catch (error) {
      console.error('Asset serving error:', error);
      res.status(500).json({ error: 'Failed to serve asset' });
    }
  });

  // Helper function to handle video range requests with optimized chunk sizes
  function handleVideoRange(req: Request, res: Response, content: Uint8Array, contentType: string) {
    const range = req.headers.range!;
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    
    // Optimize chunk size based on request
    let end: number;
    if (parts[1]) {
      end = parseInt(parts[1], 10);
    } else {
      // For initial requests (start=0), send much larger chunk for immediate playback
      if (start === 0) {
        end = Math.min(start + 10 * 1024 * 1024, content.length - 1); // 10MB initial chunk
      } else if (start < 5 * 1024 * 1024) {
        end = Math.min(start + 5 * 1024 * 1024, content.length - 1); // 5MB for early chunks  
      } else {
        end = Math.min(start + 2 * 1024 * 1024, content.length - 1); // 2MB for later chunks
      }
    }
    
    const chunksize = (end - start) + 1;
    const chunk = content.slice(start, end + 1);
    
    console.log(`Range request: ${start}-${end}/${content.length} (${chunksize} bytes) ${start === 0 ? '(INITIAL)' : ''}`);
    
    res.status(206); // Partial Content
    res.set({
      'Content-Range': `bytes ${start}-${end}/${content.length}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize.toString(),
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    });
    
    res.send(Buffer.from(chunk));
  }

  // Legacy server upload route (removed - TUS direct upload only)
  app.post("/api/projects/:id/upload", requireAuth, async (req: AuthenticatedRequest, res) => {
    res.status(410).json({
      success: false,
      message: "Server uploads are no longer supported. Please use direct TUS upload to Vimeo.",
      migration: "Use /api/projects/:id/upload-session endpoint for direct uploads"
    });
  });

  // Create direct Vimeo upload session
  app.post("/api/projects/:id/upload-session", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { fileName, fileSize } = req.body;

      if (!fileName || !fileSize) {
        return res.status(400).json({
          success: false,
          message: "fileName and fileSize are required"
        });
      }

      // Get project and verify ownership
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      if (project.userId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      // Check size limits (10GB per project)
      const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
      const currentSize = await getProjectUploadSize(projectId);
      
      if (currentSize + fileSize > maxSize) {
        return res.status(400).json({
          success: false,
          message: `Upload would exceed 10GB limit for this project. Current: ${Math.round(currentSize / 1024 / 1024)}MB, Requested: ${Math.round(fileSize / 1024 / 1024)}MB`
        });
      }

      // Create upload session
      const uploadSession = await createUploadSession(
        fileName,
        fileSize,
        project.vimeoFolderId || undefined
      );

      console.log('Raw Vimeo uploadSession object:', uploadSession);
      console.log('Upload session keys:', Object.keys(uploadSession));
      
      const sessionResponse = {
        uploadUrl: uploadSession.upload_link,
        videoUri: uploadSession.video_uri,
        completeUri: uploadSession.complete_uri,
        ticketId: uploadSession.ticket_id
      };
      
      console.log('Sending upload session response:', sessionResponse);

      res.json({
        success: true,
        uploadSession: sessionResponse
      });

    } catch (error) {
      console.error('Create upload session error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to create upload session"
      });
    }
  });



  // Complete direct Vimeo upload
  app.post("/api/projects/:id/complete-upload", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      console.log('Complete upload request body:', req.body);
      console.log('Complete upload body keys:', Object.keys(req.body || {}));
      console.log('Auth user:', req.user?.id);
      
      const projectId = parseInt(req.params.id);
      const { completeUri, videoUri, fileName, fileSize } = req.body;

      console.log('Extracted values:', { completeUri, videoUri, fileName, fileSize });

      if (!completeUri || !videoUri || !fileName) {
        console.error('Missing required fields:', {
          hasCompleteUri: !!completeUri,
          hasVideoUri: !!videoUri,
          hasFileName: !!fileName
        });
        return res.status(400).json({
          success: false,
          message: "completeUri, videoUri, and fileName are required"
        });
      }

      // Get project and verify ownership
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      if (project.userId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      // Complete the upload
      await completeUpload(completeUri);

      // Move video to project folder if needed
      if (project.vimeoFolderId) {
        try {
          await moveVideoToFolder(videoUri, project.vimeoFolderId);
        } catch (moveError) {
          console.warn('Failed to move video to folder:', moveError);
          // Continue even if move fails
        }
      }

      // Get video details
      const videoDetails = await getVideoDetails(videoUri);

      // Save file record
      const fileRecord = await storage.createProjectFile({
        projectId,
        vimeoVideoId: videoUri.replace('/videos/', ''),
        filename: fileName,
        fileType: 'video',
        fileSize: fileSize || 0
      });

      res.json({
        success: true,
        message: "Upload completed successfully",
        file: fileRecord,
        videoDetails
      });

    } catch (error) {
      console.error('Complete upload error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to complete upload"
      });
    }
  });

  // Get project files
  app.get("/api/projects/:id/files", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }
      
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
      
      const files = await storage.getProjectFiles(projectId);
      res.json({ success: true, data: files });
    } catch (error) {
      console.error("Error fetching project files:", error);
      res.status(500).json({ success: false, message: "Failed to fetch files" });
    }
  });

  // Get user's Vimeo folders (security check)
  app.get("/api/vimeo/folders", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const folders = await vimeoService.getUserFolders(req.user!.id);
      res.json({ success: true, data: folders });
    } catch (error) {
      console.error("Error fetching Vimeo folders:", error);
      res.status(500).json({ success: false, message: "Failed to fetch folders" });
    }
  });

  // Verify video upload status
  app.post("/api/upload/verify-video", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { videoId, projectId } = req.body;
      
      if (!videoId || !projectId) {
        return res.status(400).json({
          success: false,
          message: "Video ID and project ID are required"
        });
      }

      // Verify user owns the project
      const project = await storage.getProject(parseInt(projectId));
      if (!project || project.userId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied - project not found or unauthorized"
        });
      }

      // Verify video upload status with Vimeo
      const verification = await vimeoService.verifyVideoUpload(videoId);

      res.json({
        success: true,
        verification,
        canProceed: verification.isUploaded && (verification.isReady || verification.isTranscoding)
      });
    } catch (error) {
      console.error("Video verification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to verify video upload",
        shouldRetry: true
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function downloadAsset(assetPath: string): Promise<{ content: Uint8Array; contentType: string }> {
  let content: Uint8Array;
  let finalPath = assetPath;
      
  // Try direct path first (current structure)
  try {
        console.log('Attempting downloadAsBytes for:', assetPath);
        const bytesResult = await objectStorageClient.downloadAsBytes(assetPath);
        console.log('BytesResult structure:', Object.keys(bytesResult));
        console.log('BytesResult ok:', bytesResult.ok);
        
        if (!bytesResult.ok) {
          throw new Error(`Object Storage error: ${JSON.stringify(bytesResult.error)}`);
        }
        
        // Check the actual structure of the response
        console.log('BytesResult.value type:', typeof bytesResult.value);
        console.log('BytesResult.value instanceof Uint8Array:', bytesResult.value instanceof Uint8Array);
        console.log('BytesResult.value keys:', Object.keys(bytesResult.value));
        console.log('BytesResult.value constructor:', bytesResult.value.constructor.name);
        
        if (bytesResult.value instanceof Uint8Array) {
          content = bytesResult.value;
        } else if (Array.isArray(bytesResult.value)) {
          // Handle array case first - it's an array - let's check what's inside
          console.log('Array detected, length:', bytesResult.value.length);
          console.log('First element type:', typeof bytesResult.value[0]);
          console.log('First element constructor:', bytesResult.value[0]?.constructor?.name);
          
          if (bytesResult.value[0] instanceof Uint8Array) {
            content = bytesResult.value[0];
          } else if (bytesResult.value[0] && typeof bytesResult.value[0].arrayBuffer === 'function') {
            const arrayBuffer = await bytesResult.value[0].arrayBuffer();
            content = new Uint8Array(arrayBuffer);
          } else {
            // Try converting the array itself to Uint8Array
            content = new Uint8Array(bytesResult.value);
          }
        } else if (typeof bytesResult.value === 'string') {
          content = new TextEncoder().encode(bytesResult.value);
        } else if (bytesResult.value && typeof bytesResult.value.arrayBuffer === 'function') {
          // Handle Response-like object
          const arrayBuffer = await bytesResult.value.arrayBuffer();
          content = new Uint8Array(arrayBuffer);
        } else if (bytesResult.value && typeof bytesResult.value.stream === 'function') {
          // Handle stream response
          const response = new Response(bytesResult.value.stream());
          const arrayBuffer = await response.arrayBuffer();
          content = new Uint8Array(arrayBuffer);
        } else if (bytesResult.value && bytesResult.value.bytes) {
          // Maybe bytes field?
          content = bytesResult.value.bytes;
        } else {
          // Last resort: try converting whatever we got to Uint8Array
          try {
            content = new Uint8Array(bytesResult.value);
          } catch (e) {
            console.error('Failed to convert to Uint8Array:', e);
            throw new Error(`Unsupported bytesResult.value format: ${typeof bytesResult.value}`);
          }
        }
        
        console.log('Final content length:', content.length);
      } catch (bytesError) {
        console.log(`First attempt failed for ${assetPath}:`, bytesError.message);
        
        // Try fallback: remove Objects/ prefix if it exists (legacy structure)
        if (assetPath.startsWith('Objects/')) {
          const fallbackPath = assetPath.replace('Objects/', '');
          console.log(`Trying fallback path: ${fallbackPath}`);
          
          try {
            console.log('Attempting fallback downloadAsBytes for:', fallbackPath);
            const fallbackResult = await objectStorageClient.downloadAsBytes(fallbackPath);
            console.log('Fallback BytesResult ok:', fallbackResult.ok);
            
            if (!fallbackResult.ok) {
              throw new Error(`Fallback also failed: ${JSON.stringify(fallbackResult.error)}`);
            }
            
            console.log('Fallback BytesResult.value type:', typeof fallbackResult.value);
            console.log('Fallback BytesResult.value keys:', fallbackResult.value ? Object.keys(fallbackResult.value) : 'null');
            console.log('Fallback BytesResult full structure:', JSON.stringify(fallbackResult, null, 2));
            
            // Check if value has a nested structure
            if (fallbackResult.value && fallbackResult.value.content) {
              content = fallbackResult.value.content;
            } else if (fallbackResult.value && fallbackResult.value.data) {
              content = fallbackResult.value.data;
            } else if (fallbackResult.value instanceof Uint8Array) {
              content = fallbackResult.value;
            } else if (typeof fallbackResult.value === 'string') {
              content = new TextEncoder().encode(fallbackResult.value);
            } else if (fallbackResult.content) {
              content = fallbackResult.content;
            } else if (fallbackResult.data) {
              content = fallbackResult.data;
            } else {
              // Try converting whatever we got to Uint8Array
              content = new Uint8Array(fallbackResult.value);
            }
            
            finalPath = fallbackPath;
            console.log('Fallback final content length:', content?.length || 'undefined');
          } catch (fallbackError) {
            console.log('Both paths failed:', fallbackError.message);
            throw new Error(`Asset not found: ${assetPath}`);
          }
        } else {
          throw new Error(`Asset not found: ${assetPath}`);
        }
      }
      
      if (!content) {
        console.error('No content received from Object Storage');
        throw new Error(`Asset content not found: ${assetPath}`);
      }
      
      // Set appropriate content type based on file extension
      const extension = finalPath.split('.').pop()?.toLowerCase();
      const contentType = getContentType(extension);
      
      return { content, contentType };
}
