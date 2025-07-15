import { 
  users, 
  projects, 
  projectFiles, 
  projectStatusLog, 
  emailSignups, 
  type User, 
  type InsertUser, 
  type Project,
  type InsertProject,
  type UpdateProject,
  type ProjectFile,
  type InsertProjectFile,
  type ProjectStatusLog,
  type EmailSignup, 
  type InsertEmailSignup 
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyUser(token: string): Promise<User | undefined>;
  updateUserVerification(id: number, verifiedAt: Date): Promise<void>;
  
  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUser(userId: number): Promise<Project[]>;
  createProject(userId: number, project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: UpdateProject): Promise<Project | undefined>;
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
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const verificationToken = randomBytes(32).toString('hex');
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        verificationToken,
      })
      .returning();
    return user;
  }

  async verifyUser(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.verificationToken, token));
    return user || undefined;
  }

  async updateUserVerification(id: number, verifiedAt: Date): Promise<void> {
    await db
      .update(users)
      .set({ verifiedAt, verificationToken: null })
      .where(eq(users.id, id));
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async createProject(userId: number, project: InsertProject): Promise<Project> {
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
}

export const storage = new DatabaseStorage();
