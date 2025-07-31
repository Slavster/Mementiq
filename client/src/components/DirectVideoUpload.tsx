import React, { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  File,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Cloud,
} from "lucide-react";

interface DirectVideoUploadProps {
  projectId: number;
  onUploadComplete?: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  status:
    | "pending"
    | "session"
    | "uploading"
    | "completing"
    | "verifying"
    | "verified"
    | "completed"
    | "failed";
  progress: number;
  error?: string;
  uploadSession?: {
    uploadUrl: string;
    videoUri: string;
    completeUri: string;
    ticketId: string;
  };
  verification?: {
    isUploaded: boolean;
    isTranscoding: boolean;
    isReady: boolean;
    status: string;
    canProceed: boolean;
  };
  videoId?: string;
}

const DirectVideoUpload: React.FC<DirectVideoUploadProps> = ({
  projectId,
  onUploadComplete,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing project files and storage info
  const { data: projectFilesData, isLoading: filesLoading, refetch } = useQuery({
    queryKey: ["projects", projectId, "files"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/projects/${projectId}/files`);
      return await response.json();
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache results (cacheTime renamed to gcTime in v5)
  });

  const existingFiles = projectFilesData?.success ? projectFilesData.data : null;

  const createSessionMutation = useMutation({
    mutationFn: async ({
      fileName,
      fileSize,
    }: {
      fileName: string;
      fileSize: number;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/upload-session`,
        {
          fileName,
          fileSize,
        },
      );
      return await response.json();
    },
  });

  const completeUploadMutation = useMutation({
    mutationFn: async (data: {
      completeUri: string;
      videoUri: string;
      fileName: string;
      fileSize: number;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/complete-upload`,
        data,
      );
      return await response.json();
    },
  });

  const verifyUploadMutation = useMutation({
    mutationFn: async (data: { videoId: string; projectId: number }) => {
      const response = await apiRequest(
        "POST",
        "/api/upload/verify-video",
        data,
      );
      return await response.json();
    },
  });

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const videoFiles = Array.from(files).filter((file) => {
        return file.type.startsWith("video/");
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
      const oversizedFiles = videoFiles.filter((file) => file.size > maxSize);

      if (oversizedFiles.length > 0) {
        toast({
          variant: "destructive",
          title: "Files Too Large",
          description: `Some files exceed the 10GB limit: ${oversizedFiles.map((f) => f.name).join(", ")}`,
        });
        return;
      }

      const newFiles: UploadFile[] = videoFiles.map((file) => ({
        file,
        id: `${file.name}-${Date.now()}`,
        status: "pending",
        progress: 0,
      }));

      setSelectedFiles((prev) => [...prev, ...newFiles]);

      // Reset file input to allow re-selecting the same files
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [toast],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.id !== id));

    // Reset file input to allow re-selecting files
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadToVimeo = async (uploadFile: UploadFile) => {
    try {
      // Step 1: Create upload session
      setSelectedFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: "session" } : f,
        ),
      );

      const sessionData = await createSessionMutation.mutateAsync({
        fileName: uploadFile.file.name,
        fileSize: uploadFile.file.size,
      });

      console.log("=== SESSION CREATION DEBUG ===");
      console.log("Session data received:", sessionData);
      console.log("Session data type:", typeof sessionData);
      console.log(
        "Session data keys:",
        sessionData ? Object.keys(sessionData) : "null",
      );
      console.log("Session data JSON:", JSON.stringify(sessionData, null, 2));

      if (!sessionData || !sessionData.uploadSession) {
        console.error("Invalid session data structure:", {
          sessionData,
          hasUploadSession: !!sessionData?.uploadSession,
        });
        throw new Error("Invalid upload session response from server");
      }

      const uploadSession = sessionData.uploadSession;
      console.log("Upload session object:", uploadSession);
      console.log("Upload session keys:", Object.keys(uploadSession));
      console.log(
        "Upload session JSON:",
        JSON.stringify(uploadSession, null, 2),
      );

      if (!uploadSession.uploadUrl) {
        console.error("Upload session missing uploadUrl:", uploadSession);
        console.error("Available properties:", Object.keys(uploadSession));
        throw new Error("Upload session is missing required uploadUrl");
      }

      console.log("Starting TUS upload with URL:", uploadSession.uploadUrl);
      console.log("=== SESSION CREATION COMPLETE ===");

      // Step 2: Upload directly to Vimeo using TUS protocol
      setSelectedFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: "uploading",
                uploadSession,
                progress: 0,
              }
            : f,
        ),
      );

      // Use TUS (tus.io) protocol for resumable uploads
      console.log("Starting TUS upload...");
      try {
        await uploadWithTUS(uploadFile, uploadSession);
        console.log("TUS upload completed successfully");
      } catch (tusError) {
        console.error("TUS upload failed:", tusError);
        throw new Error(`TUS upload failed: ${tusError instanceof Error ? tusError.message : String(tusError)}`);
      }

      // Step 3: Complete upload
      setSelectedFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "completing", progress: 95 }
            : f,
        ),
      );

      console.log("About to call complete upload with:", {
        completeUri: uploadSession.completeUri,
        videoUri: uploadSession.videoUri,
        fileName: uploadFile.file.name,
        fileSize: uploadFile.file.size,
      });

      // Note: completeUri is optional in modern Vimeo API (3.4+)
      console.log("CompleteUri available:", !!uploadSession.completeUri);

      const completeResult = await completeUploadMutation.mutateAsync({
        completeUri: uploadSession.completeUri || null,
        videoUri: uploadSession.videoUri,
        fileName: uploadFile.file.name,
        fileSize: uploadFile.file.size,
      });

      // Step 4: Extract video ID and start verification
      const videoId = uploadSession.videoUri.split("/").pop() || "";

      setSelectedFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: "verifying",
                progress: 100,
                videoId,
              }
            : f,
        ),
      );

      // Step 5: Verify upload with Vimeo API
      await verifyVideoUpload(uploadFile.id, videoId);

      toast({
        title: "Upload Complete",
        description: `${uploadFile.file.name} uploaded and verified successfully`,
      });
    } catch (error: any) {
      console.error("Direct upload error:", error);
      console.error("Error stack:", error.stack);
      console.error("Error type:", typeof error);
      console.error("Error message:", error.message);

      let errorMessage = "Upload failed";

      // Check for authentication errors
      if (
        error.message?.includes("Authentication") ||
        error.message?.includes("token") ||
        error.message?.includes("unauthorized")
      ) {
        errorMessage = "Authentication failed. Please log in again.";
      } else if (error.message?.includes("session")) {
        errorMessage = "Failed to create upload session. Please try again.";
      } else if (error.message?.includes("completeUri")) {
        errorMessage = "Upload session invalid. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.error("Final error message to user:", errorMessage);

      setSelectedFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: "failed",
                progress: 0,
                error: errorMessage,
              }
            : f,
        ),
      );
    }
  };

  const verifyVideoUpload = async (
    fileId: string,
    videoId: string,
  ): Promise<void> => {
    const maxRetries = 30; // Maximum 5 minutes (10 seconds * 30)
    let retries = 0;

    const pollVerification = async (): Promise<void> => {
      try {
        const result = await verifyUploadMutation.mutateAsync({
          videoId,
          projectId,
        });

        const verification = result.verification;
        const canProceed = result.canProceed;

        // Update file with verification status
        setSelectedFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  verification,
                }
              : f,
          ),
        );

        if (canProceed) {
          // Video is successfully uploaded and ready (or transcoding)
          setSelectedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    status: "verified",
                    verification: { ...verification, canProceed: true },
                  }
                : f,
            ),
          );

          // Mark as fully completed
          setTimeout(() => {
            setSelectedFiles((prev) =>
              prev.map((f) =>
                f.id === fileId ? { ...f, status: "completed" } : f,
              ),
            );
          }, 1000);

          return;
        }

        // Check if we should retry
        if (retries < maxRetries && !verification.isUploaded) {
          retries++;
          console.log(
            `Verification attempt ${retries}/${maxRetries} for video ${videoId}`,
          );

          setTimeout(() => {
            pollVerification();
          }, 10000); // Wait 10 seconds before retry
          return;
        }

        // Failed verification - mark as failed and prompt retry
        setSelectedFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "failed",
                  error:
                    "Upload verification failed. Please try uploading again.",
                  verification,
                }
              : f,
          ),
        );

        toast({
          variant: "destructive",
          title: "Upload Verification Failed",
          description: "Please upload this video again.",
        });
      } catch (error: any) {
        console.error("Verification error:", error);

        if (retries < maxRetries) {
          retries++;
          setTimeout(() => {
            pollVerification();
          }, 10000);
        } else {
          setSelectedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    status: "failed",
                    error:
                      "Verification failed after multiple attempts. Please try uploading again.",
                  }
                : f,
            ),
          );
        }
      }
    };

    // Start verification polling
    await pollVerification();
  };

  const uploadWithTUS = async (
    uploadFile: UploadFile,
    uploadSession: any,
  ): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const file = uploadFile.file;
        const uploadUrl = uploadSession.uploadUrl;

        console.log(
          "TUS upload starting for file:",
          file.name,
          "size:",
          file.size,
        );
        console.log("Upload URL:", uploadUrl);
        console.log("Upload session object:", uploadSession);

        // Create a simple TUS implementation
        // First, send HEAD request to get upload offset
        let uploadOffset = 0;

        try {
          const headResponse = await fetch(uploadUrl, {
            method: "HEAD",
            headers: {
              "Tus-Resumable": "1.0.0",
            },
          });

          if (headResponse.headers.get("Upload-Offset")) {
            uploadOffset = parseInt(
              headResponse.headers.get("Upload-Offset") || "0",
            );
          }
        } catch (headError) {
          // If HEAD fails, start from 0
          uploadOffset = 0;
        }

        // Upload file in chunks
        const chunkSize = 8 * 1024 * 1024; // 8MB chunks
        const totalSize = file.size;

        while (uploadOffset < totalSize) {
          const end = Math.min(uploadOffset + chunkSize, totalSize);
          const chunk = file.slice(uploadOffset, end);

          const patchResponse = await fetch(uploadUrl, {
            method: "PATCH",
            headers: {
              "Tus-Resumable": "1.0.0",
              "Upload-Offset": uploadOffset.toString(),
              "Content-Type": "application/offset+octet-stream",
            },
            body: chunk,
          });

          if (!patchResponse.ok) {
            throw new Error(
              `Upload failed: ${patchResponse.status} ${patchResponse.statusText}`,
            );
          }

          uploadOffset = end;
          const progress = Math.round((uploadOffset / totalSize) * 90); // Save 10% for completion

          setSelectedFiles((prev) =>
            prev.map((f) => (f.id === uploadFile.id ? { ...f, progress } : f)),
          );
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  const startDirectUpload = async () => {
    const pendingFiles = selectedFiles.filter((f) => f.status === "pending");

    if (pendingFiles.length === 0) return;

    // Upload files sequentially to avoid overwhelming the API
    for (const file of pendingFiles) {
      await uploadToVimeo(file);
    }

    // Invalidate project queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
    queryClient.invalidateQueries({
      queryKey: ["projects", projectId, "files"],
    });

    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const clearCompleted = () => {
    setSelectedFiles((prev) =>
      prev.filter(
        (file) => file.status !== "completed" && file.status !== "failed",
      ),
    );

    // Reset file input to allow re-selecting files
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getStatusIcon = (status: UploadFile["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "verified":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "verifying":
        return (
          <AlertCircle className="h-4 w-4 text-yellow-500 animate-pulse" />
        );
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "uploading":
      case "completing":
        return <AlertCircle className="h-4 w-4 text-blue-500 animate-spin" />;
      case "session":
        return <Cloud className="h-4 w-4 text-purple-500 animate-pulse" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: UploadFile["status"]) => {
    switch (status) {
      case "session":
        return "Creating session...";
      case "uploading":
        return "Uploading...";
      case "completing":
        return "Finalizing...";
      case "verifying":
        return "Verifying...";
      case "verified":
        return "Verified & Ready";
      case "completed":
        return "Complete";
      case "failed":
        return "Failed";
      default:
        return "Ready";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const totalSize = selectedFiles.reduce(
    (sum, file) => sum + file.file.size,
    0,
  );
  const completedFiles = selectedFiles.filter(
    (f) => f.status === "completed",
  ).length;
  const verifyingFiles = selectedFiles.filter(
    (f) => f.status === "verifying",
  ).length;
  const verifiedFiles = selectedFiles.filter(
    (f) => f.status === "verified",
  ).length;
  const failedFiles = selectedFiles.filter((f) => f.status === "failed").length;
  const isUploading = selectedFiles.some((f) =>
    ["session", "uploading", "completing", "verifying"].includes(f.status),
  );
  const allFilesCompleted =
    selectedFiles.length > 0 &&
    selectedFiles.every(
      (f) => f.status === "completed" || f.status === "verified",
    );
  const canProceed =
    selectedFiles.length > 0 &&
    selectedFiles.every(
      (f) => f.status === "completed" || f.status === "verified",
    ) &&
    !isUploading;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Video Upload
        </CardTitle>
        <CardDescription>
          Upload video files; maximum 10GB per project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Storage Usage Display */}
        {filesLoading ? (
          <div className="p-4 rounded-lg animate-pulse">
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-2 bg-gray-300 rounded"></div>
          </div>
        ) : (
          <div className="p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-sm text-blue-400">Current Storage Usage</h4>
              <span className="text-sm font-medium text-blue-300">
                {existingFiles?.storage?.usedGB < 0.1 && existingFiles?.storage?.usedMB > 0 
                  ? `${existingFiles?.storage?.usedMB || 0} MB`
                  : `${existingFiles?.storage?.usedGB || 0} GB`
                }/{existingFiles?.storage?.maxGB || 10} GB
              </span>
            </div>
            <Progress 
              value={existingFiles?.storage?.percentUsed > 0 ? Math.max(existingFiles.storage.percentUsed, 1) : 0} 
              className="h-2"
            />
          </div>
        )}

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">
            Drop video files here or{" "}
            <label className="text-primary cursor-pointer hover:underline">
              browse
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
                disabled={isUploading}
              />
            </label>
          </p>
          <p className="text-sm text-gray-500">
            Upload your videos - supports MP4, MOV, AVI, and other video formats
          </p>
        </div>

        {/* Existing Videos Table - show if any videos exist */}
        {!filesLoading && existingFiles?.vimeoVideos && existingFiles.vimeoVideos.length > 0 && (
          <div className="bg-gray-800 dark:bg-gray-900 p-4 rounded-lg border border-gray-700">
            <h4 className="font-medium text-sm mb-3 text-gray-200">
              Existing Videos ({existingFiles.vimeoVideos.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-2 px-3 font-medium text-gray-300">Filename</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-300">Size</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-300">Upload Date</th>
                  </tr>
                </thead>
                <tbody>
                  {existingFiles.vimeoVideos.map((video: any, index: number) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="py-2 px-3">
                        <span className="truncate max-w-xs block text-gray-200" title={video.name}>
                          {video.name || `Video ${index + 1}`}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-400">
                        {formatFileSize(video.file_size || 0)}
                      </td>
                      <td className="py-2 px-3 text-gray-400">
                        {video.created_time 
                          ? new Date(video.created_time).toLocaleDateString()
                          : 'Unknown'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                <div
                  key={uploadFile.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(uploadFile.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(uploadFile.file.size)} •{" "}
                        {getStatusText(uploadFile.status)}
                      </p>
                      {["uploading", "completing"].includes(
                        uploadFile.status,
                      ) && (
                        <Progress
                          value={uploadFile.progress}
                          className="mt-1 h-1"
                        />
                      )}
                      {uploadFile.status === "verifying" &&
                        uploadFile.verification && (
                          <div className="text-xs text-yellow-600 mt-1">
                            Upload:{" "}
                            {uploadFile.verification.isUploaded
                              ? "Complete"
                              : "Pending"}{" "}
                            | Status: {uploadFile.verification.status} |
                            Transcoding:{" "}
                            {uploadFile.verification.isTranscoding
                              ? "In Progress"
                              : uploadFile.verification.isReady
                                ? "Complete"
                                : "Pending"}
                          </div>
                        )}
                      {uploadFile.error && (
                        <p className="text-xs text-red-500 mt-1">
                          {uploadFile.error}
                        </p>
                      )}
                    </div>
                  </div>
                  {uploadFile.status === "pending" && (
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
              Total size: {formatFileSize(totalSize)} | Ready:{" "}
              {selectedFiles.filter((f) => f.status === "pending").length} |
              {verifyingFiles > 0 && `Verifying: ${verifyingFiles} | `}
              {verifiedFiles > 0 && `Verified: ${verifiedFiles} | `}
              Completed: {completedFiles} | Failed: {failedFiles}
            </AlertDescription>
          </Alert>
        )}

        {/* Verification Status Alert */}
        {verifyingFiles > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Verification in Progress:</strong> We're checking to
              confirm your videos were received successfully. This ensures your
              uploads are complete before you can proceed to the next step.
            </AlertDescription>
          </Alert>
        )}

        {/* Ready to Proceed Alert */}
        {canProceed && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>All videos verified!</strong> Your uploads have been
              confirmed and are ready for processing.
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Button */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Button
              onClick={startDirectUpload}
              disabled={
                isUploading ||
                selectedFiles.every((f) => f.status !== "pending")
              }
              className="w-full"
            >
              {isUploading
                ? "Uploading..."
                : `Upload ${selectedFiles.filter((f) => f.status === "pending").length} Files`}
            </Button>

            {/* Proceed Button - Only enabled when all uploads are verified */}
            {selectedFiles.length > 0 && completedFiles + verifiedFiles > 0 && (
              <Button
                onClick={() => {
                  if (onUploadComplete) {
                    onUploadComplete();
                  }
                }}
                disabled={!canProceed}
                variant={canProceed ? "default" : "secondary"}
                className="w-full"
              >
                {canProceed
                  ? `Next: Project Details Form (${completedFiles + verifiedFiles} files verified)`
                  : verifyingFiles > 0
                    ? `Please wait - Verifying ${verifyingFiles} files...`
                    : failedFiles > 0
                      ? `Fix ${failedFiles} failed uploads before proceeding`
                      : "Upload files to proceed"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DirectVideoUpload;
