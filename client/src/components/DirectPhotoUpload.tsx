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
  Image,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Cloud,
  Trash2,
} from "lucide-react";

interface DirectPhotoUploadProps {
  projectId: number;
  onUploadComplete?: () => void;
}

interface UploadPhoto {
  file: File;
  id: string;
  status: "pending" | "uploading" | "completed" | "failed";
  progress: number;
  error?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
}

const DirectPhotoUpload: React.FC<DirectPhotoUploadProps> = ({
  projectId,
  onUploadComplete,
}) => {
  const [selectedPhotos, setSelectedPhotos] = useState<UploadPhoto[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing photo album and files
  const {
    data: photoData,
    isLoading: photosLoading,
    refetch,
  } = useQuery({
    queryKey: ["projects", projectId, "photos"],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/projects/${projectId}/photos`,
      );
      return await response.json();
    },
  });

  const uploadToFrameio = async (uploadPhoto: UploadPhoto): Promise<void> => {
    try {
      console.log("Starting Frame.io upload for:", uploadPhoto.file.name);

      setSelectedPhotos((prev) =>
        prev.map((p) =>
          p.id === uploadPhoto.id
            ? { ...p, status: "uploading", progress: 10 }
            : p,
        ),
      );

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(uploadPhoto.file);
      });

      setSelectedPhotos((prev) =>
        prev.map((p) => (p.id === uploadPhoto.id ? { ...p, progress: 30 } : p)),
      );

      // Upload to Frame.io via our backend
      const uploadResponse = await apiRequest("POST", "/api/photos/upload", {
        projectId,
        filename: uploadPhoto.file.name,
        fileSize: uploadPhoto.file.size,
        mimeType: uploadPhoto.file.type,
        base64Data: base64,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      const result = await uploadResponse.json();

      if (!result.success) {
        throw new Error(result.message || "Upload failed");
      }

      setSelectedPhotos((prev) =>
        prev.map((p) =>
          p.id === uploadPhoto.id
            ? {
                ...p,
                status: "completed",
                progress: 100,
                frameioUrl: result.photo.frameioUrl,
                thumbnailUrl: result.photo.mediaThumbnailUrl,
              }
            : p,
        ),
      );

      console.log("Photo upload completed:", result);
      
      // Invalidate queries immediately after each photo upload to refresh project data
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    } catch (error: any) {
      console.error("Photo upload error:", error);
      setSelectedPhotos((prev) =>
        prev.map((p) =>
          p.id === uploadPhoto.id
            ? {
                ...p,
                status: "failed",
                error: error.message || "Upload failed",
              }
            : p,
        ),
      );

      toast({
        variant: "destructive",
        title: "Photo Upload Failed",
        description: error.message || "Please try uploading again.",
      });
    }
  };

  const startPhotoUpload = async () => {
    const pendingPhotos = selectedPhotos.filter((p) => p.status === "pending");

    if (pendingPhotos.length === 0) return;

    // Upload photos sequentially to avoid overwhelming the API
    for (const photo of pendingPhotos) {
      await uploadToFrameio(photo);
    }

    console.log("Photo upload completed, invalidating queries...");
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
    queryClient.invalidateQueries({
      queryKey: ["projects", projectId, "photos"],
    });
    // Also invalidate the main projects list to refresh status on dashboard
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    console.log("Query invalidation completed");

    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const validImageTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      const newPhotos: UploadPhoto[] = [];

      Array.from(files).forEach((file) => {
        if (!validImageTypes.includes(file.type)) {
          toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: `${file.name} is not a supported image format. Please upload JPEG, PNG, GIF, or WebP images.`,
          });
          return;
        }

        if (file.size > 524288000) {
          // 500MB limit
          toast({
            variant: "destructive",
            title: "File Too Large",
            description: `${file.name} is larger than 500MB. Please choose a smaller image.`,
          });
          return;
        }

        newPhotos.push({
          file,
          id: Math.random().toString(36).substring(7),
          status: "pending",
          progress: 0,
        });
      });

      setSelectedPhotos((prev) => [...prev, ...newPhotos]);
    },
    [toast],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removePhoto = (photoId: string) => {
    setSelectedPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const clearCompleted = () => {
    setSelectedPhotos((prev) =>
      prev.filter(
        (photo) => photo.status !== "completed" && photo.status !== "failed",
      ),
    );

    // Reset file input to allow re-selecting files
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getStatusIcon = (status: UploadPhoto["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "uploading":
        return <Cloud className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const totalPhotos = selectedPhotos.length;
  const completedPhotos = selectedPhotos.filter(
    (p) => p.status === "completed",
  ).length;
  const failedPhotos = selectedPhotos.filter(
    (p) => p.status === "failed",
  ).length;
  const uploadingPhotos = selectedPhotos.filter(
    (p) => p.status === "uploading",
  ).length;

  // Calculate current album usage - use actual photo files for accurate count
  const actualPhotoSizes = photoData?.photos?.reduce((total: number, photo: any) => total + (photo.fileSize || 0), 0) || 0;
  const albumSizeLimit = 524288000; // 500MB
  const albumUsagePercent = (actualPhotoSizes / albumSizeLimit) * 100;
  // Ensure minimum 2% visibility for any content, like video upload
  const displayPercent = actualPhotoSizes > 0 ? Math.max(albumUsagePercent, 2) : 0;

  return (
    <div className="w-full space-y-6 bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
      {/* Header Section */}
      <div>
        <h2 className="text-2xl font-semibold text-white flex items-center gap-2 mb-2">
          <Image className="h-6 w-6" />
          Photo Upload (Optional)
        </h2>
        <p className="text-gray-400">
          Upload any photos you want included in your video, up to 500MB in total.
        </p>
      </div>

      {/* Current Storage Usage - matching video upload style exactly */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-blue-400">Current Storage Usage</span>
          <span className="text-gray-300">
            {formatFileSize(actualPhotoSizes)} / 500 MB
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(displayPercent, 100)}%` }}
          />
        </div>
      </div>
      {/* Drag and Drop Area - matching video upload style */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragOver
            ? "border-blue-500 bg-blue-950/20"
            : "border-gray-600 hover:border-gray-500"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center space-y-3">
          <Upload className="h-12 w-12 text-gray-400" />
          <div className="text-white">
            <span className="font-medium">Drop photo files here or </span>
            <span className="text-purple-400 underline hover:text-purple-300">browse</span>
          </div>
          <div className="text-sm text-gray-400">
            Upload your photos - supports JPEG, PNG, GIF, and WebP formats
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Upload Queue */}
      {selectedPhotos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-medium">
              Upload Queue ({totalPhotos} photos)
            </h4>
            <div className="flex gap-2">
              {selectedPhotos.some((p) => p.status === "pending") && (
                <Button onClick={startPhotoUpload} size="sm" className="bg-purple-600 hover:bg-purple-700">
                  Start Upload
                </Button>
              )}
              {(completedPhotos > 0 || failedPhotos > 0) && (
                <Button onClick={clearCompleted} variant="outline" size="sm">
                  Clear Completed
                </Button>
              )}
            </div>
          </div>

          {/* Upload Progress Summary */}
          {uploadingPhotos > 0 && (
            <div className="bg-blue-950/20 border border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  Uploading {uploadingPhotos} photos... Please don't close this page.
                </span>
              </div>
            </div>
          )}

          {/* Photo List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedPhotos.map((photo) => (
              <div
                key={photo.id}
                className="flex items-center gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(photo.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white truncate">
                      {photo.file.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatFileSize(photo.file.size)}
                    </span>
                  </div>

                  {photo.status === "uploading" && (
                    <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
                      <div
                        className="bg-purple-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${photo.progress}%` }}
                      />
                    </div>
                  )}

                  {photo.error && (
                    <p className="text-xs text-red-400 mt-1">{photo.error}</p>
                  )}

                  {photo.status === "completed" && photo.mediaUrl && (
                    <a
                      href={photo.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 mt-1 block"
                    >
                      View uploaded photo
                    </a>
                  )}
                </div>

                {photo.status === "pending" && (
                  <Button
                    onClick={() => removePhoto(photo.id)}
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 text-gray-400 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Photos - matching video upload style exactly with proper shading */}
      {photoData?.photos && photoData.photos.length > 0 && (
        <div className="bg-gray-800 dark:bg-gray-900 p-4 rounded-lg border border-gray-700">
          <h3 className="text-white font-medium mb-4">
            Existing Photos ({photoData.photos.length})
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-2 px-3 font-medium text-gray-300">Filename</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-300">Size</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-300">Upload Date</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-300">Preview</th>
                </tr>
              </thead>
              <tbody>
                {photoData.photos.map((photo: any) => (
                  <tr key={photo.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-2 px-3">
                      <span className="truncate max-w-xs block text-gray-200" title={photo.originalFilename}>
                        {photo.originalFilename}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-400">
                      {formatFileSize(photo.fileSize)}
                    </td>
                    <td className="py-2 px-3 text-gray-400">
                      {new Date(photo.uploadDate).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3">
                      <a
                        href={photo.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                      >
                        <Image className="h-3 w-3" />
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectPhotoUpload;
