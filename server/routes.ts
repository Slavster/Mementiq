import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertEmailSignupSchema,
  insertUserSchema,
  loginUserSchema,
  insertProjectSchema,
  updateProjectSchema,
  insertProjectFileSchema,
  insertPhotoAlbumSchema,
  insertPhotoFileSchema,
  insertRevisionPaymentSchema,
} from "../shared/schema";
import { z } from "zod";
import { Client } from "@replit/object-storage";
import { verifySupabaseToken } from "./supabase";
import { frameioService } from "./frameioService";
import { frameioV4Service } from "./frameioV4Service";
import { getProjectUploadSize } from "./upload";
import {
  createFrameioUploadSession,
  completeFrameioUpload,
  getFolderVideos,
  createFrameioReviewLink,
  verifyFrameioUpload,
} from "./frameioUpload";
import { emailService } from "./emailService";
import "./types"; // Import session types
import Stripe from "stripe";



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
async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: Function,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("Missing or invalid auth header:", authHeader);
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];

  if (!token || token.length < 10) {
    console.log("Invalid token format:", token?.substring(0, 20) + "...");
    return res
      .status(401)
      .json({ success: false, message: "Invalid token format" });
  }

  console.log("Verifying token for request:", req.method, req.path);
  const result = await verifySupabaseToken(token);

  if (!result.success) {
    console.log("Token verification failed:", result.error);
    return res.status(401).json({ success: false, message: result.error });
  }

  req.user = result.user;
  next();
}

// Middleware to check 31-day project access restriction
async function requireProjectAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: Function,
) {
  try {
    const projectId = parseInt(req.params.id);
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user owns this project
    if (project.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Check 31-day access restriction
    const projectCreatedAt = new Date(project.createdAt);
    const thirtyOneDaysAfterCreation = new Date(
      projectCreatedAt.getTime() + 31 * 24 * 60 * 60 * 1000,
    );
    const now = new Date();

    if (now > thirtyOneDaysAfterCreation) {
      return res.status(403).json({
        success: false,
        message: "Project access has expired. You can only manage projects for 31 days after creation.",
        expired: true,
        createdAt: project.createdAt,
        expiresAt: thirtyOneDaysAfterCreation.toISOString(),
      });
    }

    // Add project to request for downstream use
    (req as any).project = project;
    next();
  } catch (error) {
    console.error("Project access check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify project access",
    });
  }
}

// Initialize Object Storage client
const objectStorageClient = new Client({
  bucketId: "replit-objstore-b07cef7e-47a6-4dcc-aca4-da16dd52e2e9",
});

// In-memory cache for assets (thumbnails only - videos are too large)
const assetCache = new Map<
  string,
  { content: Uint8Array; contentType: string; timestamp: number }
>();
const videoCache = new Map<
  string,
  { content: Uint8Array; contentType: string; timestamp: number }
>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const VIDEO_CACHE_TTL = 30 * 60 * 1000; // 30 minutes for videos
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB max cache
const MAX_VIDEO_CACHE_SIZE = 100 * 1024 * 1024; // 100MB max video cache size

// Request deduplication for ongoing downloads
const pendingRequests = new Map<
  string,
  Promise<{ content: Uint8Array; contentType: string }>
>();

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
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    default:
      return "application/octet-stream";
  }
}

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required Stripe secret: STRIPE_SECRET_KEY");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20" as any,
});

