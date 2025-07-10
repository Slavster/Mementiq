import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEmailSignupSchema } from "@shared/schema";
import { z } from "zod";
import { Client } from "@replit/object-storage";

// Initialize Object Storage client
const objectStorageClient = new Client({ bucketId: "replit-objstore-b07cef7e-47a6-4dcc-aca4-da16dd52e2e9" });

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

  // Serve Object Storage assets
  app.get("/api/assets/*", async (req, res) => {
    try {
      // Strip EditingPortfolioAssets prefix and keep the full Objects/ path
      let assetPath = req.params[0];
      if (assetPath.startsWith('EditingPortfolioAssets/')) {
        assetPath = assetPath.replace('EditingPortfolioAssets/', '');
      }
      console.log(`Fetching asset: ${assetPath}`);
      
      let content;
      let finalPath = assetPath;
      
      // Try with Objects/ prefix first (current structure)
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
            return res.status(404).json({ 
              error: "Asset not found in storage", 
              requestedPath: assetPath,
              fallbackPath: fallbackPath
            });
          }
        } else {
          return res.status(404).json({ 
            error: "Asset not found in storage", 
            requestedPath: assetPath
          });
        }
      }
      
      if (!content) {
        console.error('No content received from Object Storage');
        return res.status(404).json({ error: "Asset content not found" });
      }
      
      // Set appropriate content type based on file extension
      const extension = assetPath.split('.').pop()?.toLowerCase();
      const contentType = getContentType(extension);
      
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      // Handle different content types
      if (content instanceof Uint8Array) {
        res.send(Buffer.from(content));
      } else if (Buffer.isBuffer(content)) {
        res.send(content);
      } else {
        res.send(Buffer.from(content));
      }
    } catch (error) {
      console.error(`Error serving asset ${req.params[0]}:`, error);
      res.status(404).json({ error: "Asset not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
