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
  freeimagePId?: string;
  freeimagePUrl?: string;
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

  const uploadToFreeimage = async (uploadPhoto: UploadPhoto): Promise<void> => {
    try {
      console.log("Starting Freeimage upload for:", uploadPhoto.file.name);

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

      // Upload to Freeimage.host via our backend
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
                freeimagePId: result.photo.freeimagePId,
                freeimagePUrl: result.photo.freeimagePUrl,
                thumbnailUrl: result.photo.thumbnailUrl,
              }
            : p,
        ),
      );

      console.log("Photo upload completed:", result);
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
      await uploadToFreeimage(photo);
    }

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
    queryClient.invalidateQueries({
      queryKey: ["projects", projectId, "photos"],
    });
    // Also invalidate the main projects list to refresh status on dashboard
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });

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

        if (file.size > 50 * 1024 * 1024) {
          // 50MB limit
          toast({
            variant: "destructive",
            title: "File Too Large",
            description: `${file.name} is larger than 50MB. Please choose a smaller image.`,
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

  // Calculate current album usage
  const currentAlbumSize = photoData?.album?.currentSize || 0;
  const albumSizeLimit =
    photoData?.album?.totalSizeLimit || 10 * 1024 * 1024 * 1024; // 10GB
  const albumUsagePercent = (currentAlbumSize / albumSizeLimit) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Photo Upload (Optional)
        </CardTitle>
        <CardDescription>
          Upload any photos you want included in your video, up to 10GB in
          total.
        </CardDescription>

        {/* Album Storage Usage */}
        {photoData?.album && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Album Storage: {photoData.photoCount} photos</span>
              <span>
                {formatFileSize(currentAlbumSize)} /{" "}
                {formatFileSize(albumSizeLimit)}
              </span>
            </div>
            <Progress value={albumUsagePercent} className="h-2" />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drag and Drop Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragOver
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center space-y-2">
            <Upload className="h-8 w-8 text-gray-400" />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Click to upload</span> or drag and
              drop photos here
            </div>
            <div className="text-xs text-gray-500">
              JPEG, PNG, GIF, WebP up to 50MB each
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
              <h4 className="font-medium">
                Upload Queue ({totalPhotos} photos)
              </h4>
              <div className="flex gap-2">
                {selectedPhotos.some((p) => p.status === "pending") && (
                  <Button onClick={startPhotoUpload} size="sm">
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
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Uploading {uploadingPhotos} photos... Please don't close this
                  page.
                </AlertDescription>
              </Alert>
            )}

            {/* Photo List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {getStatusIcon(photo.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        {photo.file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(photo.file.size)}
                      </span>
                    </div>

                    {photo.status === "uploading" && (
                      <Progress value={photo.progress} className="h-1 mt-1" />
                    )}

                    {photo.error && (
                      <p className="text-xs text-red-500 mt-1">{photo.error}</p>
                    )}

                    {photo.status === "completed" && photo.freeimagePUrl && (
                      <a
                        href={photo.freeimagePUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-1 block"
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
                      className="flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Photos Display */}
        {photoData?.photos && photoData.photos.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">
              Album Photos ({photoData.photos.length} photos)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photoData.photos.map((photo: any, index: number) => (
                <div key={photo.id} className="space-y-2">
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    <img
                      src={photo.thumbnailUrl || photo.freeimagePUrl}
                      alt={photo.originalFilename}
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => window.open(photo.freeimagePUrl, "_blank")}
                    />
                  </div>
                  <div className="text-xs text-center">
                    <p className="truncate font-medium">
                      {photo.originalFilename}
                    </p>
                    <p className="text-gray-500">
                      {formatFileSize(photo.fileSize)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DirectPhotoUpload;