// Subscription tier configurations matching your actual Stripe products
const SUBSCRIPTION_TIERS = {
  basic: {
    name: "Creative Spark",
    allowance: 2,
    stripeProductId: "prod_SlhMaAjk64ykbk",
  },
  standard: {
    name: "Consistency Club",
    allowance: 6,
    stripeProductId: "prod_SlhNEEOKukgpjo",
  },
  premium: {
    name: "Growth Accelerator",
    allowance: 12,
    stripeProductId: "prod_Sm3pNUZ42txw8o",
  },
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Stripe webhook endpoint - must be before other JSON middleware
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig || !endpointSecret) {
        console.error("Missing Stripe signature or webhook secret");
        return res.status(400).send("Missing signature or secret");
      }

      let event: Stripe.Event;

      // Skip signature verification for testing
      if (sig === 'skip-verification') {
        console.log("⚠️  TESTING MODE: Skipping webhook signature verification");
        event = req.body as Stripe.Event;
      } else {
        try {
          event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
          console.log("Webhook received:", event.type);
        } catch (err: any) {
          console.error("Webhook signature verification failed:", err.message);
          return res.status(400).send(`Webhook Error: ${err.message}`);
        }
      }

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log("Checkout completed:", session.id);

            // Handle revision payments
            if (session.metadata?.type === 'revision_payment') {
              try {
                const projectId = parseInt(session.metadata.projectId);
                
                // Update revision payment status
                await storage.updateRevisionPaymentStatus(
                  session.id,
                  'completed',
                  session.payment_intent as string,
                  new Date()
                );

                // Update project status to "awaiting revision instructions"
                await storage.updateProject(projectId, {
                  status: "awaiting revision instructions",
                  updatedAt: new Date(),
                });

                // Automatically generate review link after successful payment
                try {
                  const project = await storage.getProject(projectId);
                  const projectFolderId = project?.mediaFolderId?.split('/').pop();
                  
                  if (projectFolderId) {
                    const reviewLink = await createFrameioReviewLink(projectFolderId);
                    if (reviewLink) {
                      // Save review link to database
                      await storage.updateProject(projectId, {
                        mediaReviewLink: reviewLink,
                        updatedAt: new Date()
                      });

                      // Get user info to send email
                      const user = await storage.getUserById(project.userId);
                      if (user) {
                        // Try to send email with review link and instructions
                        try {
                          await emailService.sendRevisionInstructionsEmail(
                            user.email,
                            user.firstName,
                            project.title,
                            reviewLink
                          );
                          console.log(`Review link automatically generated and email sent for project ${projectId}`);
                        } catch (emailError) {
                          console.error(`Email sending failed for project ${projectId}:`, emailError);
                          console.log(`Review link automatically generated for project ${projectId} (email failed)`);
                        }
                      }
                    }
                  }
                } catch (reviewLinkError) {
                  console.error(`Failed to auto-generate review link for project ${projectId}:`, reviewLinkError);
                  // Don't fail the webhook if review link generation fails
                }

                console.log(`Revision payment completed for project ${projectId}`);

              } catch (error) {
                console.error("Error processing revision payment webhook:", error);
              }
            }
            // Handle subscription payments
            else if (session.mode === "subscription" && session.subscription) {
              const subscription = await stripe.subscriptions.retrieve(
                session.subscription as string,
              );
              const userId = session.metadata?.userId;
              const tier = session.metadata?.tier;

              if (userId && tier) {
                // Update user subscription status
                await storage.updateUserSubscription(userId, {
                  stripeSubscriptionId: subscription.id,
                  subscriptionStatus: subscription.status,
                  subscriptionTier: tier,
                  subscriptionUsage: 0, // Reset usage on new subscription
                  subscriptionAllowance:
                    SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]
                      .allowance,
                  subscriptionPeriodStart: new Date(
                    (subscription as any).current_period_start * 1000,
                  ),
                  subscriptionPeriodEnd: new Date(
                    (subscription as any).current_period_end * 1000,
                  ),
                });

                console.log(
                  `Subscription activated for user ${userId}: ${tier}`,
                );
              }
            }
            break;
          }

          case "invoice.payment_succeeded": {
            const invoice = event.data.object as Stripe.Invoice;
            console.log("Payment succeeded:", invoice.id);

            if ((invoice as any).subscription) {
              const subscription = await stripe.subscriptions.retrieve(
                (invoice as any).subscription as string,
              );
              const customer = await stripe.customers.retrieve(
                subscription.customer as string,
              );

              // Find user by customer ID
              const user = await storage.getUserByStripeCustomerId(
                subscription.customer as string,
              );

              if (user) {
                // Update subscription status and reset usage for new billing period
                const tierConfig = Object.entries(SUBSCRIPTION_TIERS).find(
                  ([_, config]) =>
                    config.stripeProductId ===
                    subscription.items.data[0]?.price.product,
                );

                if (tierConfig) {
                  const [tier] = tierConfig;
                  await storage.updateUserSubscription(user.id, {
                    subscriptionStatus: subscription.status,
                    subscriptionUsage: 0, // Reset usage on successful payment
                    subscriptionPeriodStart: new Date(
                      (subscription as any).current_period_start * 1000,
                    ),
                    subscriptionPeriodEnd: new Date(
                      (subscription as any).current_period_end * 1000,
                    ),
                  });

                  console.log(
                    `Subscription renewed for user ${user.id}: ${tier}`,
                  );
                }
              }
            }
            break;
          }

          case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            console.log("Subscription updated:", subscription.id);

            const user = await storage.getUserByStripeCustomerId(
              subscription.customer as string,
            );

            if (user) {
              // Find tier based on product ID
              const tierConfig = Object.entries(SUBSCRIPTION_TIERS).find(
                ([_, config]) =>
                  config.stripeProductId ===
                  subscription.items.data[0]?.price.product,
              );

              if (tierConfig) {
                const [tier] = tierConfig;
                await storage.updateUserSubscription(user.id, {
                  subscriptionStatus: subscription.status,
                  subscriptionTier: tier,
                  subscriptionAllowance:
                    SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]
                      .allowance,
                  subscriptionPeriodStart: new Date(
                    (subscription as any).current_period_start * 1000,
                  ),
                  subscriptionPeriodEnd: new Date(
                    (subscription as any).current_period_end * 1000,
                  ),
                });

                console.log(
                  `Subscription updated for user ${user.id}: ${tier} (${subscription.status})`,
                );
              }
            }
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            console.log("Subscription canceled:", subscription.id);

            const user = await storage.getUserByStripeCustomerId(
              subscription.customer as string,
            );

            if (user) {
              await storage.updateUserSubscription(user.id, {
                subscriptionStatus: "canceled",
                subscriptionTier: null,
                subscriptionAllowance: 0,
                subscriptionUsage: 0,
              });

              console.log(`Subscription canceled for user ${user.id}`);
            }
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            console.log("Payment failed:", invoice.id);

            if ((invoice as any).subscription) {
              const subscription = await stripe.subscriptions.retrieve(
                (invoice as any).subscription as string,
              );
              const user = await storage.getUserByStripeCustomerId(
                subscription.customer as string,
              );

              if (user) {
                await storage.updateUserSubscription(user.id, {
                  subscriptionStatus: "past_due",
                });

                console.log(
                  `Payment failed for user ${user.id}, subscription marked past_due`,
                );
              }
            }
            break;
          }

          default:
            console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
      } catch (error: any) {
        console.error("Webhook processing error:", error);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    },
  );
  // Frame.io webhook endpoint for video upload notifications
  app.post("/api/webhooks/frameio", async (req, res) => {
    try {
      console.log("Frame.io webhook received:", req.body);
      
      const { type, data } = req.body;
      
      if (type === 'asset.uploaded' || type === 'asset.processing_complete') {
        const assetId = data.id;
        const assetName = data.name;
        
        console.log(`Video processing completed: ${assetId} - ${assetName}`);
        
        // Find which project this asset belongs to by checking all projects in "edit in progress" or "revision in progress" status
        const projectsInProgress = await storage.getProjectsByStatus(['edit in progress', 'revision in progress']);
        
        console.log(`Found ${projectsInProgress.length} projects in progress to check`);
        
        for (const project of projectsInProgress) {
          console.log(`Checking project ${project.id} (${project.title}) with folder: ${project.mediaFolderId}`);
          
          if (project.mediaFolderId) {
            try {
              // Check if asset belongs to this project's folder
              const belongsToProject = await frameioService.verifyAssetInProjectFolder(assetId, project.mediaFolderId);
              console.log(`Does asset ${assetId} belong to project ${project.id}? ${belongsToProject}`);
              
              if (belongsToProject) {
                console.log(`Asset ${assetId} belongs to project ${project.id} (${project.title})`);
                
                // Generate download link from Frame.io
                const downloadLink = await frameioService.generateAssetDownloadLink(assetId);
                
                if (downloadLink) {
                  // Update project status to "delivered"
                  await storage.updateProject(project.id, {
                    status: 'delivered',
                    updatedAt: new Date(),
                  });
                  
                  // Get user details for email
                  const user = await storage.getUserById(project.userId);
                  
                  if (user) {
                    // Send email notification
                    const emailTemplate = emailService.generateVideoDeliveryEmail(
                      user.email,
                      project.title,
                      downloadLink,
                      project.id
                    );
                    
                    await emailService.sendEmail(emailTemplate);
                    console.log(`Video delivery email sent to ${user.email} for project ${project.id}`);
                  }
                  
                  // Store the download link in project files
                  await storage.createProjectFile({
                    projectId: project.id,
                    mediaAssetId: assetId,
                    mediaAssetUrl: downloadLink,
                    filename: assetName,
                    originalFilename: assetName,
                    fileType: data.type || 'video/mp4',
                    fileSize: data.filesize || 0,
                    uploadStatus: 'completed',
                  });
                  
                } else {
                  console.log(`Could not generate download link for asset ${assetId}`);
                }
                
                break; // Found the project, no need to check others
              }
            } catch (error) {
              console.error(`Error checking if asset ${assetId} belongs to project ${project.id}:`, error);
            }
          }
        }
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error("Frame.io webhook processing error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

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
          errors: error.errors,
        });
      } else if (
        error instanceof Error &&
        error.message === "Email already exists"
      ) {
        res.status(409).json({
          success: false,
          message: "This email is already registered",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
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
        message: "Failed to retrieve email signups",
      });
    }
  });

  // Get current user (for Supabase auth)
  app.get(
    "/api/auth/me",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      res.json({
        success: true,
        user: req.user,
      });
    },
  );

  // User Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Logout failed",
        });
      }
      res.json({
        success: true,
        message: "Logged out successfully",
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
          message: "Invalid or expired verification token",
        });
      }

      // Update user verification status
      await storage.updateUserVerification(user.id, new Date());

      res.json({
        success: true,
        message: "Email verified successfully! You can now log in.",
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({
        success: false,
        message: "Email verification failed",
      });
    }
  });

  // Get Current User
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const user = await storage.getUser(String(req.session.userId));
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
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
          verified: !!user.verifiedAt,
        },
      });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get user data",
      });
    }
  });

  // Revision API Routes

  // Generate media platform review link for revisions
  app.post('/api/projects/:id/generate-review-link', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;

      // Verify user owns the project
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      // Project must be in 'awaiting revision instructions' status
      if (project.status !== 'awaiting revision instructions') {
        return res.status(400).json({ 
          success: false, 
          message: 'Review link can only be generated for projects awaiting revision instructions' 
        });
      }

      // Extract project folder ID 
      const projectFolderId = project.mediaFolderId;
      if (!projectFolderId) {
        return res.status(400).json({ 
          success: false, 
          message: 'No Frame.io folder found for this project' 
        });
      }

      // Generate Frame.io review link
      console.log(`🎬 Generating review link for project ${projectId}, folder: ${projectFolderId}`);
      const reviewLink = await createFrameioReviewLink(projectFolderId);
      console.log(`🔗 Review link result:`, reviewLink);
      
      if (!reviewLink) {
        return res.status(400).json({ 
          success: false, 
          message: 'No videos found in project or failed to create review link' 
        });
      }

      // Save review link to database
      await storage.updateProject(projectId, {
        mediaReviewLink: reviewLink,
        updatedAt: new Date()
      });

      // Try to send email with review link and instructions
      try {
        await emailService.sendRevisionInstructionsEmail(
          req.user!.email,
          req.user!.firstName,
          project.title,
          reviewLink
        );
        
        res.json({ 
          success: true, 
          reviewLink,
          message: 'Review link generated and email sent successfully' 
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Still return success if review link was generated
        res.json({ 
          success: true, 
          reviewLink,
          message: 'Review link generated successfully (email delivery failed)' 
        });
      }
    } catch (error) {
      console.error('Error generating review link:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate review link' 
      });
    }
  });

  // Submit revision request with instructions
  app.post('/api/projects/:id/request-revision', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { instructions } = req.body;

      // Verify user owns the project
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      // Project must be in 'awaiting revision instructions' status
      if (project.status !== 'awaiting revision instructions') {
        return res.status(400).json({ 
          success: false, 
          message: 'Revision instructions can only be submitted for projects awaiting them' 
        });
      }

      // Update project status to 'revision in progress'
      const updatedProject = await storage.updateProject(projectId, {
        status: 'revision in progress'
      });

      // TODO: Send notification to editors about revision request
      // This could be an email to the editing team with:
      // - Project details
      // - Media platform review link
      // - User's written instructions
      // - Link to any new assets uploaded

      res.json({ 
        success: true, 
        message: 'Revision instructions submitted successfully',
        project: updatedProject
      });
    } catch (error) {
      console.error('Error submitting revision request:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to submit revision request' 
      });
    }
  });

  // Stripe Subscription Routes

  // Check subscription status with Stripe metadata
  app.get(
    "/api/subscription/status",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const user = await storage.getUser(req.user!.id);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        let allowanceFromStripe = user.subscriptionAllowance || 0;
        let productName = user.subscriptionTier || null;

        // If user has active subscription, fetch allowance from Stripe product metadata
        if (user.subscriptionStatus === "active" && user.stripeSubscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              user.stripeSubscriptionId,
            );
            const productId = subscription.items.data[0]?.price
              .product as string;

            if (productId) {
              const product = await stripe.products.retrieve(productId);

              // Get allowance from Stripe product metadata
              if (product.metadata?.allowance) {
                allowanceFromStripe = parseInt(product.metadata.allowance);

                // Update local storage if different
                if (allowanceFromStripe !== user.subscriptionAllowance) {
                  await storage.updateUserSubscription(user.id, {
                    subscriptionAllowance: allowanceFromStripe,
                  });
                }
              }

              productName = product.name;
            }
          } catch (stripeError) {
            console.warn(
              "Failed to fetch Stripe subscription details:",
              stripeError,
            );
            // Continue with stored values
          }
        }

        // Count projects CREATED within the current billing period (not based on status changes)
        const projects = await storage.getProjectsByUser(user.id);
        let usageInPeriod = 0;

        if (user.subscriptionPeriodStart && user.subscriptionPeriodEnd) {
          const periodStart = new Date(user.subscriptionPeriodStart);
          const periodEnd = new Date(user.subscriptionPeriodEnd);

          usageInPeriod = projects.filter((project) => {
            const createdAt = new Date(project.createdAt);
            return (
              createdAt >= periodStart &&
              createdAt <= periodEnd
            ); // Count projects CREATED within the billing period
          }).length;
        }

        res.json({
          success: true,
          subscription: {
            hasActiveSubscription: user.subscriptionStatus === "active",
            status: user.subscriptionStatus,
            tier: user.subscriptionTier,
            productName,
            usage: usageInPeriod,
            allowance: allowanceFromStripe,
            periodStart: user.subscriptionPeriodStart,
            periodEnd: user.subscriptionPeriodEnd,
            stripeCustomerId: user.stripeCustomerId,
            hasReachedLimit: usageInPeriod >= allowanceFromStripe,
          },
        });
      } catch (error) {
        console.error("Get subscription status error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to get subscription status",
        });
      }
    },
  );

  // Create or get subscription (redirect to Stripe checkout)
  app.post(
    "/api/subscription/create-checkout",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { tier } = req.body;

        if (
          !tier ||
          !SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid subscription tier",
          });
        }

        const user = await storage.getUser(req.user!.id);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        let customerId = user.stripeCustomerId;

        // Create Stripe customer if doesn't exist
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            metadata: {
              userId: user.id,
            },
          });
          customerId = customer.id;
          await storage.updateUserStripeInfo(user.id, customerId);
        }

        // Create actual Stripe checkout session using your product IDs
        const tierConfig =
          SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];
        const baseUrl = process.env.REPL_SLUG
          ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
          : "http://localhost:5000";

        // Get the default price for the product
        const prices = await stripe.prices.list({
          product: tierConfig.stripeProductId,
          active: true,
        });

        if (prices.data.length === 0) {
          throw new Error(
            `No active prices found for product ${tierConfig.stripeProductId}`,
          );
        }

        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          payment_method_types: ["card"],
          mode: "subscription",
          line_items: [
            {
              price: prices.data[0].id, // Use the first active price
              quantity: 1,
            },
          ],
          success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/payment-cancelled?checkout=cancelled`,
          metadata: {
            userId: user.id,
            tier: tier,
            productId: tierConfig.stripeProductId,
          },
        });

        res.json({
          success: true,
          message: "Subscription checkout session created",
          checkoutUrl: session.url,
          sessionId: session.id,
          customerId,
        });
      } catch (error) {
        console.error("Create checkout session error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to create checkout session",
        });
      }
    },
  );

  // Test webhook handler for development (bypasses signature verification)
  app.post("/api/test-subscription-sync", async (req, res) => {
    try {
      const { userId, tier, subscriptionId } = req.body;

      if (!userId || !tier || !subscriptionId) {
        return res.status(400).json({
          success: false,
          message: "userId, tier, and subscriptionId are required",
        });
      }

      // Simulate checkout.session.completed webhook
      console.log(`Manual subscription sync for user ${userId}: ${tier}`);

      const tierConfig =
        SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];
      if (!tierConfig) {
        return res.status(400).json({
          success: false,
          message: "Invalid tier",
        });
      }

      // Update user subscription status
      await storage.updateUserSubscription(userId, {
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: "active",
        subscriptionTier: tier,
        subscriptionUsage: 0,
        subscriptionAllowance: tierConfig.allowance,
        subscriptionPeriodStart: new Date(),
        subscriptionPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });

      console.log(`Subscription manually synced for user ${userId}: ${tier}`);

      res.json({
        success: true,
        message: `Subscription synced for user ${userId}`,
        tier,
        allowance: tierConfig.allowance,
      });
    } catch (error) {
      console.error("Manual subscription sync error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to sync subscription",
      });
    }
  });

  // Project Management Routes

  // Get user's projects
  app.get(
    "/api/projects",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const projects = await storage.getProjectsByUser(req.user!.id);
        
        // Calculate true "Last Updated" timestamp for each project based on latest activity
        const projectsWithActualLastUpdated = await Promise.all(
          projects.map(async (project) => {
            let latestActivityDate = new Date(project.createdAt);
            
            try {
              // Check latest photo upload
              const photoFiles = await storage.getPhotoFilesByProject(project.id);
              if (photoFiles.length > 0) {
                const latestPhotoDate = new Date(Math.max(...photoFiles.map(f => new Date(f.uploadDate).getTime())));
                console.log(`Latest photo date for project ${project.id}: ${latestPhotoDate}`);
                if (latestPhotoDate > latestActivityDate) {
                  latestActivityDate = latestPhotoDate;
                }
              }
              
              // Check latest Tally form submission
              const tallySubmission = await storage.getTallyFormSubmission(project.id);
              if (tallySubmission && tallySubmission.submittedAt) {
                const tallyDate = new Date(tallySubmission.submittedAt);
                console.log(`Latest Tally submission date for project ${project.id}: ${tallyDate}`);
                if (tallyDate > latestActivityDate) {
                  latestActivityDate = tallyDate;
                }
              }
              
              // Check latest video upload via Frame.io API
              if (project.mediaFolderId) {
                try {
                  // Use the project's mediaFolderId which already contains the full path
                  console.log(`Checking videos for project ${project.id} in folder: ${project.mediaFolderId}`);
                  
                  const frameioVideos = await frameioService.getFolderAssets(project.mediaFolderId);
                  if (frameioVideos.length > 0) {
                    const videoDates = frameioVideos
                      .map((v: any) => v.created_time ? new Date(v.created_time) : null)
                      .filter(date => date !== null);
                    
                    if (videoDates.length > 0) {
                      const latestVideoDate = new Date(Math.max(...videoDates.map(d => d!.getTime())));
                      console.log(`Latest video date for project ${project.id}: ${latestVideoDate}`);
                      if (latestVideoDate > latestActivityDate) {
                        latestActivityDate = latestVideoDate;
                      }
                    }
                  }
                } catch (frameioError) {
                  console.log(`Could not fetch Frame.io videos for project ${project.id}:`, frameioError);
                }
              }
              
            } catch (error) {
              console.error(`Error calculating last activity for project ${project.id}:`, error);
            }
            
            console.log(`Final calculated last activity date for project ${project.id}: ${latestActivityDate}`);
            
            // Always update with the calculated timestamp for accurate display
            const updated = await storage.updateProject(project.id, {
              updatedAt: latestActivityDate,
            });
            
            const finalProject = updated || { ...project, updatedAt: latestActivityDate.toISOString() };
            console.log(`Returning project ${project.id} with updatedAt: ${finalProject.updatedAt}`);
            
            return finalProject;
          })
        );
        
        // Ensure fresh data by preventing caching
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        
        res.json({
          success: true,
          projects: projectsWithActualLastUpdated,
        });
      } catch (error) {
        console.error("Get projects error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to get projects",
        });
      }
    },
  );

  // Create new project with subscription check
  app.post(
    "/api/projects",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        // Check subscription status before creating project
        const user = await storage.getUser(req.user!.id);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        // Check if user has active subscription
        if (user.subscriptionStatus !== "active") {
          return res.status(403).json({
            success: false,
            message: "Active subscription required to create projects",
            requiresSubscription: true,
            subscriptionStatus: user.subscriptionStatus,
          });
        }

        // Check if user has exceeded usage limit by counting non-draft projects in current period
        const projects = await storage.getProjectsByUser(req.user!.id);
        let usageInPeriod = 0;

        if (user.subscriptionPeriodStart && user.subscriptionPeriodEnd) {
          const periodStart = new Date(user.subscriptionPeriodStart);
          const periodEnd = new Date(user.subscriptionPeriodEnd);

          usageInPeriod = projects.filter((project) => {
            const createdAt = new Date(project.createdAt);
            return (
              createdAt >= periodStart &&
              createdAt <= periodEnd &&
              project.status !== "draft"
            ); // Count all non-draft projects
          }).length;
        }

        const allowance = user.subscriptionAllowance || 0;

        if (usageInPeriod >= allowance) {
          return res.status(403).json({
            success: false,
            message: "Project limit reached for your subscription tier",
            requiresUpgrade: true,
            currentUsage: usageInPeriod,
            allowance,
            tier: user.subscriptionTier,
          });
        }

        const validatedData = insertProjectSchema.parse(req.body);
        const project = await storage.createProject(
          req.user!.id,
          validatedData,
        );

        // Increment user usage count for successful project creation
        await storage.incrementUserUsage(req.user!.id);

        // Configure Frame.io virtual organization structure
        try {
          console.log(
            `Configuring Frame.io integration for user ${req.user!.id} (${req.user!.email})`,
          );
          
          // Create virtual folder structure for future use
          const userFolderId = await frameioService.createUserFolder(
            req.user!.id,
            req.user!.email,
          );
          
          const projectFolderId = await frameioService.createProjectFolder(
            userFolderId,
            project.id,
            project.title,
          );

          // Store organization structure in database
          await storage.updateProjectMediaInfo(
            project.id,
            projectFolderId,
            userFolderId,
          );

          const updatedProject = await storage.getProject(project.id);

          console.log(
            `✓ Frame.io organization structure configured: ${userFolderId} -> ${projectFolderId}`,
          );

          res.status(201).json({
            success: true,
            message: "Project created successfully",
            project: updatedProject,
            frameio: {
              status: 'configured',
              note: 'Ready for upload organization when Frame.io Pro permissions are available',
              userPath: userFolderId,
              projectPath: projectFolderId,
            },
          });
        } catch (frameioError) {
          console.error("Frame.io configuration failed:", frameioError);
          res.status(201).json({
            success: true,
            message: "Project created successfully",
            project,
            warning: "Frame.io configuration unavailable",
          });
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid project data",
            errors: error.errors,
          });
        } else {
          console.error("Create project error:", error);
          res.status(500).json({
            success: false,
            message: "Failed to create project",
          });
        }
      }
    },
  );

  // Project acceptance endpoint
  app.post("/api/projects/:id/accept", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Verify project belongs to user
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ 
          success: false, 
          message: "Project not found" 
        });
      }
      
      // Verify project is in "delivered" status
      if (project.status !== 'delivered') {
        return res.status(400).json({ 
          success: false, 
          message: "Project must be in delivered status to accept" 
        });
      }
      
      // Update project status to "complete"
      await storage.updateProject(projectId, {
        status: 'complete',
        updatedAt: new Date(),
      });
      
      // Get user details for completion email
      const user = await storage.getUserById(userId);
      
      // Get the download link from project files
      const projectFiles = await storage.getProjectFiles(projectId);
      const deliveredVideo = projectFiles.find(file => file.mediaAssetUrl);
      
      if (user && deliveredVideo?.mediaAssetUrl) {
        // Send completion confirmation email
        const emailTemplate = emailService.generateProjectCompletionEmail(
          user.email,
          project.title,
          deliveredVideo.mediaAssetUrl
        );
        
        await emailService.sendEmail(emailTemplate);
        console.log(`Project completion email sent to ${user.email} for project ${projectId}`);
      }
      
      res.json({ 
        success: true, 
        message: "Project accepted successfully",
        project: { ...project, status: 'complete' }
      });
    } catch (error) {
      console.error("Project acceptance error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to accept project" 
      });
    }
  });

  // Get video download link endpoint
  app.get("/api/projects/:id/download-link", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Get user ID from authenticated request
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }
      
      // Verify project belongs to user
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ 
          success: false, 
          message: "Project not found" 
        });
      }
      
      // Try to get download link from project files first
      const projectFiles = await storage.getProjectFiles(projectId);
      const deliveredVideo = projectFiles.find(file => file.mediaAssetUrl);
      
      if (deliveredVideo?.mediaAssetUrl) {
        return res.json({ 
          success: true, 
          downloadLink: deliveredVideo.mediaAssetUrl,
          filename: deliveredVideo.filename
        });
      }
      
      // If no stored download link, try to generate one from Frame.io videos
      if (project.mediaFolderId) {
        try {
          const frameioVideos = await frameioService.getFolderAssets(project.mediaFolderId);
          if (frameioVideos && frameioVideos.length > 0) {
            const latestVideo = frameioVideos[0];
            const videoId = latestVideo.id || latestVideo.uri?.split('/').pop();
            
            // Generate download link for the latest video
            const downloadLink = await frameioService.generateAssetDownloadLink(videoId);
            
            if (downloadLink) {
              return res.json({
                success: true,
                downloadLink: downloadLink,
                filename: latestVideo.name
              });
            }
          }
        } catch (frameioError) {
          console.error('Error generating download link from Frame.io:', frameioError);
        }
      }
      
      return res.status(404).json({ 
        success: false, 
        message: "No download link available for this project" 
      });
    } catch (error) {
      console.error("Get download link error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get download link" 
      });
    }
  });

  // Direct video download endpoint - triggers file download to user's device
  app.get("/api/projects/:id/download-video", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Get user ID from authenticated request (handle both session and Supabase auth)
      const userId = req.session?.userId || req.user?.id;
      
      if (!userId) {
        console.error('No user ID found in request:', { session: !!req.session, user: !!req.user });
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }
      
      // Verify project belongs to user
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ 
          success: false, 
          message: "Project not found" 
        });
      }
      
      // Get the latest video from the Frame.io folder
      if (!project.mediaFolderId) {
        return res.status(404).json({
          success: false,
          message: "No Frame.io folder configured for this project"
        });
      }
      
      const frameioVideos = await frameioService.getFolderAssets(project.mediaFolderId);
      if (!frameioVideos || frameioVideos.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No videos found for this project"
        });
      }

      const latestVideo = frameioVideos[0];
      const videoId = latestVideo.id;

      if (!videoId) {
        return res.status(404).json({
          success: false,
          message: "Invalid video ID"
        });
      }

      // Get the direct download link
      // Use Frame.io download functionality instead
      const downloadLink = await frameioService.generateAssetDownloadLink(videoId);

      if (!downloadLink) {
        return res.status(404).json({
          success: false,
          message: "No download link available"
        });
      }

      console.log(`Got download link for video ${videoId}: ${downloadLink}`);

      // Check if it's a direct file URL that we can proxy for download
      if (downloadLink.includes('.mp4') || downloadLink.includes('.mov') || downloadLink.includes('akamaized') || downloadLink.includes('progressive') || downloadLink.includes('frame.io')) {
        try {
          console.log('Attempting to proxy direct video file download...');
          
          // Fetch the video file directly
          const response = await fetch(downloadLink, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (!response.ok) {
            console.error(`Failed to fetch video file: ${response.status} ${response.statusText}`);
            return res.redirect(downloadLink);
          }
          
          // Set headers for file download
          const filename = `${latestVideo.name || `video_${videoId}`}.mp4`;
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Content-Type', 'video/mp4');
          
          // Get content length if available
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            res.setHeader('Content-Length', contentLength);
          }
          
          console.log(`Streaming video file: ${filename} (${contentLength || 'unknown size'})`);
          
          // Stream the video file using Node.js streams
          if (response.body) {
            const reader = response.body.getReader();
            
            const pump = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  res.write(Buffer.from(value));
                }
                res.end();
                console.log('✅ Video download completed successfully');
              } catch (streamError) {
                console.error('Error during video streaming:', streamError);
                if (!res.headersSent) {
                  res.status(500).json({ success: false, message: 'Stream error' });
                }
              }
            };
            
            await pump();
          } else {
            throw new Error('No response body available');
          }
        } catch (proxyError) {
          console.error('Error proxying video file:', proxyError);
          // Fallback to redirect
          res.redirect(downloadLink);
        }
      } else {
        // Redirect to media platform page for non-direct URLs
        console.log('Redirecting to media platform page for download');
        res.redirect(downloadLink);
      }
    } catch (error) {
      console.error("Error downloading video:", error);
      res.status(500).json({
        success: false,
        message: "Failed to download video"
      });
    }
  });

  // Create revision payment session endpoint
  app.post("/api/stripe/create-revision-session", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.body;
      console.log("Revision payment request body:", req.body);
      console.log("ProjectId received:", projectId, "Type:", typeof projectId);
      console.log("User ID:", req.user!.id);

      // Verify the price from Stripe
      let priceToUse = 'price_1Rt2ZhCp6pJe31oC6uMZuOev';
      try {
        const priceInfo = await stripe.prices.retrieve(priceToUse);
        console.log("Stripe price verification:", {
          id: priceInfo.id,
          unit_amount: priceInfo.unit_amount,
          currency: priceInfo.currency,
          product: priceInfo.product,
          active: priceInfo.active
        });
        
        // If this price is not $5, let's find the correct one
        if (priceInfo.unit_amount !== 500) {
          console.log("Price amount mismatch. Looking for correct $5 price...");
          const prices = await stripe.prices.list({
            product: 'prod_Sofv7gScQiz672',
            active: true
          });
          console.log("All prices for product:", prices.data.map(p => ({
            id: p.id,
            unit_amount: p.unit_amount,
            currency: p.currency
          })));
          
          const correctPrice = prices.data.find(p => p.unit_amount === 500);
          if (correctPrice) {
            priceToUse = correctPrice.id;
            console.log("Found correct $5 price:", correctPrice.id);
          }
        }
      } catch (error) {
        console.error("Error verifying price:", error);
      }

      // Convert to number if it's a string
      const numericProjectId = typeof projectId === 'string' ? parseInt(projectId, 10) : projectId;

      if (!numericProjectId || typeof numericProjectId !== 'number' || isNaN(numericProjectId)) {
        console.log("Invalid project ID validation failed:", numericProjectId);
        return res.status(400).json({
          success: false,
          message: "Valid project ID is required",
        });
      }

      // Verify project exists and user has access
      const project = await storage.getProject(numericProjectId);
      console.log("Project lookup result:", {
        projectExists: !!project,
        projectId: project?.id,
        projectStatus: project?.status,
        projectUserId: project?.userId,
        requestUserId: req.user!.id
      });
      
      if (!project || project.userId !== req.user!.id) {
        console.log("Project access check failed - no access");
        return res.status(404).json({
          success: false,
          message: "Project not found or access denied",
        });
      }

      // Check if project is in correct status for revision request
      const validRevisionStatuses = ["video is ready", "delivered", "complete"];
      if (!validRevisionStatuses.includes(project.status.toLowerCase())) {
        console.log("Invalid project status for revision:", project.status);
        return res.status(400).json({
          success: false,
          message: "Project must be delivered or completed to request revisions",
        });
      }

      // Create Stripe checkout session for revision payment
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price: priceToUse,
            quantity: 1,
          },
        ],
        success_url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/dashboard?revision_payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/dashboard?revision_payment=cancelled`,
        metadata: {
          projectId: numericProjectId.toString(),
          userId: req.user!.id,
          type: 'revision_payment',
        },
      });

      // Store revision payment record
      await storage.createRevisionPayment(req.user!.id, {
        projectId: numericProjectId,
        stripeCheckoutSessionId: session.id,
        paymentAmount: 500, // $5.00 in cents
        currency: 'usd',
      });

      res.json({
        success: true,
        sessionUrl: session.url,
        sessionId: session.id,
      });

    } catch (error) {
      console.error("Error creating revision payment session:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create revision payment session",
      });
    }
  });

  // Generate media platform review link and start revision process
  app.post("/api/projects/:id/generate-review-link", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;

      console.log(`Generating review link for project ${projectId} by user ${userId}`);

      // Get project details
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Verify ownership
      if (project.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Check if project is in correct status for review link generation
      if (project.status.toLowerCase() !== "awaiting revision instructions") {
        return res.status(400).json({
          success: false,
          message: "Project must be awaiting revision instructions to generate review link",
        });
      }

      // Get the latest video for review
      // Get videos from the folder and find latest
      const folderVideos = await frameioService.getFolderAssets(project.mediaFolderId!);
      const latestVideo = folderVideos.find(asset => asset.type === 'video');
      if (!latestVideo) {
        return res.status(404).json({
          success: false,
          message: "No video found for review",
        });
      }

      // Create media platform review link using project folder ID
      const projectFolderId = project.mediaFolderId?.split('/').pop();
      if (!projectFolderId) {
        return res.status(400).json({
          success: false,
          message: "No media platform folder found for this project",
        });
      }
      
      const reviewLink = await createFrameioReviewLink(projectFolderId);

      // Store review link in project
      await storage.updateProject(projectId, {
        mediaReviewLink: reviewLink,
        updatedAt: new Date(),
      });

      // Get user for email
      const user = await storage.getUser(userId);
      if (user && user.email) {
        // Send revision instruction email
        const emailTemplate = emailService.generateRevisionInstructionEmail(
          user.email,
          project.title,
          reviewLink || '',
          projectId
        );

        try {
          await emailService.sendEmail(emailTemplate);
          console.log(`Revision instruction email sent to ${user.email} for project ${projectId}`);
        } catch (emailError) {
          console.error("Failed to send revision instruction email:", emailError);
        }
      }

      res.json({
        success: true,
        reviewLink,
        videoName: latestVideo.name,
        message: "Review link generated successfully",
      });

    } catch (error) {
      console.error("Error generating review link:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate review link",
      });
    }
  });

  // Request revision endpoint
  app.post("/api/projects/:id/request-revision", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { revisionNotes } = req.body;
      
      // Verify project belongs to user
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ 
          success: false, 
          message: "Project not found" 
        });
      }
      
      // Verify project is in "delivered" or "complete" status
      if (!['delivered', 'complete'].includes(project.status.toLowerCase())) {
        return res.status(400).json({ 
          success: false, 
          message: "Project must be delivered or complete to request revision" 
        });
      }
      
      // Update project status to "revision in progress"
      await storage.updateProject(projectId, {
        status: 'revision in progress',
        updatedAt: new Date(),
      });
      
      // Get user details for revision notification email
      const user = await storage.getUserById(userId);
      
      if (user) {
        // Send revision request notification to team (using same delivery template but different subject)
        const emailTemplate = {
          to: ['team@mementiq.com'], // Replace with actual team email
          subject: `Revision Requested: ${project.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2abdee;">Revision Request</h2>
              
              <p>A revision has been requested for project: <strong>${project.title}</strong></p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Client Details:</h3>
                <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Company:</strong> ${user.company || 'N/A'}</p>
              </div>

              ${revisionNotes ? `
                <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>Revision Notes:</h3>
                  <p style="white-space: pre-wrap;">${revisionNotes}</p>
                </div>
              ` : ''}
              
              <p>Please begin working on the revision for this project.</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #666;">
                <p>This is an automated notification from Mementiq</p>
              </div>
            </div>
          `,
        };
        
        await emailService.sendEmail(emailTemplate);
        console.log(`Revision request email sent for project ${projectId}`);
      }
      
      res.json({ 
        success: true, 
        message: "Revision requested successfully",
        project: { ...project, status: 'revision in progress' }
      });
    } catch (error) {
      console.error("Revision request error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to request revision" 
      });
    }
  });

  // Get project by ID
  app.get("/api/projects/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Check if user owns this project
      if (project.userId !== String(req.session.userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Get project files
      const files = await storage.getProjectFiles(projectId);

      res.json({
        success: true,
        project: {
          ...project,
          files,
        },
      });
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get project",
      });
    }
  });

  // Update project
  app.put("/api/projects/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Check if user owns this project
      if (project.userId !== String(req.session.userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const validatedData = updateProjectSchema.parse(req.body);
      const updatedProject = await storage.updateProject(
        projectId,
        validatedData,
      );

      res.json({
        success: true,
        message: "Project updated successfully",
        project: updatedProject,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid project data",
          errors: error.errors,
        });
      } else {
        console.error("Update project error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to update project",
        });
      }
    }
  });

  // List files endpoint for debugging
  app.get("/api/list-files", async (req, res) => {
    try {
      console.log("Attempting to list Object Storage files...");
      const listResult = await objectStorageClient.list();
      console.log("List result:", JSON.stringify(listResult, null, 2));
      res.json(listResult);
    } catch (error) {
      console.error("Object Storage list error:", error);
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : String(error),
        });
    }
  });

  // Get latest video from project folder
  app.get("/api/projects/:id/latest-video", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Check if user owns this project (handle both session and Supabase auth)
      const userId = req.session?.userId || req.user?.claims?.sub;
      if (project.userId !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Get the latest video from project files in database
      const projectFiles = await storage.getProjectFiles(projectId);
      const latestVideo = projectFiles
        .filter(file => file.mediaAssetId)
        .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())[0];

      if (latestVideo?.mediaAssetId) {
        console.log(`Found video in DB for project ${projectId}:`, latestVideo.mediaAssetId);
        res.json({
          success: true,
          videoId: latestVideo.mediaAssetId,
          filename: latestVideo.filename,
          uploadDate: latestVideo.uploadDate
        });
      } else {
        // If no video in DB, try to get from Frame.io folder directly
        console.log(`No video in DB for project ${projectId}, checking Frame.io folder`);
        try {
          if (project.mediaFolderId) {
            const frameioAssets = await frameioService.getFolderAssets(project.mediaFolderId);
            if (frameioAssets && frameioAssets.length > 0) {
              // Get the most recent asset
              const latestAsset = frameioAssets[0]; // Already sorted by date
              console.log(`Found asset in Frame.io folder:`, latestAsset.id);
              
              res.json({
                success: true,
                videoId: latestAsset.id,
                filename: latestAsset.name,
                uploadDate: latestAsset.uploaded_at,
                directLink: latestAsset.download_url
              });
            } else {
              res.json({
                success: false,
                message: "No video found for this project"
              });
            }
          } else {
            res.json({
              success: false,
              message: "No Frame.io folder configured for this project"
            });
          }
        } catch (frameioError) {
          console.error('Error fetching from Frame.io:', frameioError);
          res.json({
            success: false,
            message: "No video found for this project"
          });
        }
      }
    } catch (error) {
      console.error("Get latest video error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get latest video",
      });
    }
  });

  // Test Frame.io asset API to check for asset details (for debugging)
  app.get("/api/test-frameio-asset/:assetId", async (req, res) => {
    try {
      const { assetId } = req.params;
      console.log(`Testing Frame.io API for asset ${assetId}...`);
      
      const assetDetails = await frameioService.getAssetDetails(assetId);
      
      res.json({
        success: true,
        assetId,
        assetData: assetDetails,
        hasApiAccess: true
      });
      
    } catch (error: any) {
      console.error("Test Frame.io API error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to test Frame.io API",
        error: error.message,
        assetId: req.params.assetId
      });
    }
  });

  // Test video delivery email (for debugging)
  app.post("/api/test-delivery-email", async (req, res) => {
    try {
      console.log("Testing video delivery email...");
      const { userEmail, projectTitle, downloadLink, projectId } = req.body;
      
      if (!userEmail || !projectTitle || !downloadLink || !projectId) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: userEmail, projectTitle, downloadLink, projectId"
        });
      }

      // Generate and send video delivery email using the actual service
      const emailTemplate = emailService.generateVideoDeliveryEmail(
        userEmail,
        projectTitle,
        downloadLink,
        projectId
      );
      
      await emailService.sendEmail(emailTemplate);
      
      res.json({
        success: true,
        message: "Video delivery email sent successfully",
        recipient: userEmail,
        projectTitle,
        projectId
      });
    } catch (error: any) {
      console.error("Video delivery email test error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Video delivery email test failed"
      });
    }
  });

  // Test email integration (for debugging)
  app.post("/api/test-email", async (req, res) => {
    try {
      console.log("Testing Resend email integration...");
      const { to, subject, message } = req.body;
      
      if (!to || !subject || !message) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: to, subject, message"
        });
      }

      const emailTemplate = {
        to: [to],
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2abdee;">Test Email - Mementiq System</h2>
            <p>${message}</p>
            <p><strong>This is a test email to verify the Resend API integration.</strong></p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #666;">
              <p>This is an automated test email from Mementiq</p>
            </div>
          </div>
        `,
      };

      await emailService.sendEmail(emailTemplate);
      
      res.json({
        success: true,
        message: "Test email sent successfully",
        recipient: to
      });
    } catch (error: any) {
      console.error("Email test error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Email test failed"
      });
    }
  });

  // Test Frame.io photo integration (for debugging)
  app.post("/api/test-frameio-photo", async (req, res) => {
    try {
      console.log("Testing Frame.io photo integration...");
      
      if (!frameioService.isConfigured()) {
        return res.status(500).json({
          success: false,
          message: "Frame.io is not properly configured"
        });
      }

      // Initialize service to get team ID
      await frameioService.initialize();

      // Create test folder for API verification
      const rootProject = await frameioService.getOrCreateRootProject();
      const testFolder = await frameioService.getOrCreateFolder('API_Test', rootProject.root_asset_id);

      // Upload a test photo (1x1 pixel PNG)
      const result = await frameioService.uploadPhoto(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'api-test.png',
        testFolder.id,
        'test-user'
      );

      res.json({
        success: true,
        message: "Frame.io photo integration working properly",
        result
      });
    } catch (error: any) {
      console.error("Frame.io photo test error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Frame.io photo test failed"
      });
    }
  });

  // Serve Object Storage assets with HTTP Range support for video streaming
  app.get("/api/assets/*", async (req, res) => {
    try {
      // Strip EditingPortfolioAssets prefix and keep the full Objects/ path
      let assetPath = req.params[0] || "";
      if (assetPath.startsWith("EditingPortfolioAssets/")) {
        assetPath = assetPath.replace("EditingPortfolioAssets/", "");
      }

      const isVideo = assetPath.includes("Videos/");
      const isThumbnail = assetPath.includes("Thumbnails/");
      const range = req.headers.range;

      // Clean cache periodically
      if (Math.random() < 0.1) cleanCache(); // 10% chance to clean on each request

      // Check cache for thumbnails and videos
      if (isThumbnail && assetCache.has(assetPath)) {
        const cached = assetCache.get(assetPath)!;
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          console.log(`Thumbnail cache hit for: ${assetPath}`);
          res.set({
            "Content-Type": cached.contentType,
            "Cache-Control": "public, max-age=600",
            ETag: `"${assetPath}-${cached.timestamp}"`,
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
            "Content-Type": cached.contentType,
            "Cache-Control": "public, max-age=3600",
            "Content-Length": cached.content.length.toString(),
            "Accept-Ranges": "bytes",
            ETag: `"${assetPath}-${cached.timestamp}"`,
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
          "Content-Type": result.contentType,
          "Cache-Control": isVideo
            ? "public, max-age=3600"
            : "public, max-age=600",
          "Content-Length": result.content.length.toString(),
          "Accept-Ranges": isVideo ? "bytes" : "none",
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
            timestamp: Date.now(),
          });
        } else if (isVideo && result.content.length < 50 * 1024 * 1024) {
          // Cache videos up to 50MB
          videoCache.set(assetPath, {
            content: result.content,
            contentType: result.contentType,
            timestamp: Date.now(),
          });
          console.log(
            `Cached video: ${assetPath} (${result.content.length} bytes)`,
          );
        }

        // For new video downloads, serve full content for smooth playback
        res.set({
          "Content-Type": result.contentType,
          "Cache-Control": isVideo
            ? "public, max-age=3600"
            : "public, max-age=600",
          "Content-Length": result.content.length.toString(),
          ETag: `"${assetPath}-${Date.now()}"`,
          "Accept-Ranges": isVideo ? "bytes" : "none",
          Connection: "keep-alive",
        });

        res.send(Buffer.from(result.content));
      } finally {
        pendingRequests.delete(assetPath);
      }
    } catch (error) {
      console.error("Asset serving error:", error);
      res.status(500).json({ error: "Failed to serve asset" });
    }
  });

  // Helper function to handle video range requests with optimized chunk sizes
  function handleVideoRange(
    req: Request,
    res: Response,
    content: Uint8Array,
    contentType: string,
  ) {
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

    const chunksize = end - start + 1;
    const chunk = content.slice(start, end + 1);

    console.log(
      `Range request: ${start}-${end}/${content.length} (${chunksize} bytes) ${start === 0 ? "(INITIAL)" : ""}`,
    );

    res.status(206); // Partial Content
    res.set({
      "Content-Range": `bytes ${start}-${end}/${content.length}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize.toString(),
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    });

    res.send(Buffer.from(chunk));
  }

  // Legacy server upload route (removed - TUS direct upload only)
  app.post(
    "/api/projects/:id/upload",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      res.status(410).json({
        success: false,
        message:
          "Server uploads are no longer supported. Please use direct TUS upload to media platform.",
        migration:
          "Use /api/projects/:id/upload-session endpoint for direct uploads",
      });
    },
  );

  // Create direct media platform upload session
  app.post(
    "/api/projects/:id/upload-session",
    requireAuth,
    requireProjectAccess,
    async (req: AuthenticatedRequest, res) => {
      try {
        const projectId = parseInt(req.params.id);
        const { fileName, fileSize } = req.body;

        if (!fileName || !fileSize) {
          return res.status(400).json({
            success: false,
            message: "fileName and fileSize are required",
          });
        }

        // Get project and verify ownership
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({
            success: false,
            message: "Project not found",
          });
        }

        if (project.userId !== req.user!.id) {
          return res.status(403).json({
            success: false,
            message: "Access denied",
          });
        }

        // Check size limits (10GB per project)
        const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
        const currentSize = await getProjectUploadSize(projectId);

        if (currentSize + fileSize > maxSize) {
          return res.status(400).json({
            success: false,
            message: `Upload would exceed 10GB limit for this project. Current: ${Math.round(currentSize / 1024 / 1024)}MB, Requested: ${Math.round(fileSize / 1024 / 1024)}MB`,
          });
        }

        // Create Frame.io upload session
        const uploadSession = await createFrameioUploadSession(
          fileName,
          fileSize,
          'video/mp4', // Default MIME type, should be passed from frontend
          project.mediaFolderId || '', // Frame.io folder ID
        );

        console.log("Raw Frame.io uploadSession object:", uploadSession);
        console.log("Upload session keys:", Object.keys(uploadSession));

        const sessionResponse = {
          uploadUrl: uploadSession.uploadUrl,
          videoUri: uploadSession.assetId,
          completeUri: uploadSession.completeUri,
          assetId: uploadSession.assetId,
        };

        console.log("Sending upload session response:", sessionResponse);

        res.json({
          success: true,
          uploadSession: sessionResponse,
        });
      } catch (error) {
        console.error("Create upload session error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to create upload session",
        });
      }
    },
  );

  // Complete direct media platform upload
  app.post(
    "/api/projects/:id/complete-upload",
    requireAuth,
    requireProjectAccess,
    async (req: AuthenticatedRequest, res) => {
      try {
        console.log("Complete upload request body:", req.body);
        console.log("Complete upload body keys:", Object.keys(req.body || {}));
        console.log("Auth user:", req.user?.id);

        const projectId = parseInt(req.params.id);
        const { completeUri, videoUri, fileName, fileSize } = req.body;

        console.log("Extracted values:", {
          completeUri,
          videoUri,
          fileName,
          fileSize,
        });

        if (!videoUri || !fileName) {
          console.error("Missing required fields:", {
            hasCompleteUri: !!completeUri,
            hasVideoUri: !!videoUri,
            hasFileName: !!fileName,
          });
          return res.status(400).json({
            success: false,
            message: "videoUri and fileName are required",
          });
        }

        console.log(
          "All required fields present, proceeding with upload completion",
        );

        // Get project and verify ownership
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({
            success: false,
            message: "Project not found",
          });
        }

        if (project.userId !== req.user!.id) {
          return res.status(403).json({
            success: false,
            message: "Access denied",
          });
        }

        // Complete the Frame.io upload
        console.log(
          "Completing Frame.io upload for asset:",
          videoUri
        );

        // Get asset details from Frame.io
        const videoDetails = await completeFrameioUpload(
          videoUri,
          fileName,
          fileSize
        );

        // Save file record
        const fileRecord = await storage.createProjectFile(projectId, {
          mediaAssetId: videoUri.replace("/videos/", ""),
          filename: fileName,
          originalFilename: fileName,
          fileType: "video",
          fileSize: fileSize || 0,
        });

        // If project is still in draft status, update to "awaiting instructions" after first upload
        if (project.status === "draft") {
          await storage.updateProject(projectId, {
            status: "awaiting instructions",
          });
        }

        res.json({
          success: true,
          message: "Upload completed successfully",
          file: fileRecord,
          videoDetails,
        });
      } catch (error) {
        console.error("Complete upload error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to complete upload",
        });
      }
    },
  );

  // Get project files with media platform data and storage usage
  app.get(
    "/api/projects/:id/files",
    requireAuth,
    requireProjectAccess,
    async (req: AuthenticatedRequest, res) => {
      try {
        const projectId = parseInt(req.params.id);

        const project = await storage.getProject(projectId);
        if (!project) {
          return res
            .status(404)
            .json({ success: false, message: "Project not found" });
        }

        if (project.userId !== req.user!.id) {
          return res
            .status(403)
            .json({ success: false, message: "Access denied" });
        }

        const files = await storage.getProjectFiles(projectId);
        const totalSize = await getProjectUploadSize(projectId);
        const maxSize = 10 * 1024 * 1024 * 1024; // 10GB limit

        // Get Frame.io folder videos if folder exists
        let frameioVideos: any[] = [];
        if (project.mediaFolderId) {
          try {
            const rawFrameioVideos = await frameioService.getFolderAssets(project.mediaFolderId);
            console.log(
              "Frame.io videos fetched:",
              rawFrameioVideos.length,
              "videos",
            );

            // Process Frame.io videos to extract proper names and file sizes
            frameioVideos = rawFrameioVideos.map((video) => {
              // Get file size - try multiple possible fields
              let fileSize = 0;
              if (video.filesize) {
                fileSize = video.filesize;
              } else {
                // Fallback to database file size
                const videoId = video.id;
                const dbFile = files.find(
                  (f) => f.mediaAssetId && f.mediaAssetId.includes(videoId),
                );
                if (dbFile) {
                  fileSize = dbFile.fileSize || 0;
                }
              }

              // Use the video name or fallback to database filename
              let videoName = video.name;
              if (
                !videoName ||
                videoName.includes(".MOV") ||
                videoName.includes(".mp4")
              ) {
                // Find matching database file for better name
                const videoId = video.id;
                const dbFile = files.find(
                  (f) => f.mediaAssetId && f.mediaAssetId.includes(videoId),
                );
                if (dbFile) {
                  videoName = dbFile.filename;
                }
              }

              return {
                name: videoName || "Unnamed Video",
                file_size: fileSize,
                created_time: video.created_time,
                uri: video.id,
                media_id: video.id,
              };
            });

            console.log(
              "Processed Frame.io videos:",
              frameioVideos.map((v) => ({
                name: v.name,
                size: v.file_size,
                id: v.media_id,
              })),
            );
          } catch (error) {
            console.warn("Failed to fetch Frame.io folder videos:", error);
            console.log(
              "Using database files as fallback. Files found:",
              files.length,
            );
            // Try to get project files from database as fallback
            frameioVideos = files.map((file) => {
              console.log(
                "Mapping file:",
                file.filename,
                "size:",
                file.fileSize,
              );
              return {
                name: file.filename,
                file_size: file.fileSize || 0,
                created_time: file.uploadDate,
                uri: file.mediaAssetId,
              };
            });
          }
        } else {
          console.log(
            "No media platform folder, using database files. Files found:",
            files.length,
          );
          // Use database files if no Frame.io folder
          frameioVideos = files.map((file) => {
            console.log(
              "Mapping file (no folder):",
              file.filename,
              "size:",
              file.fileSize,
            );
            return {
              name: file.filename,
              file_size: file.fileSize || 0,
              created_time: file.uploadDate,
              uri: file.mediaAssetId,
            };
          });
        }

        // Calculate storage from Frame.io videos if available, fallback to database files
        let calculatedSize = totalSize;
        if (frameioVideos.length > 0) {
          calculatedSize = frameioVideos.reduce(
            (sum: number, video: any) => sum + (video.file_size || 0),
            0,
          );
        }

        const totalSizeGB = parseFloat(
          (calculatedSize / (1024 * 1024 * 1024)).toFixed(2),
        ); // Use 2 decimal places for small files
        const totalSizeMB = parseFloat(
          (calculatedSize / (1024 * 1024)).toFixed(1),
        ); // Also calculate MB
        const percentUsed = parseFloat(
          ((calculatedSize / maxSize) * 100).toFixed(2),
        ); // More precise percentage for progress bar

        console.log("Final response data:", {
          filesCount: files.length,
          frameioVideosCount: frameioVideos.length,
          frameioVideoSizes: frameioVideos.map((v: any) => ({
            name: v.name,
            size: v.file_size,
          })),
          calculatedSize,
          totalSizeGB,
          totalSizeMB,
          storageObject: {
            used: calculatedSize,
            max: maxSize,
            usedGB: totalSizeGB,
            usedMB: totalSizeMB,
            maxGB: 10,
            percentUsed,
          },
        });

        res.json({
          success: true,
          data: {
            files,
            frameioVideos,
            storage: {
              used: calculatedSize,
              max: maxSize,
              usedGB: totalSizeGB,
              usedMB: totalSizeMB,
              maxGB: 10,
              percentUsed,
            },
          },
        });
      } catch (error) {
        console.error("Error fetching project files:", error);
        res
          .status(500)
          .json({ success: false, message: "Failed to fetch files" });
      }
    },
  );

  // Get user's Frame.io folders (security check)
  app.get(
    "/api/frameio/folders",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const folders = await frameioService.getUserFolders(req.user!.id);
        res.json({ success: true, data: folders });
      } catch (error) {
        console.error("Error fetching Frame.io folders:", error);
        res
          .status(500)
          .json({ success: false, message: "Failed to fetch folders" });
      }
    },
  );

  // Verify video upload status
  app.post(
    "/api/upload/verify-video",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { videoId, projectId } = req.body;

        if (!videoId || !projectId) {
          return res.status(400).json({
            success: false,
            message: "Video ID and project ID are required",
          });
        }

        // Verify user owns the project
        const project = await storage.getProject(parseInt(projectId));
        if (!project || project.userId !== req.user!.id) {
          return res.status(403).json({
            success: false,
            message: "Access denied - project not found or unauthorized",
          });
        }

        // Verify video upload status with Frame.io
        const verification = await verifyFrameioUpload(videoId);

        res.json({
          success: true,
          verification,
          canProceed:
            verification.isUploaded &&
            (verification.isReady || verification.isTranscoding),
        });
      } catch (error) {
        console.error("Video verification error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to verify video upload",
          shouldRetry: true,
        });
      }
    },
  );

  // Tally form submission routes
  app.post(
    "/api/projects/:id/tally-submission",
    requireAuth,
    requireProjectAccess,
    async (req: AuthenticatedRequest, res) => {
      try {
        const projectId = parseInt(req.params.id);
        const { tallySubmissionId, submissionData } = req.body;

        // Verify project exists and user owns it
        const project = await storage.getProject(projectId);
        if (!project) {
          return res
            .status(404)
            .json({ success: false, message: "Project not found" });
        }

        if (project.userId !== req.user!.id) {
          return res
            .status(403)
            .json({ success: false, message: "Access denied" });
        }

        // Check if submission already exists
        const existingSubmission =
          await storage.getTallyFormSubmission(projectId);
        if (existingSubmission) {
          // Update existing submission with latest Tally submission ID and data
          const updatedSubmission = await storage.updateTallyFormSubmission(
            projectId,
            {
              tallySubmissionId, // Replace with latest submission ID for automation workflows
              submissionData: JSON.stringify(submissionData),
              submittedAt: new Date(),
            },
          );

          // Update project status to "Edit in Progress" when form is completed
          await storage.updateProject(projectId, {
            status: "Edit in Progress",
          });

          return res.json({
            success: true,
            message: "Form submission updated successfully",
            submission: updatedSubmission,
          });
        }

        // Create the submission record
        const submission = await storage.createTallyFormSubmission({
          projectId,
          userId: req.user!.id,
          tallySubmissionId,
          submissionData: JSON.stringify(submissionData),
        });

        // Update project status to "Edit in Progress"
        await storage.updateProject(projectId, { status: "Edit in Progress" });

        res.json({
          success: true,
          message: "Form submission recorded successfully",
          submission,
        });
      } catch (error: any) {
        console.error("Tally submission error:", error);
        res.status(500).json({
          success: false,
          message: error.message || "Failed to record form submission",
        });
      }
    },
  );

  // Get Tally form submission for a project
  app.get(
    "/api/projects/:id/tally-submission",
    requireAuth,
    requireProjectAccess,
    async (req: AuthenticatedRequest, res) => {
      try {
        const projectId = parseInt(req.params.id);

        // Verify project exists and user owns it
        const project = await storage.getProject(projectId);
        if (!project) {
          return res
            .status(404)
            .json({ success: false, message: "Project not found" });
        }

        if (project.userId !== req.user!.id) {
          return res
            .status(403)
            .json({ success: false, message: "Access denied" });
        }

        const submission = await storage.getTallyFormSubmission(projectId);

        res.json({
          success: true,
          submission: submission || null,
          hasSubmission: !!submission,
        });
      } catch (error: any) {
        console.error("Get Tally submission error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to get form submission",
        });
      }
    },
  );

  // Check if project folder has videos
  app.get(
    "/api/projects/:id/folder-status",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const projectId = parseInt(req.params.id);

        // Verify project exists and user owns it
        const project = await storage.getProject(projectId);
        if (!project) {
          return res
            .status(404)
            .json({ success: false, message: "Project not found" });
        }

        if (project.userId !== req.user!.id) {
          return res
            .status(403)
            .json({ success: false, message: "Access denied" });
        }

        if (!project.mediaFolderId) {
          return res.json({
            success: true,
            hasVideos: false,
            videoCount: 0,
            message: "Frame.io folder not yet created",
          });
        }

        // Check folder contents using Frame.io API
        const folderVideos = await frameioService.getFolderAssets(project.mediaFolderId);

        res.json({
          success: true,
          hasVideos: folderVideos.length > 0,
          videoCount: folderVideos.length,
          canProceed: folderVideos.length > 0,
        });
      } catch (error: any) {
        console.error("Folder status check error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to check folder status",
          hasVideos: false,
          videoCount: 0,
        });
      }
    },
  );

  // Photo upload and album management endpoints using Frame.io
  
  // Upload photo to Frame.io
  app.post(
    "/api/photos/upload",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { projectId, filename, fileSize, mimeType, base64Data } = req.body;

        if (!projectId || !filename || !fileSize || !mimeType || !base64Data) {
          return res.status(400).json({
            success: false,
            message: "Missing required upload parameters",
          });
        }

        // Check file size limit (500MB)
        const maxFileSize = 524288000; // 500MB in bytes
        if (fileSize > maxFileSize) {
          return res.status(413).json({
            success: false,
            message: `File too large. Maximum size is 500MB.`,
          });
        }

        // Verify project exists and user owns it
        const project = await storage.getProject(projectId);
        if (!project) {
          return res
            .status(404)
            .json({ success: false, message: "Project not found" });
        }

        if (project.userId !== req.user!.id) {
          return res
            .status(403)
            .json({ success: false, message: "Access denied" });
        }

        // Get or create photo album for this project
        let album = await storage.getPhotoAlbum(projectId);
        if (!album) {
          album = await storage.createPhotoAlbum(req.user!.id, {
            projectId,
            albumName: `${project.title} - Photos`,
            totalSizeLimit: 524288000, // 500MB default for images
          });
        }

        // Check album size limit (500MB)
        const albumSizeLimit = album.totalSizeLimit || 524288000; // 500MB default
        if (album.currentSize + fileSize > albumSizeLimit) {
          return res.status(413).json({
            success: false,
            message: `Album size limit exceeded. Maximum 500MB allowed per project.`,
          });
        }

        // Create Frame.io folder structure: /users/{userId}/projects/{projectId}/Photos
        const folderPath = await frameioService.createUserProjectPhotoFolder(req.user!.id, projectId);
        
        // Upload to Frame.io
        const uploadResult = await frameioService.uploadPhoto(
          base64Data,
          filename,
          folderPath,
          req.user!.id
        );
        
        // Create photo file record
        const photoFile = await storage.createPhotoFile(req.user!.id, {
          albumId: album.id,
          projectId,
          mediaFileId: uploadResult.fileId,
          mediaUrl: uploadResult.url,
          mediaThumbnailUrl: uploadResult.thumbnailUrl,
          mediaFolderPath: folderPath,
          filename: filename,
          originalFilename: filename,
          fileSize,
          mimeType,
          uploadStatus: "completed",
        });

        // Update album stats
        await storage.updatePhotoAlbum(album.id, {
          currentSize: album.currentSize + fileSize,
          photoCount: (album.photoCount || 0) + 1,
        });

        // Update project's updatedAt timestamp to reflect the photo upload
        console.log(`Updating project ${projectId} timestamp after photo upload`);
        const updatedProject = await storage.updateProject(projectId, {
          updatedAt: new Date(),
        });
        console.log(`Project ${projectId} updated timestamp:`, updatedProject?.updatedAt);

        res.json({
          success: true,
          message: "Photo uploaded successfully to Frame.io",
          photo: photoFile,
        });
      } catch (error: any) {
        console.error("Photo upload error:", error);
        res.status(500).json({
          success: false,
          message: error.message || "Failed to upload photo",
        });
      }
    }
  );

  // Get photos for a project with security verification
  app.get(
    "/api/projects/:id/photos",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const projectId = parseInt(req.params.id);

        // Verify project exists and user owns it
        const project = await storage.getProject(projectId);
        if (!project) {
          return res
            .status(404)
            .json({ success: false, message: "Project not found" });
        }

        if (project.userId !== req.user!.id) {
          return res
            .status(403)
            .json({ success: false, message: "Access denied" });
        }

        // Fetch photos ONLY from Frame.io media library for this user/project
        let photos: any[] = [];
        let album = null;
        let currentSize = 0;
        
        try {
          const project = await storage.getProject(projectId);
          if (project?.mediaFolderId) {
            console.log(`Fetching photos from Frame.io folder: ${project.mediaFolderId}`);
            const frameioAssets = await frameioService.getFolderAssets(project.mediaFolderId);
            const frameioPhotos = frameioAssets.filter(asset => 
              asset.type === 'file' && 
              asset.filetype && 
              asset.filetype.startsWith('image/')
            );
            console.log(`Found ${frameioPhotos.length} photo files in Frame.io folder`);
          
            if (frameioPhotos.length > 0) {
              // Get or create album only if there are actual photos in Frame.io
              album = await storage.getPhotoAlbum(projectId);
              if (!album) {
                album = await storage.createPhotoAlbum(req.user!.id, {
                  projectId,
                  albumName: `${project.title} - Photos`,
                  totalSizeLimit: 524288000, // 500MB default for images
                });
              }

              // Convert Frame.io assets to photo objects and sync to database
              for (const frameioAsset of frameioPhotos) {
                let existingPhoto = await storage.getPhotoFileByMediaId(frameioAsset.id);
                
                if (!existingPhoto) {
                  // Create database record for photos that exist in Frame.io but not in DB
                  existingPhoto = await storage.createPhotoFile(req.user!.id, {
                    albumId: album.id,
                    projectId,
                    mediaFileId: frameioAsset.id,
                    mediaUrl: frameioAsset.download_url || '',
                    mediaThumbnailUrl: frameioAsset.thumb_url || frameioAsset.download_url || '',
                    mediaFolderPath: project.mediaFolderId,
                    filename: frameioAsset.name,
                    originalFilename: frameioAsset.name,
                    fileSize: frameioAsset.filesize || 0,
                    mimeType: frameioAsset.filetype || 'image/jpeg',
                    uploadStatus: "completed",
                  });
                }
                
                photos.push(existingPhoto);
                currentSize += frameioAsset.filesize || 0;
              }

              // Update album with current stats from Frame.io
              await storage.updatePhotoAlbum(album.id, {
                currentSize,
                photoCount: frameioPhotos.length,
              });
            }
          }
        } catch (error) {
          console.log('Frame.io folder does not exist or is empty:', error);
          // Return empty results - no photos in Frame.io means no photos to display
        }

        res.json({
          success: true,
          album: album || null,
          photos,
          photoCount: photos.length,
        });
      } catch (error: any) {
        console.error("Error fetching photos:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch photos",
        });
      }
    }
  );

  const httpServer = createServer(app);
  // Frame.io V4 OAuth endpoints - Manual approach for Adobe's static URI requirement
  app.get("/api/auth/frameio", async (req: Request, res: Response) => {
    try {
      console.log('=== Manual Frame.io V4 OAuth URL Generation ===');
      
      // Since Adobe requires static URIs, provide manual OAuth URL
      const clientId = process.env.ADOBE_CLIENT_ID;
      if (!clientId) {
        throw new Error('ADOBE_CLIENT_ID not configured');
      }
      
      const state = Math.random().toString(36).substring(7);
      const host = req.get('host');
      
      // Store state in database to survive Adobe's redirect chain
      await storage.createOAuthState(state, 'frameio', 10); // 10 minutes expiry
      console.log(`Database-backed OAuth state created: ${state}`);
      
      console.log(`Current host: ${host}`);
      console.log(`Generated state: ${state}`);
      
      // Use REPLIT_DEV_DOMAIN for more stable OAuth redirect URI
      const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;
      const stableRedirectUri = replitDevDomain 
        ? `https://${replitDevDomain}/api/auth/frameio/callback`
        : `https://${host}/api/auth/frameio/callback`;
      
      const manualAuthUrl = `https://ims-na1.adobelogin.com/ims/authorize/v2?client_id=${clientId}&redirect_uri=${encodeURIComponent(stableRedirectUri)}&response_type=code&scope=openid&state=${state}`;
      
      console.log(`Using REPLIT_DEV_DOMAIN: ${replitDevDomain || 'not available'}`);
      console.log(`Current host: ${host}`);
      console.log(`Stable redirect URI: ${stableRedirectUri}`);
      console.log(`Manual OAuth URL: ${manualAuthUrl}`);
      
      res.json({
        success: true,
        message: 'Manual OAuth configuration required',
        instructions: [
          '1. Copy the redirect URI below to Adobe Developer Console',
          '2. Add it as an approved redirect URI in your Frame.io OAuth app',
          '3. Then visit the OAuth URL to authenticate'
        ],
        redirectUri: stableRedirectUri,
        authUrl: manualAuthUrl,
        note: 'Adobe requires static redirect URIs - dynamic Replit URLs must be manually configured'
      });
    } catch (error) {
      console.error("OAuth URL generation failed:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to generate OAuth URL" 
      });
    }
  });

  app.get("/api/auth/frameio/callback", async (req: Request, res: Response) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error("OAuth authorization error:", error);
        return res.status(400).json({ 
          success: false, 
          message: `OAuth error: ${error}` 
        });
      }

      if (!code) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing authorization code" 
        });
      }

      // Verify state parameter using database-backed storage
      console.log(`Received OAuth callback state: ${state}`);
      
      const isValidState = await storage.validateAndConsumeOAuthState(state as string, 'frameio');
      
      if (!isValidState) {
        console.error("OAuth state validation failed - state not found, expired, or already used");
        console.error("Please generate a new OAuth URL from /api/auth/frameio");
        return res.status(400).json({ 
          success: false, 
          message: "Invalid or expired OAuth state - please generate a new OAuth URL" 
        });
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/frameio/callback`;
      
      // Exchange code for access token
      await frameioV4Service.exchangeCodeForToken(code as string, redirectUri);
      
      // State already consumed during validation
      
      console.log("Frame.io V4 OAuth flow completed successfully");
      
      // Redirect to success page
      res.redirect(`${req.protocol}://${req.get('host')}/dashboard?frameio_connected=true`);
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.status(500).json({ 
        success: false, 
        message: "OAuth callback failed" 
      });
    }
  });

  // Test Frame.io V4 connection
  app.get("/api/frameio/test", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log("Testing Frame.io V4 connection...");
      
      // Check if we have an access token
      if (!frameioV4Service.accessToken) {
        return res.status(400).json({
          success: false,
          message: "OAuth authentication required. Please complete OAuth flow first.",
          authUrl: `${req.protocol}://${req.get('host')}/api/auth/frameio`
        });
      }
      
      await frameioV4Service.initialize();
      const rootProject = await frameioV4Service.getOrCreateRootProject();
      
      res.json({
        success: true,
        message: "Frame.io V4 connection successful",
        project: {
          id: rootProject.id,
          name: rootProject.name,
          root_asset_id: rootProject.root_asset_id
        }
      });
    } catch (error) {
      console.error("Frame.io V4 test failed:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Frame.io V4 connection failed"
      });
    }
  });

  // Test Frame.io V4 core features
  app.get("/api/frameio/v4/test-connection", async (req: Request, res: Response) => {
    try {
      await frameioV4Service.initialize();
      const userInfo = await frameioV4Service.getCurrentUser();
      const teams = await frameioV4Service.getTeams();
      
      res.json({
        success: true,
        message: "Frame.io V4 connection successful",
        user: userInfo,
        teamsCount: teams?.data?.length || 0
      });
    } catch (error) {
      console.error("Frame.io V4 test failed:", error);
      res.status(500).json({
        success: false,
        message: `Frame.io V4 connection failed: ${error.message}`
      });
    }
  });

  // Test folder creation (Feature 1)
  app.post("/api/frameio/v4/test-folder", async (req: Request, res: Response) => {
    try {
      const { folderName, parentId } = req.body;
      console.log(`Testing folder creation: ${folderName}, parent: ${parentId || 'root'}`);
      
      await frameioV4Service.initialize();
      const folder = await frameioV4Service.createFolder(folderName, parentId);
      
      res.json({
        success: true,
        message: "Folder created successfully",
        folder
      });
    } catch (error) {
      console.error("Folder creation test failed:", error);
      res.status(500).json({
        success: false,
        message: `Folder creation failed: ${error.message}`
      });
    }
  });

  // Test projects access (needed for uploads)
  app.get("/api/frameio/v4/test-projects", async (req: Request, res: Response) => {
    try {
      console.log("Testing Frame.io V4 projects/workspaces access...");
      
      await frameioV4Service.initialize();
      const teams = await frameioV4Service.getTeams();
      
      res.json({
        success: true,
        message: "Projects/workspaces access successful",
        teams
      });
    } catch (error) {
      console.error("Projects access test failed:", error);
      res.status(500).json({
        success: false,
        message: `Projects access failed: ${error.message}`
      });
    }
  });

  // Test review link creation (Feature 3)  
  app.post("/api/frameio/v4/test-review", async (req: Request, res: Response) => {
    try {
      const { assetId, name } = req.body;
      console.log(`Testing review link creation for asset: ${assetId}`);
      
      await frameioV4Service.initialize();
      const reviewLink = await frameioV4Service.createReviewLink(assetId, name || 'Test Review');
      
      res.json({
        success: true,
        message: "Review link created successfully",
        reviewLink
      });
    } catch (error) {
      console.error("Review link creation test failed:", error);
      res.status(500).json({
        success: false,
        message: `Review link creation failed: ${error.message}`
      });
    }
  });

  // Test all Frame.io V4 core features at once
  app.get("/api/frameio/v4/test-all", async (req: Request, res: Response) => {
    try {
      console.log("=== Starting Frame.io V4 comprehensive feature test ===");
      const results = await frameioV4Service.testAllFeatures();
      
      res.json({
        success: true,
        message: "All Frame.io V4 core features tested successfully",
        ...results
      });
    } catch (error) {
      console.error("Frame.io V4 feature test failed:", error);
      res.status(500).json({
        success: false,
        message: `Frame.io V4 feature test failed: ${error.message}`
      });
    }
  });

  // Check Frame.io V4 OAuth status
  app.get("/api/frameio/oauth-status", async (req: Request, res: Response) => {
    try {
      const hasCredentials = !!(process.env.ADOBE_CLIENT_ID || process.env.FRAMEIO_CLIENT_ID) && 
                            !!(process.env.ADOBE_CLIENT_SECRET || process.env.FRAMEIO_CLIENT_SECRET);
      const hasAccessToken = !!frameioV4Service.accessToken;
      
      res.json({
        success: true,
        oauthConfigured: hasCredentials,
        authenticated: hasAccessToken,
        authUrl: hasCredentials ? `${req.protocol}://${req.get('host')}/api/auth/frameio` : null
      });
    } catch (error) {
      console.error("OAuth status check failed:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check OAuth status"
      });
    }
  });

  return httpServer;
}

