import {
  users,
  projects,
  projectFiles,
  projectStatusLog,
  emailSignups,
  tallyFormSubmissions,
  revisionPayments,
  frameioShareAssets,
  oauthStates,
  serviceTokens,
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
  type RevisionPayment,
  type InsertRevisionPayment,
  type FrameioShareAsset,
  type InsertFrameioShareAsset
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray, lt, sql } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateFrameioV4Token(userId: string, accessToken: string, refreshToken?: string, expiresAt?: Date): Promise<void>;

  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  getProjectsByStatus(statuses: string[]): Promise<Project[]>;
  createProject(userId: string, project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: UpdateProject): Promise<Project | undefined>;
  updateProjectMediaInfo(id: number, mediaFolderId: string, userFolderUri?: string): Promise<void>;
  updateProjectShareLink(projectId: number, shareId: string, shareUrl: string): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;

  // Project file methods
  getProjectFiles(projectId: number): Promise<ProjectFile[]>;
  getProjectFilesByProjectId(projectId: number): Promise<ProjectFile[]>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  updateProjectFile(id: number, updates: Partial<ProjectFile>): Promise<ProjectFile | undefined>;
  deleteProjectFile(id: number): Promise<void>;

  // Project status methods
  logStatusChange(projectId: number, oldStatus: string | null, newStatus: string): Promise<ProjectStatusLog>;
  logProjectStatusChange(projectId: number, oldStatus: string | null, newStatus: string): Promise<ProjectStatusLog>;
  getProjectStatusHistory(projectId: number): Promise<ProjectStatusLog[]>;

  // Email signup methods
  createEmailSignup(emailSignup: InsertEmailSignup): Promise<EmailSignup>;
  getEmailSignups(): Promise<EmailSignup[]>;
  checkEmailExists(email: string): Promise<boolean>;

  // Tally form submission methods
  createTallyFormSubmission(submission: InsertTallyFormSubmission): Promise<TallyFormSubmission>;
  getTallyFormSubmission(projectId: number): Promise<TallyFormSubmission | undefined>;
  updateTallyFormSubmission(projectId: number, updates: Partial<Pick<TallyFormSubmission, 'tallySubmissionId' | 'submissionData' | 'submittedAt'>>): Promise<TallyFormSubmission>;

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

  // OAuth state methods
  createOAuthState(state: string, provider: string, expiresInMinutes: number): Promise<void>;
  validateAndConsumeOAuthState(state: string, provider: string): Promise<boolean>;
  
  // Frame.io share asset methods
  createFrameioShareAsset(asset: InsertFrameioShareAsset): Promise<FrameioShareAsset>;
  getFrameioShareAssetsByProject(projectId: number): Promise<FrameioShareAsset[]>;
  getFrameioShareAssetsByShareId(shareId: string): Promise<FrameioShareAsset[]>;
  getProjectByAssetId(assetId: string): Promise<Project | undefined>;
  deleteFrameioShareAssetsByProject(projectId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Reference to the db instance within the class
  private db = db;

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Ensure required fields are present
    const userToInsert = {
      ...insertUser,
      id: insertUser.id || crypto.randomUUID(),
    };

    const [user] = await this.db
      .insert(users)
      .values(userToInsert)
      .returning();
    return user;
  }


  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return await this.db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async getProjectsByStatus(statuses: string[]): Promise<Project[]> {
    return await this.db
      .select()
      .from(projects)
      .where(inArray(projects.status, statuses))
      .orderBy(desc(projects.createdAt));
  }

  async createProject(userId: string, project: InsertProject): Promise<Project> {
    const [newProject] = await this.db
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

  async updateProjectMediaInfo(projectId: number, mediaFolderId: string, mediaUserFolderId?: string): Promise<void> {
    const updateData: any = { mediaFolderId: mediaFolderId };
    if (mediaUserFolderId) {
      updateData.mediaUserFolderId = mediaUserFolderId;
    }

    await this.db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId));
  }


  async updateProject(id: number, updates: UpdateProject): Promise<Project | undefined> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, id));
    if (!project) return undefined;

    const [updatedProject] = await this.db
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
    await this.db.delete(projects).where(eq(projects.id, id));
  }

  // Project file methods
  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return await this.db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(desc(projectFiles.uploadDate));
  }

  async getProjectFilesByProjectId(projectId: number): Promise<ProjectFile[]> {
    return this.getProjectFiles(projectId);
  }

  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const [newFile] = await this.db
      .insert(projectFiles)
      .values(file)
      .returning();
    return newFile;
  }

  async updateProjectFile(id: number, updates: Partial<ProjectFile>): Promise<ProjectFile | undefined> {
    const [updatedFile] = await this.db
      .update(projectFiles)
      .set(updates)
      .where(eq(projectFiles.id, id))
      .returning();
    return updatedFile || undefined;
  }

  /**
   * Update project-level Frame.io share link (both full URL and share ID)
   * Ensures 1:1 relationship between share UUID and public URL
   */
  async updateProjectShareLink(
    projectId: number, 
    shareId: string, 
    shareUrl: string,
    videoMetadata?: {
      filename: string;
      fileSize: number;
      fileType: string;
      assetId: string;
    }
  ): Promise<Project | undefined> {
    const updateData: any = {
      frameioReviewLink: shareUrl,
      frameioReviewShareId: shareId,
    };
    
    // If video metadata is provided, store it with the share link
    if (videoMetadata) {
      updateData.frameioVideoFilename = videoMetadata.filename;
      updateData.frameioVideoFileSize = videoMetadata.fileSize;
      updateData.frameioVideoFileType = videoMetadata.fileType;
      updateData.frameioVideoAssetId = videoMetadata.assetId;
    }
    
    const [updatedProject] = await this.db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();
    
    console.log(`📊 Synchronized project share update for ${projectId}: shareId=${shareId}, shareUrl=${shareUrl}${videoMetadata ? `, video=${videoMetadata.filename}` : ''}`);
    return updatedProject || undefined;
  }

  /**
   * Update media asset URL for backward compatibility
   * Note: This is a legacy method - shares are now handled at project level
   */
  async updateProjectFileUrl(id: number, shareUrl: string): Promise<ProjectFile | undefined> {
    const updates = {
      mediaAssetUrl: shareUrl
    };

    console.log(`📊 Updating file ${id} URL for backward compatibility: ${shareUrl}`);

    const [updatedFile] = await this.db
      .update(projectFiles)
      .set(updates)
      .where(eq(projectFiles.id, id))
      .returning();
    return updatedFile || undefined;
  }

  async deleteProjectFile(id: number): Promise<void> {
    await this.db.delete(projectFiles).where(eq(projectFiles.id, id));
  }

  // Project status methods
  async logStatusChange(projectId: number, oldStatus: string | null, newStatus: string): Promise<ProjectStatusLog> {
    const [log] = await this.db
      .insert(projectStatusLog)
      .values({
        projectId,
        oldStatus,
        newStatus,
      })
      .returning();
    return log;
  }

  async logProjectStatusChange(projectId: number, oldStatus: string | null, newStatus: string): Promise<ProjectStatusLog> {
    return await this.logStatusChange(projectId, oldStatus, newStatus);
  }

  async getProjectStatusHistory(projectId: number): Promise<ProjectStatusLog[]> {
    return await this.db
      .select()
      .from(projectStatusLog)
      .where(eq(projectStatusLog.projectId, projectId))
      .orderBy(desc(projectStatusLog.changedAt));
  }

  // Email signup methods
  async checkEmailExists(email: string): Promise<boolean> {
    // Check both users table and email_signups table for existing email
    const userExists = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (userExists.length > 0) {
      return true;
    }
    
    const emailSignupExists = await this.db
      .select()
      .from(emailSignups)
      .where(eq(emailSignups.email, email))
      .limit(1);
    
    return emailSignupExists.length > 0;
  }

  async createEmailSignup(insertEmailSignup: InsertEmailSignup): Promise<EmailSignup> {
    try {
      const [emailSignup] = await this.db
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
    return await this.db.select().from(emailSignups).orderBy(emailSignups.createdAt);
  }

  // Tally form submission methods
  async createTallyFormSubmission(submission: InsertTallyFormSubmission): Promise<TallyFormSubmission> {
    try {
      const [tallySubmission] = await this.db
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
    const [submission] = await this.db
      .select()
      .from(tallyFormSubmissions)
      .where(eq(tallyFormSubmissions.projectId, projectId));
    return submission || undefined;
  }

  async updateTallyFormSubmission(projectId: number, updates: Partial<Pick<TallyFormSubmission, 'tallySubmissionId' | 'submissionData' | 'submittedAt'>>): Promise<TallyFormSubmission> {
    const [updatedSubmission] = await this.db
      .update(tallyFormSubmissions)
      .set(updates)
      .where(eq(tallyFormSubmissions.projectId, projectId))
      .returning();

    if (!updatedSubmission) {
      throw new Error("Tally form submission not found for update");
    }

    return updatedSubmission;
  }

  // Stripe subscription methods
  async updateUserStripeInfo(userId: string, stripeCustomerId?: string, stripeSubscriptionId?: string): Promise<User | undefined> {
    const updateData: any = {};
    if (stripeCustomerId !== undefined) updateData.stripeCustomerId = stripeCustomerId;
    if (stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = stripeSubscriptionId;

    const [user] = await this.db
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

    const [user] = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId));
    return user || undefined;
  }

  async incrementUserUsage(userId: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const [updatedUser] = await this.db
      .update(users)
      .set({ subscriptionUsage: (user.subscriptionUsage || 0) + 1 })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser || undefined;
  }

  async resetUserUsage(userId: string): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({ subscriptionUsage: 0 })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  // Revision payment methods
  async createRevisionPayment(userId: string, payment: InsertRevisionPayment): Promise<RevisionPayment> {
    const [createdPayment] = await this.db
      .insert(revisionPayments)
      .values({
        ...payment,
        userId,
      })
      .returning();
    return createdPayment;
  }

  async getRevisionPayment(sessionId: string): Promise<RevisionPayment | undefined> {
    const [payment] = await this.db
      .select()
      .from(revisionPayments)
      .where(eq(revisionPayments.stripeCheckoutSessionId, sessionId));
    return payment || undefined;
  }

  async getRevisionPaymentsByProject(projectId: number): Promise<RevisionPayment[]> {
    return this.db
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
    const [updatedPayment] = await this.db
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

  // Refresh lock management for single-flight token refresh
  async acquireRefreshLock(lockKey: string, ttlSeconds: number): Promise<boolean> {
    try {
      const expiresAt = new Date(Date.now() + (ttlSeconds * 1000));

      // Try to insert lock - will fail if already exists
      await this.db.execute(sql`
        INSERT INTO refresh_locks (lock_key, expires_at, created_at)
        VALUES (${lockKey}, ${expiresAt.toISOString()}, ${new Date().toISOString()})
        ON CONFLICT(lock_key) DO NOTHING
      `);

      // Check if we successfully acquired the lock
      const result = await this.db.execute(sql`
        SELECT lock_key FROM refresh_locks
        WHERE lock_key = ${lockKey} AND expires_at > NOW()
      `);

      return result.rows.length > 0;
    } catch (error) {
      console.error('Failed to acquire refresh lock:', error);
      return false;
    }
  }

  async releaseRefreshLock(lockKey: string): Promise<void> {
    try {
      await this.db.execute(sql`
        DELETE FROM refresh_locks WHERE lock_key = ${lockKey}
      `);
    } catch (error) {
      console.error('Failed to release refresh lock:', error);
    }
  }

  // Clean up expired locks periodically
  async cleanupExpiredLocks(): Promise<void> {
    try {
      await this.db.execute(sql`
        DELETE FROM refresh_locks WHERE expires_at <= NOW()
      `);
    } catch (error) {
      console.error('Failed to cleanup expired locks:', error);
    }
  }

  // OAuth state methods
  async createOAuthState(state: string, provider: string, expiresInMinutes: number): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    await this.db.insert(oauthStates).values({
      state,
      provider,
      expiresAt,
    });
  }

  async validateAndConsumeOAuthState(state: string, provider: string): Promise<boolean> {
    const now = new Date();

    // Find the state record that matches and hasn't expired
    const [stateRecord] = await this.db
      .select()
      .from(oauthStates)
      .where(
        and(
          eq(oauthStates.state, state),
          eq(oauthStates.provider, provider)
        )
      );

    if (!stateRecord) {
      console.log(`OAuth state not found: ${state} for provider: ${provider}`);
      return false;
    }

    if (stateRecord.expiresAt < now) {
      console.log(`OAuth state expired: ${state} (expired at ${stateRecord.expiresAt})`);
      // Clean up expired state
      await this.db.delete(oauthStates).where(eq(oauthStates.id, stateRecord.id));
      return false;
    }

    // State is valid - consume it (delete) to prevent reuse
    await this.db.delete(oauthStates).where(eq(oauthStates.id, stateRecord.id));
    console.log(`OAuth state validated and consumed: ${state} for provider: ${provider}`);
    return true;
  }

  // Centralized service token methods
  async updateServiceToken(service: string, accessToken: string, refreshToken?: string, expiresAt?: Date, scope?: string): Promise<void> {
    const tokenData = {
      service,
      accessToken,
      refreshToken,
      expiresAt,
      scope,
      updatedAt: new Date()
    };

    // Upsert: update if exists, insert if not
    await this.db
      .insert(serviceTokens)
      .values(tokenData)
      .onConflictDoUpdate({
        target: serviceTokens.service,
        set: {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          expiresAt: tokenData.expiresAt,
          scope: tokenData.scope,
          updatedAt: tokenData.updatedAt
        }
      });

    console.log(`✓ Service token updated for ${service} (expires: ${expiresAt?.toISOString() || 'unknown'})`);
  }

  async getServiceToken(service: string): Promise<any> {
    const result = await this.db
      .select()
      .from(serviceTokens)
      .where(eq(serviceTokens.service, service))
      .limit(1);

    return result[0] || null;
  }

  // Legacy method for backward compatibility - now redirects to centralized storage
  async updateFrameioV4Token(userId: string, accessToken: string, refreshToken?: string, expiresAt?: Date): Promise<void> {
    console.log(`Migrating Frame.io token from user-level to centralized storage`);
    await this.updateServiceToken('frameio-v4', accessToken, refreshToken, expiresAt, 'openid');
  }

  async getAllUsers(): Promise<User[]> {
    // Use simple select to avoid schema issues with missing columns
    return await this.db.select().from(users);
  }

  // Revision payment methods
  async updateRevisionPayment(sessionId: string, data: { paymentStatus?: string; paidAt?: Date; stripePaymentIntentId?: string }): Promise<void> {
    await this.db
      .update(revisionPayments)
      .set(data)
      .where(eq(revisionPayments.stripeCheckoutSessionId, sessionId));
  }

  async incrementProjectRevisionCount(projectId: number): Promise<void> {
    await this.db
      .update(projects)
      .set({ 
        revisionCount: sql`${projects.revisionCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));
  }

  // Frame.io share asset methods
  async createFrameioShareAsset(asset: InsertFrameioShareAsset): Promise<FrameioShareAsset> {
    const [shareAsset] = await this.db
      .insert(frameioShareAssets)
      .values(asset)
      .returning();
    return shareAsset;
  }

  async getFrameioShareAssetsByProject(projectId: number): Promise<FrameioShareAsset[]> {
    return await this.db
      .select()
      .from(frameioShareAssets)
      .where(eq(frameioShareAssets.projectId, projectId));
  }

  async getFrameioShareAssetsByShareId(shareId: string): Promise<FrameioShareAsset[]> {
    return await this.db
      .select()
      .from(frameioShareAssets)
      .where(eq(frameioShareAssets.shareId, shareId));
  }

  async getProjectByAssetId(assetId: string): Promise<Project | undefined> {
    // Find share asset mapping
    const [shareAsset] = await this.db
      .select()
      .from(frameioShareAssets)
      .where(eq(frameioShareAssets.assetId, assetId))
      .limit(1);
    
    if (!shareAsset) {
      return undefined;
    }

    // Get the project
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, shareAsset.projectId));
    
    return project || undefined;
  }

  async deleteFrameioShareAssetsByProject(projectId: number): Promise<void> {
    await this.db
      .delete(frameioShareAssets)
      .where(eq(frameioShareAssets.projectId, projectId));
  }
}

export const storage = new DatabaseStorage();