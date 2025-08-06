import { 
  users, 
  projects, 
  projectFiles, 
  projectStatusLog, 
  emailSignups,
  tallyFormSubmissions,
  photoAlbums,
  photoFiles,
  revisionPayments,
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
  type InsertTallyFormSubmission,
  type PhotoAlbum,
  type InsertPhotoAlbum,
  type UpdatePhotoAlbum,
  type PhotoFile,
  type InsertPhotoFile,
  type RevisionPayment,
  type InsertRevisionPayment
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyUser(token: string): Promise<User | undefined>;
  updateUserVerification(userId: string, verifiedAt: Date): Promise<void>;
  
  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  getProjectsByStatus(statuses: string[]): Promise<Project[]>;
  createProject(userId: string, project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: UpdateProject): Promise<Project | undefined>;
  updateProjectVimeoInfo(id: number, vimeoFolderId: string, userFolderUri?: string): Promise<void>;
  deleteProject(id: number): Promise<void>;
  
  // Project file methods
  getProjectFiles(projectId: number): Promise<ProjectFile[]>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
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
  updateTallyFormSubmission(projectId: number, updates: Partial<Pick<TallyFormSubmission, 'tallySubmissionId' | 'submissionData' | 'submittedAt'>>): Promise<TallyFormSubmission>;
  updateTallyFormSubmissionVerification(submissionId: string, verifiedAt: Date): Promise<void>;

  // Photo album methods
  getPhotoAlbum(projectId: number): Promise<PhotoAlbum | undefined>;
  getPhotoAlbumsByUser(userId: string): Promise<PhotoAlbum[]>;
  createPhotoAlbum(userId: string, album: InsertPhotoAlbum): Promise<PhotoAlbum>;
  updatePhotoAlbum(id: number, updates: UpdatePhotoAlbum): Promise<PhotoAlbum | undefined>;
  deletePhotoAlbum(id: number): Promise<void>;

  // Photo file methods
  getPhotoFiles(albumId: number): Promise<PhotoFile[]>;
  getPhotoFilesByProject(projectId: number): Promise<PhotoFile[]>;
  createPhotoFile(userId: string, file: InsertPhotoFile): Promise<PhotoFile>;
  updatePhotoFile(id: number, updates: Partial<PhotoFile>): Promise<PhotoFile | undefined>;
  deletePhotoFile(id: number): Promise<void>;

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

  // Revision payment methods
  createRevisionPayment(userId: string, payment: InsertRevisionPayment): Promise<RevisionPayment>;
  getRevisionPayment(sessionId: string): Promise<RevisionPayment | undefined>;
  getRevisionPaymentsByProject(projectId: number): Promise<RevisionPayment[]>;
  updateRevisionPaymentStatus(sessionId: string, status: string, paymentIntentId?: string, paidAt?: Date): Promise<RevisionPayment | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Ensure required fields are present
    const userToInsert = {
      ...insertUser,
      id: insertUser.id || crypto.randomUUID(),
    };
    
    const [user] = await db
      .insert(users)
      .values(userToInsert)
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

  async getProjectsByStatus(statuses: string[]): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(inArray(projects.status, statuses))
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

  async updateProjectVimeoInfo(projectId: number, vimeoFolderId: string, vimeoUserFolderId?: string): Promise<void> {
    const updateData: any = { vimeoFolderId };
    if (vimeoUserFolderId) {
      updateData.vimeoUserFolderId = vimeoUserFolderId;
    }

    await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId));
  }

  async updateProjectVimeoReviewLink(projectId: number, vimeoReviewLink: string): Promise<Project | null> {
    const [result] = await db
      .update(projects)
      .set({ 
        vimeoReviewLink,
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId))
      .returning();
    
    return result || null;
  }

  async updateProject(id: number, updates: UpdateProject): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return undefined;

    const [updatedProject] = await db
      .update(projects)
      .set({
        ...updates,
        // Only set updatedAt to current time if not explicitly provided in updates
        updatedAt: updates.updatedAt || new Date(),
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

  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const [newFile] = await db
      .insert(projectFiles)
      .values(file)
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

  async updateTallyFormSubmission(projectId: number, updates: Partial<Pick<TallyFormSubmission, 'tallySubmissionId' | 'submissionData' | 'submittedAt'>>): Promise<TallyFormSubmission> {
    const [updatedSubmission] = await db
      .update(tallyFormSubmissions)
      .set(updates)
      .where(eq(tallyFormSubmissions.projectId, projectId))
      .returning();
    
    if (!updatedSubmission) {
      throw new Error("Tally form submission not found for update");
    }
    
    return updatedSubmission;
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

  // Photo album methods
  async getPhotoAlbum(projectId: number): Promise<PhotoAlbum | undefined> {
    const [album] = await db
      .select()
      .from(photoAlbums)
      .where(eq(photoAlbums.projectId, projectId));
    return album || undefined;
  }

  async getPhotoAlbumsByUser(userId: string): Promise<PhotoAlbum[]> {
    return await db
      .select()
      .from(photoAlbums)
      .where(eq(photoAlbums.userId, userId))
      .orderBy(desc(photoAlbums.createdAt));
  }

  async createPhotoAlbum(userId: string, album: InsertPhotoAlbum): Promise<PhotoAlbum> {
    const [createdAlbum] = await db
      .insert(photoAlbums)
      .values({
        ...album,
        userId,
      })
      .returning();
    return createdAlbum;
  }

  async updatePhotoAlbum(id: number, updates: UpdatePhotoAlbum): Promise<PhotoAlbum | undefined> {
    const [updatedAlbum] = await db
      .update(photoAlbums)
      .set({ 
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(photoAlbums.id, id))
      .returning();
    return updatedAlbum || undefined;
  }

  async deletePhotoAlbum(id: number): Promise<void> {
    await db
      .delete(photoAlbums)
      .where(eq(photoAlbums.id, id));
  }

  // Photo file methods
  async getPhotoFiles(albumId: number): Promise<PhotoFile[]> {
    return await db
      .select()
      .from(photoFiles)
      .where(eq(photoFiles.albumId, albumId))
      .orderBy(desc(photoFiles.uploadDate));
  }

  async getPhotoFilesByProject(projectId: number): Promise<PhotoFile[]> {
    return await db
      .select()
      .from(photoFiles)
      .where(eq(photoFiles.projectId, projectId))
      .orderBy(desc(photoFiles.uploadDate));
  }

  async getPhotoFileByImageKitId(imagekitFileId: string): Promise<PhotoFile | undefined> {
    const [file] = await db
      .select()
      .from(photoFiles)
      .where(eq(photoFiles.imagekitFileId, imagekitFileId));
    return file || undefined;
  }

  async createPhotoFile(userId: string, file: InsertPhotoFile): Promise<PhotoFile> {
    const [createdFile] = await db
      .insert(photoFiles)
      .values({
        ...file,
        userId,
      })
      .returning();
    return createdFile;
  }

  async updatePhotoFile(id: number, updates: Partial<PhotoFile>): Promise<PhotoFile | undefined> {
    const [updatedFile] = await db
      .update(photoFiles)
      .set(updates)
      .where(eq(photoFiles.id, id))
      .returning();
    return updatedFile || undefined;
  }

  async deletePhotoFile(id: number): Promise<void> {
    await db
      .delete(photoFiles)
      .where(eq(photoFiles.id, id));
  }

  // Revision payment methods
  async createRevisionPayment(userId: string, payment: InsertRevisionPayment): Promise<RevisionPayment> {
    const [createdPayment] = await db
      .insert(revisionPayments)
      .values({
        ...payment,
        userId,
      })
      .returning();
    return createdPayment;
  }

  async getRevisionPayment(sessionId: string): Promise<RevisionPayment | undefined> {
    const [payment] = await db
      .select()
      .from(revisionPayments)
      .where(eq(revisionPayments.stripeCheckoutSessionId, sessionId));
    return payment || undefined;
  }

  async getRevisionPaymentsByProject(projectId: number): Promise<RevisionPayment[]> {
    return db
      .select()
      .from(revisionPayments)
      .where(eq(revisionPayments.projectId, projectId))
      .orderBy(desc(revisionPayments.createdAt));
  }

  async updateRevisionPaymentStatus(
    sessionId: string, 
    status: string, 
    paymentIntentId?: string, 
    paidAt?: Date
  ): Promise<RevisionPayment | undefined> {
    const [updatedPayment] = await db
      .update(revisionPayments)
      .set({
        paymentStatus: status,
        ...(paymentIntentId && { stripePaymentIntentId: paymentIntentId }),
        ...(paidAt && { paidAt }),
      })
      .where(eq(revisionPayments.stripeCheckoutSessionId, sessionId))
      .returning();
    return updatedPayment || undefined;
  }
}

export const storage = new DatabaseStorage();