// Frame.io integration handles both video and photo uploads
// Legacy ImageKit and Vimeo integrations have been fully migrated to Frame.io

async function downloadAsset(
  assetPath: string,
): Promise<{ content: Uint8Array; contentType: string }> {
  let content: Uint8Array;
  let finalPath = assetPath;

  // Try direct path first (current structure)
  try {
    console.log("Attempting downloadAsBytes for:", assetPath);
    const bytesResult = await objectStorageClient.downloadAsBytes(assetPath);
    console.log("BytesResult structure:", Object.keys(bytesResult));
    console.log("BytesResult ok:", bytesResult.ok);

    if (!bytesResult.ok) {
      throw new Error(
        `Object Storage error: ${JSON.stringify(bytesResult.error)}`,
      );
    }

    // Check the actual structure of the response
    console.log("BytesResult.value type:", typeof bytesResult.value);
    console.log(
      "BytesResult.value instanceof Uint8Array:",
      bytesResult.value instanceof Uint8Array,
    );
    console.log("BytesResult.value keys:", Object.keys(bytesResult.value));
    console.log(
      "BytesResult.value constructor:",
      bytesResult.value.constructor.name,
    );

    if (bytesResult.value instanceof Uint8Array) {
      content = bytesResult.value;
    } else if (Array.isArray(bytesResult.value)) {
      // Handle array case first - it's an array - let's check what's inside
      console.log("Array detected, length:", bytesResult.value.length);
      console.log("First element type:", typeof bytesResult.value[0]);
      console.log(
        "First element constructor:",
        bytesResult.value[0]?.constructor?.name,
      );

      if (bytesResult.value[0] instanceof Uint8Array) {
        content = bytesResult.value[0];
      } else if (
        bytesResult.value[0] &&
        typeof (bytesResult.value[0] as any).arrayBuffer === "function"
      ) {
        const arrayBuffer = await (bytesResult.value[0] as any).arrayBuffer();
        content = new Uint8Array(arrayBuffer);
      } else {
        // Try converting the array itself to Uint8Array
        content = new Uint8Array(bytesResult.value as any);
      }
    } else if (typeof bytesResult.value === "string") {
      content = new TextEncoder().encode(bytesResult.value as string);
    } else if (
      bytesResult.value &&
      typeof (bytesResult.value as any).arrayBuffer === "function"
    ) {
      // Handle Response-like object
      const arrayBuffer = await (bytesResult.value as any).arrayBuffer();
      content = new Uint8Array(arrayBuffer);
    } else if (
      bytesResult.value &&
      typeof (bytesResult.value as any).stream === "function"
    ) {
      // Handle stream response
      const response = new Response((bytesResult.value as any).stream());
      const arrayBuffer = await response.arrayBuffer();
      content = new Uint8Array(arrayBuffer);
    } else if (bytesResult.value && (bytesResult.value as any).bytes) {
      // Maybe bytes field?
      content = (bytesResult.value as any).bytes;
    } else {
      // Last resort: try converting whatever we got to Uint8Array
      try {
        content = new Uint8Array(bytesResult.value as any);
      } catch (e) {
        console.error("Failed to convert to Uint8Array:", e);
        throw new Error(
          `Unsupported bytesResult.value format: ${typeof bytesResult.value}`,
        );
      }
    }

    console.log("Final content length:", content.length);
  } catch (bytesError: any) {
    console.log(`First attempt failed for ${assetPath}:`, bytesError.message);

    // Try fallback: remove Objects/ prefix if it exists (legacy structure)
    if (assetPath.startsWith("Objects/")) {
      const fallbackPath = assetPath.replace("Objects/", "");
      console.log(`Trying fallback path: ${fallbackPath}`);

      try {
        console.log("Attempting fallback downloadAsBytes for:", fallbackPath);
        const fallbackResult =
          await objectStorageClient.downloadAsBytes(fallbackPath);
        console.log("Fallback BytesResult ok:", fallbackResult.ok);

        if (!fallbackResult.ok) {
          throw new Error(
            `Fallback also failed: ${JSON.stringify(fallbackResult.error)}`,
          );
        }

        console.log(
          "Fallback BytesResult.value type:",
          typeof fallbackResult.value,
        );
        console.log(
          "Fallback BytesResult.value keys:",
          fallbackResult.value ? Object.keys(fallbackResult.value) : "null",
        );
        console.log(
          "Fallback BytesResult full structure:",
          JSON.stringify(fallbackResult, null, 2),
        );

        // Check if value has a nested structure
        if (fallbackResult.value && (fallbackResult.value as any).content) {
          content = (fallbackResult.value as any).content;
        } else if (fallbackResult.value && (fallbackResult.value as any).data) {
          content = (fallbackResult.value as any).data;
        } else if (fallbackResult.value instanceof Uint8Array) {
          content = fallbackResult.value;
        } else if (typeof fallbackResult.value === "string") {
          content = new TextEncoder().encode(fallbackResult.value);
        } else if ((fallbackResult as any).content) {
          content = (fallbackResult as any).content;
        } else if ((fallbackResult as any).data) {
          content = (fallbackResult as any).data;
        } else {
          // Try converting whatever we got to Uint8Array
          content = new Uint8Array(fallbackResult.value as any);
        }

        finalPath = fallbackPath;
        console.log(
          "Fallback final content length:",
          content?.length || "undefined",
        );
      } catch (fallbackError: any) {
        console.log("Both paths failed:", fallbackError.message);
        throw new Error(`Asset not found: ${assetPath}`);
      }
    } else {
      throw new Error(`Asset not found: ${assetPath}`);
    }
  }

  if (!content) {
    console.error("No content received from Object Storage");
    throw new Error(`Asset content not found: ${assetPath}`);
  }

  // Set appropriate content type based on file extension
  const extension = finalPath.split(".").pop()?.toLowerCase();
  const contentType = getContentType(extension);

  return { content, contentType };
}


