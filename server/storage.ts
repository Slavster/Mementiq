import { users, emailSignups, type User, type InsertUser, type EmailSignup, type InsertEmailSignup } from "../shared/schema.js";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createEmailSignup(emailSignup: InsertEmailSignup): Promise<EmailSignup>;
  getEmailSignups(): Promise<EmailSignup[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private emailSignups: Map<number, EmailSignup>;
  private currentUserId: number;
  private currentEmailId: number;

  constructor() {
    this.users = new Map();
    this.emailSignups = new Map();
    this.currentUserId = 1;
    this.currentEmailId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createEmailSignup(insertEmailSignup: InsertEmailSignup): Promise<EmailSignup> {
    // Check if email already exists
    const existingEmail = Array.from(this.emailSignups.values()).find(
      (signup) => signup.email === insertEmailSignup.email
    );
    
    if (existingEmail) {
      throw new Error("Email already exists");
    }

    const id = this.currentEmailId++;
    const emailSignup: EmailSignup = { 
      ...insertEmailSignup, 
      id, 
      createdAt: new Date() 
    };
    this.emailSignups.set(id, emailSignup);
    return emailSignup;
  }

  async getEmailSignups(): Promise<EmailSignup[]> {
    return Array.from(this.emailSignups.values());
  }
}

export const storage = new MemStorage();
