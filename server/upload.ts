import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request } from 'express';

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create project-specific subdirectory
    const projectId = req.body.projectId || 'temp';
    const projectDir = path.join(uploadDir, `project_${projectId}`);
    
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    cb(null, projectDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${timestamp}_${baseName}${ext}`);
  }
});

// File filter to only allow video files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/quicktime',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv',
    'video/m4v',
    'video/3gp'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'));
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB limit
    files: 10 // Maximum 10 files per request
  }
});

// Cleanup function to remove uploaded files after processing
export const cleanupUploadedFiles = (files: Express.Multer.File[]) => {
  files.forEach(file => {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
};

// Get total size of uploaded files for a project
export const getProjectUploadSize = (projectId: number): number => {
  const projectDir = path.join(uploadDir, `project_${projectId}`);
  if (!fs.existsSync(projectDir)) {
    return 0;
  }

  let totalSize = 0;
  const files = fs.readdirSync(projectDir);
  
  files.forEach(filename => {
    const filePath = path.join(projectDir, filename);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
  });

  return totalSize;
};

// Clean up project directory
export const cleanupProjectDirectory = (projectId: number) => {
  const projectDir = path.join(uploadDir, `project_${projectId}`);
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
};