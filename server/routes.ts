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



  // Serve Object Storage assets
  app.get("/api/assets/*", async (req, res) => {
    try {
      // Strip EditingPortfolioAssets prefix since files are at root level
      let assetPath = req.params[0];
      if (assetPath.startsWith('EditingPortfolioAssets/')) {
        assetPath = assetPath.replace('EditingPortfolioAssets/', '');
      }
      console.log(`Fetching asset: ${assetPath}`);
      
      let content;
      try {
        const bytesResult = await objectStorageClient.downloadAsBytes(assetPath);
        
        if (!bytesResult.ok) {
          throw new Error(`Object Storage error: ${JSON.stringify(bytesResult.error)}`);
        }
        
        content = bytesResult.value;
      } catch (bytesError) {
        console.log('downloadAsBytes failed:', bytesError.message);
        return res.status(404).json({ 
          error: "Asset not found in storage", 
          requestedPath: assetPath
        });
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
