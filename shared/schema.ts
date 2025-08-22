import { pgTable, text, serial, timestamp, integer, bigint, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Changed to text for Supabase UUID
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  company: text("company"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"), // active, inactive, past_due, canceled, etc.
  subscriptionTier: text("subscription_tier"), // basic, standard, premium
  subscriptionUsage: integer("subscription_usage").default(0), // Number of projects used in current period
  subscriptionAllowance: integer("subscription_allowance"), // Projects allowed per billing period
  subscriptionPeriodStart: timestamp("subscription_period_start"),
  subscriptionPeriodEnd: timestamp("subscription_period_end"),
  // Note: Frame.io V4 tokens now managed via centralized service_tokens table
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(), // Changed to text
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  submittedToEditorAt: timestamp("submitted_to_editor_at"), // When project was sent to editor (edit in progress)
  mediaFolderId: text("media_folder_id"), // Media platform folder ID (Frame.io, etc.)
  mediaUserFolderId: text("media_user_folder_id"), // User's main folder ID on media platform
  tallyFormUrl: text("tally_form_url"),
  mediaReviewLink: text("media_review_link"), // Media platform review link for revisions
  frameioReviewLink: text("frameio_review_link"), // Frame.io public share URL (full format)
  frameioReviewShareId: text("frameio_review_share_id"), // Frame.io share UUID for the public link
  frameioVideoFilename: text("frameio_video_filename"), // Filename of the video associated with the share link
  frameioVideoFileSize: bigint("frameio_video_file_size", { mode: "number" }), // File size of the video
  frameioVideoFileType: text("frameio_video_file_type"), // MIME type of the video
  frameioVideoAssetId: text("frameio_video_asset_id"), // Asset ID of the video in Frame.io
  revisionCount: integer("revision_count").default(0), // Number of revisions requested for this project
  trelloCardId: text("trello_card_id"), // Initial project card ID in Trello
  trelloRevisionCardId: text("trello_revision_card_id"), // Current revision card ID in Trello
  uploadSizeLimit: bigint("upload_size_limit", { mode: "number" }).default(10737418240), // 10GB default
  currentUploadSize: bigint("current_upload_size", { mode: "number" }).default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  mediaAssetId: text("media_asset_id"), // Media platform asset ID (Frame.io, etc.)
  mediaAssetUrl: text("media_asset_url"), // Frame.io public share link (f.io format)
  frameioShareId: text("frameio_share_id"), // Frame.io share UUID for API operations
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  uploadStatus: text("upload_status").notNull().default("pending"), // pending, uploading, completed, failed
  uploadProgress: integer("upload_progress").default(0), // 0-100
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
});

export const projectStatusLog = pgTable("project_status_log", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});

export const emailSignups = pgTable("email_signups", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tallyFormSubmissions = pgTable("tally_form_submissions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull().unique(), // One submission per project
  userId: text("user_id").references(() => users.id).notNull(),
  tallySubmissionId: text("tally_submission_id").notNull().unique(), // Tally's unique submission ID
  submissionData: text("submission_data"), // JSON string of form responses
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"), // When we confirmed it exists in Tally
});

