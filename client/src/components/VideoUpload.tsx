import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Upload, File, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface VideoUploadProps {
  projectId: number;
  onUploadComplete?: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ projectId, onUploadComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('videos', file);
      });

      return apiRequest('POST', `/api/projects/${projectId}/upload`, formData);
    },
    onSuccess: (data) => {
      console.log('Upload result:', data);
      
      // Update file statuses based on results
      setSelectedFiles(prev => prev.map(uploadFile => {
        const result = data.data?.find((r: any) => 
          r.file?.originalFilename === uploadFile.file.name
        );
        
        if (result) {
          return {
            ...uploadFile,
            status: result.error ? 'failed' : 'completed',
            progress: result.error ? 0 : 100,
            error: result.error
          };
        }
        return uploadFile;
      }));

      toast({
        title: "Upload Complete",
        description: data.message || "Files uploaded successfully",
      });

      // Invalidate project queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'files'] });
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      
      // Mark all files as failed
      setSelectedFiles(prev => prev.map(file => ({
        ...file,
        status: 'failed',
        progress: 0,
        error: error.message || 'Upload failed'
      })));

      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload files",
      });
    }
  });

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const videoFiles = Array.from(files).filter(file => {
      return file.type.startsWith('video/');
    });

    if (videoFiles.length !== files.length) {
      toast({
        variant: "destructive",
        title: "Invalid Files",
        description: "Only video files are allowed",
      });
    }

    // Check file sizes (10GB limit per file)
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
    const oversizedFiles = videoFiles.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      toast({
        variant: "destructive",
        title: "Files Too Large",
        description: `Some files exceed the 10GB limit: ${oversizedFiles.map(f => f.name).join(', ')}`,
      });
      return;
    }

    const newFiles: UploadFile[] = videoFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}`,
      status: 'pending',
      progress: 0
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== id));
  };

  const startUpload = () => {
    if (selectedFiles.length === 0) return;

    // Mark all files as uploading
    setSelectedFiles(prev => prev.map(file => ({
      ...file,
      status: 'uploading',
      progress: 0
    })));

    const files = selectedFiles.map(f => f.file);
    uploadMutation.mutate(files);
  };

  const clearCompleted = () => {
    setSelectedFiles(prev => prev.filter(file => 
      file.status !== 'completed' && file.status !== 'failed'
    ));
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'uploading':
        return <AlertCircle className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSize = selectedFiles.reduce((sum, file) => sum + file.file.size, 0);
  const completedFiles = selectedFiles.filter(f => f.status === 'completed').length;
  const failedFiles = selectedFiles.filter(f => f.status === 'failed').length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Video Upload
        </CardTitle>
        <CardDescription>
          Upload video files to your Vimeo project folder. Maximum 10GB per request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">
            Drop video files here or{' '}
            <label className="text-primary cursor-pointer hover:underline">
              browse
              <input
                type="file"
                multiple
                accept="video/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </label>
          </p>
          <p className="text-sm text-gray-500">
            Supports MP4, MOV, AVI, and other video formats
          </p>
        </div>

        {/* File List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">
                Files to Upload ({selectedFiles.length})
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCompleted}
                disabled={completedFiles === 0 && failedFiles === 0}
              >
                Clear Completed
              </Button>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
              {selectedFiles.map((uploadFile) => (
                <div key={uploadFile.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(uploadFile.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(uploadFile.file.size)}
                      </p>
                      {uploadFile.status === 'uploading' && (
                        <Progress value={uploadFile.progress} className="mt-1 h-1" />
                      )}
                      {uploadFile.error && (
                        <p className="text-xs text-red-500 mt-1">
                          {uploadFile.error}
                        </p>
                      )}
                    </div>
                  </div>
                  {uploadFile.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Stats */}
        {selectedFiles.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Total size: {formatFileSize(totalSize)} | 
              Ready: {selectedFiles.filter(f => f.status === 'pending').length} | 
              Completed: {completedFiles} | 
              Failed: {failedFiles}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Button */}
        {selectedFiles.length > 0 && (
          <Button
            onClick={startUpload}
            disabled={uploadMutation.isPending || selectedFiles.every(f => f.status !== 'pending')}
            className="w-full"
          >
            {uploadMutation.isPending ? 'Uploading...' : `Upload ${selectedFiles.filter(f => f.status === 'pending').length} Files`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoUpload;