// Simplified upload utilities for TUS direct uploads
import { storage } from "./storage";

/**
 * Calculate current upload size for a project
 */
export async function getProjectUploadSize(projectId: number): Promise<number> {
  try {
    const files = await storage.getProjectFiles(projectId);
    return files.reduce((total, file) => total + (file.fileSize || 0), 0);
  } catch (error) {
    console.error('Error calculating project upload size:', error);
    return 0;
  }
}