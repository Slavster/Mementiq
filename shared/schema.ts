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
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(), // Changed to text
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  vimeoFolderId: text("vimeo_folder_id"),
  tallyFormUrl: text("tally_form_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  vimeoVideoId: text("vimeo_video_id"),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
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
  tallyFormUrl: true,
}).partial();

// Project file schemas
export const insertProjectFileSchema = createInsertSchema(projectFiles).pick({
  filename: true,
  fileType: true,
  fileSize: true,
  vimeoVideoId: true,
});

// Email signup schema
export const insertEmailSignupSchema = createInsertSchema(emailSignups).pick({
  email: true,
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
