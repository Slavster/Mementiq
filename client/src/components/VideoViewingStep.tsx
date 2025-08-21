import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Check, RotateCcw, Play, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FrameVideo } from "./FrameVideo";
import Confetti from "react-confetti";
import { RevisionPaymentPopup } from "./RevisionPaymentPopup";

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
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [videoFiles, setVideoFiles] = React.useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? Math.max(window.innerHeight, document.documentElement.scrollHeight) : 0,
  });

  // Update window dimensions for confetti
  useEffect(() => {
    function handleResize() {
      setWindowDimensions({
        width: window.innerWidth,
        height: Math.max(window.innerHeight, document.documentElement.scrollHeight, document.body.scrollHeight),
      });
    }

    if (typeof window !== "undefined") {
      handleResize(); // Set initial dimensions
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleResize); // Update on scroll changes
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleResize);
      };
    }
  }, []);

  // Fetch video files for this project
  React.useEffect(() => {
    let mounted = true;
    
    const fetchVideoFiles = async () => {
      try {
        const files = await apiRequest(`/api/projects/${project.id}/files`);
        
        if (!mounted) return; // Prevent state update if component unmounted
        
        // Filter for video files only
        const videos = files.filter(
          (file: any) => file.fileType && file.fileType.startsWith("video/"),
        );
        setVideoFiles(videos);
      } catch (error) {
        if (!mounted) return; // Prevent state update if component unmounted
        
        console.error("Failed to fetch video files:", error);
        toast({
          title: "Error",
          description: "Could not load video files",
          variant: "destructive",
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchVideoFiles();
    
    return () => {
      mounted = false; // Cleanup function to prevent memory leaks
    };
  }, [project.id, toast]);

  const handleAcceptVideo = async () => {
    setIsAccepting(true);
    try {
      await apiRequest(`/api/projects/${project.id}/accept`, {
        method: "POST",
      });

      // Show confetti animation
      setShowConfetti(true);

      toast({
        title: "Video Accepted!",
        description: "The video has been marked as complete and accepted.",
      });

      // Wait for confetti animation before redirecting
      setTimeout(() => {
        setShowConfetti(false);
        onVideoAccepted();
      }, 6000); // 6 seconds of confetti
    } catch (error) {
      console.error("Failed to accept video:", error);
      toast({
        title: "Error",
        description: "Could not accept the video. Please try again.",
        variant: "destructive",
      });
      setIsAccepting(false);
    }
  };

  const handleRequestRevision = () => {
    // Show the payment popup
    setShowPaymentPopup(true);
  };

  const handlePaymentComplete = async () => {
    // Payment successful, close popup and return to revision workflow
    setShowPaymentPopup(false);
    
    toast({
      title: "Payment Successful - Ready for Revision",
      description: "You can now upload additional footage and submit for revision.",
    });
    
    // Trigger revision workflow - this will take user back to project management
    // but flag it as a revision request so Tally form gets skipped
    onRevisionRequested();
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
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-50">
          <Confetti
            width={windowDimensions.width}
            height={windowDimensions.height}
            recycle={false}
            numberOfPieces={400}
            gravity={0.2}
            initialVelocityY={15}
            initialVelocityX={5}
            colors={['#10b981', '#22c55e', '#34d399', '#fbbf24', '#f59e0b', '#f97316', '#ec4899', '#a855f7']}
          />
        </div>
      )}
      {/* Excitement Header */}
      <div className="text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-bold text-white">Your Video is Ready!</h1>
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
                  const response = await apiRequest(
                    `/api/projects/${project.id}/video-share-link`,
                  );

                  if (response.shareUrl) {
                    console.log(
                      "Opening Frame.io public share:",
                      response.shareUrl,
                    );
                    window.open(response.shareUrl, "_blank");
                  } else {
                    throw new Error("No share URL returned");
                  }
                } catch (error) {
                  console.error("Failed to create share link:", error);

                  toast({
                    title: "Error",
                    description:
                      "Could not create share link. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-lg px-8 py-4 h-auto"
            >
              <ExternalLink className="w-6 h-6 mr-3" />
              Open Video Link
            </Button>

            {/* Instructions - only show when payment popup is NOT visible */}
            {!showPaymentPopup && (
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-6 text-left space-y-4">
                <div className="space-y-3 text-gray-300">
                  <p>
                    ✨ Clicking the button above will open a new tab where you can{" "}
                    <strong>view</strong> and <strong>download</strong> your
                    video.
                  </p>

                  <p>
                    ⏰ <strong>Important:</strong> This link will only be
                    available for <strong>30 days</strong>, so make sure to
                    download your video before then!
                  </p>

                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                    <p className="font-semibold text-white">
                      🎨 Need Changes? We Makes It Easy!
                    </p>
                    <p>
                      Comment right on the video! Frame-accurate notes,
                      highlights, and annotations. Add links if helpful.
                    </p>
                    <a
                      href="https://support.frame.io/en/articles/1161479-review-links-explained-for-clients"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-cyan-400 hover:text-cyan-300 underline"
                    >
                      📖 Quick primer on Frame.io review tool
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps Section - only show when payment popup is NOT visible */}
      {!showPaymentPopup && (
        <>
          <Card className="bg-gray-800/50 border-gray-600">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4 text-center">
                🚀 Next Steps
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Accept Option */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="h-5 w-5" />
                    <span className="font-semibold">Option 1: Accept Video</span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Love your video? Click accept to mark the project as finished.
                    <strong className="block mt-1">
                      No changes can be made after this point.
                    </strong>
                  </p>
                </div>

                {/* Revision Option */}
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-orange-400">
                    <RotateCcw className="h-5 w-5" />
                    <span className="font-semibold">
                      Option 2: Paid Revision Request
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Need changes? The editor will review all your comments and
                    highlights and make updates. You'll be able to upload new
                    footage too, if needed. <strong> Each round costs $5.</strong>
                  </p>
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
              {isAccepting ? "Accepting Video..." : "Accept Video"}
            </Button>

            {/* Request Revision Button */}
            <Button
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white font-bold text-lg h-16"
              onClick={handleRequestRevision}
            >
              <RotateCcw className="h-6 w-6 mr-3" />
              Request Revisions ($5)
            </Button>
          </div>
        </>
      )}

      {/* Additional Video Files (if any) */}
      {videoFiles.length > 1 && (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              Additional Files
            </CardTitle>
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
          ← Back to Dashboard
        </Button>
      </div>

      {/* Payment Popup */}
      {showPaymentPopup && (
        <RevisionPaymentPopup
          project={project}
          onPaymentComplete={handlePaymentComplete}
          onCancel={() => setShowPaymentPopup(false)}
        />
      )}
    </div>
  );
}
