import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Check, RotateCcw, Play, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FrameVideo } from "./FrameVideo";

interface VideoViewingStepProps {
  project: any;
  onBack: () => void;
  onVideoAccepted: () => void;
  onRevisionRequested: () => void;
}

interface VideoFile {
  id: string;
  filename: string;
  mediaAssetId: string;
  mediaAssetUrl: string;
  fileType: string;
  fileSize: number;
}

export function VideoViewingStep({
  project,
  onBack,
  onVideoAccepted,
  onRevisionRequested,
}: VideoViewingStepProps) {
  const { toast } = useToast();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);
  const [videoFiles, setVideoFiles] = React.useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch video files for this project
  React.useEffect(() => {
    const fetchVideoFiles = async () => {
      try {
        const files = await apiRequest(`/api/projects/${project.id}/files`);
        // Filter for video files only
        const videos = files.filter(
          (file: any) => file.fileType && file.fileType.startsWith("video/"),
        );
        setVideoFiles(videos);
      } catch (error) {
        console.error("Failed to fetch video files:", error);
        toast({
          title: "Error",
          description: "Could not load video files",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVideoFiles();
  }, [project.id, toast]);

  const handleAcceptVideo = async () => {
    setIsAccepting(true);
    try {
      await apiRequest(`/api/projects/${project.id}/accept`, {
        method: "POST",
      });

      toast({
        title: "Video Accepted!",
        description: "The video has been marked as complete and accepted.",
      });

      onVideoAccepted();
    } catch (error) {
      console.error("Failed to accept video:", error);
      toast({
        title: "Error",
        description: "Could not accept the video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRequestRevision = async () => {
    setIsRequestingRevision(true);
    try {
      await apiRequest(`/api/projects/${project.id}/request-revision`, {
        method: "POST",
      });

      toast({
        title: "Revision Requested",
        description:
          "The editor has been notified about your revision request.",
      });

      onRevisionRequested();
    } catch (error) {
      console.error("Failed to request revision:", error);
      toast({
        title: "Error",
        description: "Could not request revision. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingRevision(false);
    }
  };

  const handleDownload = async (videoFile: VideoFile) => {
    try {
      // Generate download link via Frame.io
      const data = await apiRequest(
        `/api/projects/${project.id}/download/${videoFile.mediaAssetId}`,
      );

      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
        toast({
          title: "Download Started",
          description: "Your video download has started.",
        });
      } else {
        throw new Error("Failed to generate download link");
      }
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: "Could not download the video. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Loading your video...</p>
      </div>
    );
  }

  if (videoFiles.length === 0) {
    return (
      <div className="text-center py-12">
        <Play className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          No Video Files Found
        </h3>
        <p className="text-gray-400 mb-6">
          The video might still be processing or there was an issue loading it.
        </p>
      </div>
    );
  }

  const primaryVideo = videoFiles[0]; // Use the first video as primary

  return (
    <div className="space-y-8">
      {/* Excitement Header */}
      <div className="text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-bold text-white">Your Video is Ready!</h1>
        <p className="text-xl text-gray-300">🎬 Get ready to see your amazing content come to life!</p>
      </div>

      {/* Main Video Card */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Video Title */}
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                "{primaryVideo.filename}"
              </h2>
              <div className="flex justify-center items-center gap-4 text-sm text-gray-400">
                <span>📁 {formatFileSize(primaryVideo.fileSize)}</span>
                <span>🎬 {primaryVideo.fileType}</span>
              </div>
            </div>

            {/* Main Action Button */}
            <Button
              onClick={async () => {
                try {
                  toast({
                    title: "Creating Share Link",
                    description: "Generating public Frame.io share...",
                  });

                  const response = await apiRequest(
                    `/api/projects/${project.id}/video-share-link`,
                  );
                  
                  if (response.shareUrl) {
                    console.log("Opening Frame.io public share:", response.shareUrl);
                    window.open(response.shareUrl, "_blank");

                    toast({
                      title: "Share Link Created!",
                      description: "Opening your video in a public Frame.io share (no login required)",
                    });
                  } else {
                    throw new Error("No share URL returned");
                  }
                } catch (error) {
                  console.error("Failed to create share link:", error);
                  
                  toast({
                    title: "Error",
                    description: "Could not create share link. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-lg px-8 py-4 h-auto"
            >
              <ExternalLink className="w-6 h-6 mr-3" />
              🎯 Open Video Link
            </Button>

            {/* Instructions */}
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-6 text-left space-y-4">
              <h3 className="text-lg font-semibold text-cyan-400 text-center">📋 Instructions</h3>
              
              <div className="space-y-3 text-gray-300">
                <p>
                  ✨ Clicking the button above will open a new tab where you can <strong>view</strong> and <strong>download</strong> your video.
                </p>
                
                <p>
                  ⏰ <strong>Important:</strong> This link will only be available for <strong>30 days</strong>, so make sure to download your video before then!
                </p>
                
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-white">🎨 Need Changes? Frame.io Makes It Easy!</p>
                  <p>
                    The link allows detailed frame-by-frame edits and comments. You can click, highlight, and annotate directly on the screen. 
                    Anything you need changed can be done this way - feel free to leave detailed comments, you can even include links in the comments if needed.
                  </p>
                  <a 
                    href="https://support.frame.io/en/articles/1161479-review-links-explained-for-clients"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-cyan-400 hover:text-cyan-300 underline"
                  >
                    📖 Learn how to use Frame.io review tools
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Accept Button */}
        <Button
          className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg h-16"
          onClick={handleAcceptVideo}
          disabled={isAccepting}
        >
          {isAccepting ? (
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
          ) : (
            <Check className="h-6 w-6 mr-3" />
          )}
          ✅ {isAccepting ? "Accepting Video..." : "Accept Video"}
        </Button>

        {/* Request Revision Button */}
        <Button
          variant="outline"
          className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white font-bold text-lg h-16"
          onClick={handleRequestRevision}
          disabled={isRequestingRevision}
        >
          {isRequestingRevision ? (
            <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-3"></div>
          ) : (
            <RotateCcw className="h-6 w-6 mr-3" />
          )}
          🔄 {isRequestingRevision ? "Requesting Revision..." : "Request Revision ($5)"}
        </Button>
      </div>

      {/* Additional Video Files (if any) */}
      {videoFiles.length > 1 && (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Additional Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {videoFiles.slice(1).map((video, index) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium">{video.filename}</p>
                    <p className="text-sm text-gray-400">
                      {formatFileSize(video.fileSize)} • {video.fileType}
                    </p>
                  </div>
                  <div className="text-sm text-gray-400">
                    Available via Frame.io link above
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back Button */}
      <div className="text-center">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-gray-400 hover:text-white"
        >
          ← Back to Project Overview
        </Button>
      </div>
    </div>
  );
}
