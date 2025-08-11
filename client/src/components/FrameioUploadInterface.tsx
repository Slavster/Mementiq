import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  X, 
  CheckCircle, 
  AlertCircle, 
  FileVideo, 
  Trash2,
  RefreshCw 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface FrameioUploadInterfaceProps {
  project: {
    id: number;
    title: string;
    status: string;
  };
  onUploadComplete: () => void;
  onCancel: () => void;
  onProjectStatusChange?: () => void;
}

interface ExistingFile {
  id: string;
  name: string;
  type: string;
  filesize?: number;
  file_size?: number;
  created_at: string;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
  frameioId?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
const MAX_FILE_COUNT = 100; // Maximum 100 files per project
const ALLOWED_TYPES = [
  // Video formats
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/mkv',
  'video/x-matroska',
  // Image formats
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp',
  'image/tiff',
  // Audio formats
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'audio/m4a',
  'audio/x-wav'
];

export function FrameioUploadInterface({ project, onUploadComplete, onCancel, onProjectStatusChange }: FrameioUploadInterfaceProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [folderSetupStatus, setFolderSetupStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const [totalSize, setTotalSize] = useState(0);
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>([]);
  const [existingFileCount, setExistingFileCount] = useState(0);
  const [existingStorageUsed, setExistingStorageUsed] = useState(0);
  const { toast } = useToast();

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Check folder structure on component mount
  React.useEffect(() => {
    checkFolderStructure();
  }, [project.id]);

  const checkFolderStructure = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        setFolderSetupStatus('error');
        return;
      }

      const response = await fetch(`/api/projects/${project.id}/ensure-folder-structure`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (result.success && result.frameioConfigured) {
        setFolderSetupStatus('ready');
        setExistingFiles(result.existingFiles || []);
        setExistingFileCount(result.fileCount || 0);
        setExistingStorageUsed(result.totalStorageUsed || 0);
        
        // Notify parent component that project status may have changed
        if (onProjectStatusChange) {
          onProjectStatusChange();
        }
      } else {
        setFolderSetupStatus('error');
      }
    } catch (error) {
      console.error('Folder structure check failed:', error);
      setFolderSetupStatus('error');
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`;
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload video, image, or audio files only.';
    }
    
    return null;
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    // Check file count limit
    const totalFileCount = existingFileCount + files.length + selectedFiles.length;
    if (totalFileCount > MAX_FILE_COUNT) {
      toast({
        title: "File limit exceeded",
        description: `Cannot upload ${selectedFiles.length} files. Project already has ${existingFileCount} files. Maximum allowed: ${MAX_FILE_COUNT} files total.`,
        variant: "destructive",
      });
      return;
    }
    
    const newFiles: UploadFile[] = [];
    let newTotalSize = totalSize;
    
    for (const file of selectedFiles) {
      const validation = validateFile(file);
      if (validation) {
        toast({
          title: "File validation error",
          description: `${file.name}: ${validation}`,
          variant: "destructive",
        });
        continue;
      }
      
      if (newTotalSize + file.size > MAX_FILE_SIZE) {
        toast({
          title: "Storage limit exceeded",
          description: `Adding ${file.name} would exceed the ${formatFileSize(MAX_FILE_SIZE)} limit`,
          variant: "destructive",
        });
        continue;
      }
      
      newFiles.push({
        file,
        id: `${Date.now()}-${Math.random()}`,
        progress: 0,
        status: 'pending'
      });
      
      newTotalSize += file.size;
    }
    
    setFiles(prev => [...prev, ...newFiles]);
    setTotalSize(newTotalSize);
    
    // Clear the input
    event.target.value = '';
  }, [totalSize, toast]);

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove) {
        setTotalSize(current => current - fileToRemove.file.size);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error('Authentication required');
      }

      // Update file status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading' as const, progress: 0 }
          : f
      ));

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('filename', uploadFile.file.name);
      formData.append('projectId', project.id.toString());

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id && f.status === 'uploading'
            ? { ...f, progress: Math.min(f.progress + 10, 90) }
            : f
        ));
      }, 200);

      // Upload to Frame.io via our backend
      const response = await fetch('/api/upload/frameio', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      
      // Update file status to complete
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'complete' as const, 
              progress: 100,
              frameioId: result.frameioId 
            }
          : f
      ));

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      
      // Update file status to error
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'Upload failed'
            }
          : f
      ));
      
      throw error;
    }
  };

  const startUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const pendingFiles = files.filter(f => f.status === 'pending');
      let successCount = 0;
      let errorCount = 0;
      
      // Upload files sequentially to avoid overwhelming the server
      for (const file of pendingFiles) {
        try {
          await uploadFile(file);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to upload ${file.file.name}:`, error);
          // Continue with next file even if one fails
        }
      }
      
      if (successCount > 0) {
        toast({
          title: "Upload complete",
          description: `Successfully uploaded ${successCount} file(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        });
        
        // If at least some files uploaded successfully, proceed
        if (successCount === pendingFiles.length) {
          setTimeout(onUploadComplete, 1000);
        }
      } else {
        toast({
          title: "Upload failed",
          description: "All files failed to upload. Please check your files and try again.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      toast({
        title: "Upload error",
        description: "An unexpected error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (folderSetupStatus === 'checking') {
    return (
      <Card className="bg-yellow-500/10 border-yellow-500/30">
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-12 w-12 text-yellow-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold text-yellow-500 mb-2">
            Setting up video project
          </h3>
          <p className="text-gray-400">
            Your project folder is being created. This may take a few moments.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (folderSetupStatus === 'error') {
    return (
      <Card className="bg-red-500/10 border-red-500/30">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-500 mb-2">
            Setup Error
          </h3>
          <p className="text-gray-400 mb-4">
            Could not set up your project folder. Please try again.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={checkFolderStructure}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Setup
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Media Files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project file info */}
          <div className="bg-black/20 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Project Files</span>
              <span className="text-sm text-white">
                {existingFileCount + files.length} / {MAX_FILE_COUNT} files
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Storage Used</span>
              <span className="text-sm text-white">
                {formatFileSize(existingStorageUsed + totalSize)} total
              </span>
            </div>
            <Progress 
              value={((existingFileCount + files.length) / MAX_FILE_COUNT) * 100} 
              className="h-2"
            />
          </div>

          {/* Existing files */}
          {existingFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-white font-medium">Existing Files ({existingFiles.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {existingFiles.map((file) => (
                  <div
                    key={file.id}
                    className="bg-gray-800/30 rounded-lg p-3 flex items-center gap-3"
                  >
                    <FileVideo className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        {file.name}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {formatFileSize(file.filesize || file.file_size || 0)} • Uploaded
                      </p>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File upload area */}
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <input
              type="file"
              id="file-upload"
              multiple
              accept="video/*,image/*,audio/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="text-white font-medium">
                Choose video, image, or audio files and drag them here
              </span>
              <span className="text-sm text-gray-400">
                Supports MP4, AVI, MOV, JPG, PNG, MP3, WAV and other formats (max {formatFileSize(MAX_FILE_SIZE)} per file)
              </span>
              <span className="text-xs text-yellow-400">
                {existingFileCount + files.length} / {MAX_FILE_COUNT} files used
              </span>
            </label>
          </div>

          {/* New files to upload */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-white font-medium">New Files to Upload ({files.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-black/20 rounded-lg p-3 flex items-center gap-3"
                  >
                    <FileVideo className="h-5 w-5 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        {file.file.name}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {formatFileSize(file.file.size)}
                      </p>
                      {file.status === 'uploading' && (
                        <Progress value={file.progress} className="h-1 mt-1" />
                      )}
                      {file.status === 'error' && (
                        <p className="text-red-400 text-xs mt-1">{file.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'complete' && (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      )}
                      {file.status === 'pending' && !isUploading && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(file.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={startUpload}
              disabled={files.length === 0 || isUploading || files.every(f => f.status === 'complete')}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onCancel} disabled={isUploading}>
              Cancel
            </Button>
          </div>

          {files.some(f => f.status === 'complete') && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-400">
                Files uploaded successfully! Click "Continue" to proceed to the next step.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}