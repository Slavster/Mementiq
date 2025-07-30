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
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(), // Changed to text
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  vimeoFolderId: text("vimeo_folder_id"), // Vimeo folder URI for this project
  vimeoUserFolderId: text("vimeo_user_folder_id"), // User's main folder URI
  tallyFormUrl: text("tally_form_url"),
  uploadSizeLimit: bigint("upload_size_limit", { mode: "number" }).default(10737418240), // 10GB default
  currentUploadSize: bigint("current_upload_size", { mode: "number" }).default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  vimeoVideoId: text("vimeo_video_id"), // Vimeo video URI
  vimeoVideoUrl: text("vimeo_video_url"), // Public Vimeo URL
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
  vimeoFolderId: true,
  vimeoUserFolderId: true,
  currentUploadSize: true,
  tallyFormUrl: true,
}).partial();

// Project file schemas
export const insertProjectFileSchema = createInsertSchema(projectFiles).pick({
  vimeoVideoId: true,
  vimeoVideoUrl: true,
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