export const oauthStates = pgTable("oauth_states", {
  id: serial("id").primaryKey(),
  state: text("state").notNull().unique(),
  provider: text("provider").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const photoAlbums = pgTable("photo_albums", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull().unique(), // One album per project
  userId: text("user_id").references(() => users.id).notNull(),
  albumName: text("album_name").notNull(),
  totalSizeLimit: bigint("total_size_limit", { mode: "number" }).default(524288000), // 500MB default for images
  currentSize: bigint("current_size", { mode: "number" }).default(0),
  photoCount: integer("photo_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const photoFiles = pgTable("photo_files", {
  id: serial("id").primaryKey(),
  albumId: integer("album_id").references(() => photoAlbums.id).notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  mediaFileId: text("media_file_id"), // Media platform file ID (Frame.io, etc.)
  mediaUrl: text("media_url"), // Direct media platform URL
  mediaThumbnailUrl: text("media_thumbnail_url"), // Media platform thumbnail URL
  mediaFolderPath: text("media_folder_path"), // Folder path on media platform
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  mimeType: text("mime_type").notNull(),
  uploadStatus: text("upload_status").notNull().default("pending"), // pending, uploading, completed, failed
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
});

// Centralized service tokens (Frame.io, etc.) - single source of truth for all users
export const serviceTokens = pgTable("service_tokens", {
  id: serial("id").primaryKey(),
  service: text("service").notNull().unique(), // 'frameio-v4', 'vimeo', etc.
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").default("Bearer"),
  expiresAt: timestamp("expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const revisionPayments = pgTable("revision_payments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id").notNull().unique(),
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, completed, failed, refunded
  paymentAmount: integer("payment_amount").notNull(), // Amount in cents
  currency: text("currency").notNull().default("usd"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
});

// Frame.io share asset mapping for webhook detection
export const frameioShareAssets = pgTable("frameio_share_assets", {
  id: serial("id").primaryKey(),
  shareId: text("share_id").notNull(), // Frame.io share UUID
  projectId: integer("project_id").references(() => projects.id).notNull(),
  assetId: text("asset_id").notNull(), // Frame.io file or folder ID
  assetType: text("asset_type").notNull(), // 'file' or 'folder'
  parentFolderId: text("parent_folder_id"), // For tracking folder hierarchy
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Trello integration tracking
export const trelloCards = pgTable("trello_cards", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  cardId: text("card_id").notNull(), // Trello card ID
  cardType: text("card_type").notNull(), // 'initial' or 'revision'
  revisionNumber: integer("revision_number").default(0), // 0 for initial, 1+ for revisions
  boardId: text("board_id").notNull(),
  listId: text("list_id").notNull(), // Current list ID
  assignedEditorId: text("assigned_editor_id"), // Trello member ID of assigned editor
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"), // When moved to done
});

// Trello configuration
export const trelloConfig = pgTable("trello_config", {
  id: serial("id").primaryKey(),
  boardId: text("board_id").notNull(),
  todoListId: text("todo_list_id").notNull(), // List for new projects/revisions
  doneListId: text("done_list_id").notNull(), // List for completed items
  revisionListId: text("revision_list_id"), // Optional separate list for revisions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  company: true,
}).partial({ id: true }); // id is optional for regular signup, required for Supabase user creation

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Project schemas
export const insertProjectSchema = createInsertSchema(projects).pick({
  title: true,
  tallyFormUrl: true,
});

export const updateProjectSchema = createInsertSchema(projects).pick({
  title: true,
  status: true,
  mediaFolderId: true,
  mediaUserFolderId: true,
  mediaReviewLink: true,
  currentUploadSize: true,
  tallyFormUrl: true,
  updatedAt: true,
}).partial();

// Project file schemas
export const insertProjectFileSchema = createInsertSchema(projectFiles).pick({
  projectId: true,
  mediaAssetId: true,
  mediaAssetUrl: true,
  filename: true,
  originalFilename: true,
  fileType: true,
  fileSize: true,
  uploadStatus: true,
  uploadProgress: true,
});

// Email signup schema
export const insertEmailSignupSchema = createInsertSchema(emailSignups).pick({
  email: true,
});

// Tally form submission schema
export const insertTallyFormSubmissionSchema = createInsertSchema(tallyFormSubmissions).pick({
  projectId: true,
  userId: true,
  tallySubmissionId: true,
  submissionData: true,
});

// Photo album schemas
export const insertPhotoAlbumSchema = createInsertSchema(photoAlbums).pick({
  projectId: true,
  albumName: true,
  totalSizeLimit: true,
});

export const updatePhotoAlbumSchema = createInsertSchema(photoAlbums).pick({
  albumName: true,
  currentSize: true,
  photoCount: true,
  totalSizeLimit: true,
}).partial();

// Photo file schemas
export const insertPhotoFileSchema = createInsertSchema(photoFiles).pick({
  albumId: true,
  projectId: true,
  mediaFileId: true,
  mediaUrl: true,
  mediaThumbnailUrl: true,
  mediaFolderPath: true,
  filename: true,
  originalFilename: true,
  fileSize: true,
  mimeType: true,
  uploadStatus: true,
});

// Revision payment schemas
export const insertRevisionPaymentSchema = createInsertSchema(revisionPayments).pick({
  projectId: true,
  stripeCheckoutSessionId: true,
  paymentAmount: true,
  currency: true,
});

// Frame.io share asset schemas
export const insertFrameioShareAssetSchema = createInsertSchema(frameioShareAssets).pick({
  shareId: true,
  projectId: true,
  assetId: true,
  assetType: true,
  parentFolderId: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectFile = typeof projectFiles.$inferSelect;

export type ProjectStatusLog = typeof projectStatusLog.$inferSelect;

export type InsertEmailSignup = z.infer<typeof insertEmailSignupSchema>;
export type EmailSignup = typeof emailSignups.$inferSelect;

export type InsertTallyFormSubmission = z.infer<typeof insertTallyFormSubmissionSchema>;
export type TallyFormSubmission = typeof tallyFormSubmissions.$inferSelect;

export type PhotoAlbum = typeof photoAlbums.$inferSelect;
export type InsertPhotoAlbum = z.infer<typeof insertPhotoAlbumSchema>;
export type UpdatePhotoAlbum = z.infer<typeof updatePhotoAlbumSchema>;

export type PhotoFile = typeof photoFiles.$inferSelect;
export type InsertPhotoFile = z.infer<typeof insertPhotoFileSchema>;

export type RevisionPayment = typeof revisionPayments.$inferSelect;
export type InsertRevisionPayment = z.infer<typeof insertRevisionPaymentSchema>;

export type FrameioShareAsset = typeof frameioShareAssets.$inferSelect;
export type InsertFrameioShareAsset = z.infer<typeof insertFrameioShareAssetSchema>;

// Trello card schemas
export const insertTrelloCardSchema = createInsertSchema(trelloCards).pick({
  projectId: true,
  cardId: true,
  cardType: true,
  revisionNumber: true,
  boardId: true,
  listId: true,
  assignedEditorId: true,
});

export type TrelloCard = typeof trelloCards.$inferSelect;
export type InsertTrelloCard = z.infer<typeof insertTrelloCardSchema>;

// Trello config schemas
export const insertTrelloConfigSchema = createInsertSchema(trelloConfig).pick({
  boardId: true,
  todoListId: true,
  doneListId: true,
  revisionListId: true,
});

export type TrelloConfig = typeof trelloConfig.$inferSelect;
export type InsertTrelloConfig = z.infer<typeof insertTrelloConfigSchema>;
