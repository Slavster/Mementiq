import { 
  users, 
  projects, 
  projectFiles, 
  projectStatusLog, 
  emailSignups,
  tallyFormSubmissions,
  type User, 
  type InsertUser, 
  type Project,
  type InsertProject,
  type UpdateProject,
  type ProjectFile,
  type InsertProjectFile,
  type ProjectStatusLog,
  type EmailSignup, 
  type InsertEmailSignup,
  type TallyFormSubmission,
  type InsertTallyFormSubmission
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyUser(token: string): Promise<User | undefined>;
  updateUserVerification(userId: string, verifiedAt: Date): Promise<void>;
  
  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  createProject(userId: string, project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: UpdateProject): Promise<Project | undefined>;
  updateProjectVimeoInfo(id: number, vimeoFolderId: string, userFolderUri?: string): Promise<void>;
  deleteProject(id: number): Promise<void>;
  
  // Project file methods
  getProjectFiles(projectId: number): Promise<ProjectFile[]>;
  createProjectFile(projectId: number, file: InsertProjectFile): Promise<ProjectFile>;
  deleteProjectFile(id: number): Promise<void>;
  
  // Project status methods
  logStatusChange(projectId: number, oldStatus: string | null, newStatus: string): Promise<ProjectStatusLog>;
  getProjectStatusHistory(projectId: number): Promise<ProjectStatusLog[]>;
  
  // Email signup methods
  createEmailSignup(emailSignup: InsertEmailSignup): Promise<EmailSignup>;
  getEmailSignups(): Promise<EmailSignup[]>;
  
  // Tally form submission methods
  createTallyFormSubmission(submission: InsertTallyFormSubmission): Promise<TallyFormSubmission>;
  getTallyFormSubmission(projectId: number): Promise<TallyFormSubmission | undefined>;
  updateTallyFormSubmissionVerification(submissionId: string, verifiedAt: Date): Promise<void>;

  // Stripe subscription methods
  updateUserStripeInfo(userId: string, stripeCustomerId?: string, stripeSubscriptionId?: string): Promise<User | undefined>;
  updateUserSubscription(userId: string, subscriptionData: {
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionTier?: string | null;
    subscriptionUsage?: number;
    subscriptionAllowance?: number;
    subscriptionPeriodStart?: Date;
    subscriptionPeriodEnd?: Date;
  }): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  incrementUserUsage(userId: string): Promise<User | undefined>;
  resetUserUsage(userId: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async verifyUser(token: string): Promise<User | undefined> {
    // This method is used for email verification, but with Supabase auth
    // we don't need custom token verification. Return undefined to skip.
    return undefined;
  }

  async updateUserVerification(userId: string, verifiedAt: Date): Promise<void> {
    // This method is used for email verification, but with Supabase auth
    // verification is handled by Supabase. Skip this operation.
    return;
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async createProject(userId: string, project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values({
        ...project,
        userId,
      })
      .returning();
    
    // Log initial status
    await this.logStatusChange(newProject.id, null, newProject.status);
    
    return newProject;
  }

  async updateProjectVimeoInfo(projectId: number, vimeoFolderId: string, vimeoUserFolderId?: string): Promise<Project | undefined> {
    const updateData: any = { vimeoFolderId };
    if (vimeoUserFolderId) {
      updateData.vimeoUserFolderId = vimeoUserFolderId;
    }

    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();

    return updatedProject || undefined;
  }

  async updateProject(id: number, updates: UpdateProject): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return undefined;

    const [updatedProject] = await db
      .update(projects)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    // Log status change if status was updated
    if (updates.status && updates.status !== project.status) {
      await this.logStatusChange(id, project.status, updates.status);
    }

    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Project file methods
  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(desc(projectFiles.uploadDate));
  }

  async createProjectFile(projectId: number, file: InsertProjectFile): Promise<ProjectFile> {
    const [newFile] = await db
      .insert(projectFiles)
      .values({
        ...file,
        projectId,
      })
      .returning();
    return newFile;
  }

  async deleteProjectFile(id: number): Promise<void> {
    await db.delete(projectFiles).where(eq(projectFiles.id, id));
  }

  // Project status methods
  async logStatusChange(projectId: number, oldStatus: string | null, newStatus: string): Promise<ProjectStatusLog> {
    const [log] = await db
      .insert(projectStatusLog)
      .values({
        projectId,
        oldStatus,
        newStatus,
      })
      .returning();
    return log;
  }

  async getProjectStatusHistory(projectId: number): Promise<ProjectStatusLog[]> {
    return await db
      .select()
      .from(projectStatusLog)
      .where(eq(projectStatusLog.projectId, projectId))
      .orderBy(desc(projectStatusLog.changedAt));
  }

  // Email signup methods
  async createEmailSignup(insertEmailSignup: InsertEmailSignup): Promise<EmailSignup> {
    try {
      const [emailSignup] = await db
        .insert(emailSignups)
        .values(insertEmailSignup)
        .returning();
      return emailSignup;
    } catch (error: any) {
      // Handle unique constraint violation (duplicate email)
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        throw new Error("Email already exists");
      }
      throw error;
    }
  }

  async getEmailSignups(): Promise<EmailSignup[]> {
    return await db.select().from(emailSignups).orderBy(emailSignups.createdAt);
  }

  // Tally form submission methods
  async createTallyFormSubmission(submission: InsertTallyFormSubmission): Promise<TallyFormSubmission> {
    try {
      const [tallySubmission] = await db
        .insert(tallyFormSubmissions)
        .values(submission)
        .returning();
      return tallySubmission;
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        if (error.message?.includes('project_id')) {
          throw new Error("Project already has a form submission");
        }
        if (error.message?.includes('tally_submission_id')) {
          throw new Error("Tally submission ID already exists");
        }
      }
      throw error;
    }
  }

  async getTallyFormSubmission(projectId: number): Promise<TallyFormSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(tallyFormSubmissions)
      .where(eq(tallyFormSubmissions.projectId, projectId));
    return submission || undefined;
  }

  async updateTallyFormSubmissionVerification(submissionId: string, verifiedAt: Date): Promise<void> {
    await db
      .update(tallyFormSubmissions)
      .set({ verifiedAt })
      .where(eq(tallyFormSubmissions.tallySubmissionId, submissionId));
  }

  // Stripe subscription methods
  async updateUserStripeInfo(userId: string, stripeCustomerId?: string, stripeSubscriptionId?: string): Promise<User | undefined> {
    const updateData: any = {};
    if (stripeCustomerId !== undefined) updateData.stripeCustomerId = stripeCustomerId;
    if (stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = stripeSubscriptionId;

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async updateUserSubscription(userId: string, subscriptionData: {
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionTier?: string | null;
    subscriptionUsage?: number;
    subscriptionAllowance?: number;
    subscriptionPeriodStart?: Date;
    subscriptionPeriodEnd?: Date;
  }): Promise<User | undefined> {
    // Only include defined fields
    const updateData: any = {};
    if (subscriptionData.stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = subscriptionData.stripeSubscriptionId;
    if (subscriptionData.subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionData.subscriptionStatus;
    if (subscriptionData.subscriptionTier !== undefined) updateData.subscriptionTier = subscriptionData.subscriptionTier;
    if (subscriptionData.subscriptionUsage !== undefined) updateData.subscriptionUsage = subscriptionData.subscriptionUsage;
    if (subscriptionData.subscriptionAllowance !== undefined) updateData.subscriptionAllowance = subscriptionData.subscriptionAllowance;
    if (subscriptionData.subscriptionPeriodStart !== undefined) updateData.subscriptionPeriodStart = subscriptionData.subscriptionPeriodStart;
    if (subscriptionData.subscriptionPeriodEnd !== undefined) updateData.subscriptionPeriodEnd = subscriptionData.subscriptionPeriodEnd;

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId));
    return user || undefined;
  }

  async incrementUserUsage(userId: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const [updatedUser] = await db
      .update(users)
      .set({ subscriptionUsage: (user.subscriptionUsage || 0) + 1 })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser || undefined;
  }

  async resetUserUsage(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ subscriptionUsage: 0 })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }
}

export const storage = new DatabaseStorage();
