import { useState, useEffect } from "react";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  Download,
  ExternalLink,
  Play,
  Check,
  Plus,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProjectAcceptanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: number;
    title: string;
    status: string;
    mediaFolderId?: string;
  };
  downloadLink?: string;
}

export function ProjectAcceptanceModal({
  open,
  onOpenChange,
  project,
  downloadLink,
}: ProjectAcceptanceModalProps) {
  const { toast } = useToast();
  const [showThankYou, setShowThankYou] = useState(false);
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Revision payment mutation
  const revisionPaymentMutation = useMutation({
    mutationFn: async (projectId: number) => {
      console.log("Sending revision payment request for project:", projectId);
      const response = await apiRequest(
        "POST",
        "/api/stripe/create-revision-session",
        {
          projectId,
        },
      );
      console.log("Revision payment response:", response);
      
      // Parse response if it's not already parsed
      let data = response;
      if (typeof response === 'string') {
        try {
          data = JSON.parse(response);
        } catch (e) {
          console.error("Failed to parse response:", e);
          throw new Error("Invalid response format");
        }
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log("Revision payment mutation success:", data);
      if (data.success && data.sessionUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.sessionUrl;
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to create checkout session",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Error creating revision payment session:", error);
      
      // Show user-friendly error message
      let errorMessage = "Failed to create revision payment session";
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Revision Request Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Reset state when modal closes or project changes
  React.useEffect(() => {
    if (!open) {
      setShowThankYou(false);
      setMediaAssetId(null);
    }
  }, [open, project.id]);

  // Fetch the latest video from the project folder when modal opens
  useEffect(() => {
    if (open) {
      fetchLatestVideo();
    }
  }, [open, project.id]);

  const fetchLatestVideo = async () => {
    try {
      const data = await apiRequest(`/api/projects/${project.id}/latest-video`);
      if (data?.success && data?.videoId) {
        console.log("Using actual project video:", data.videoId);
        setMediaAssetId(data.videoId);
      } else {
        console.log("No video found via API, using fallback logic");
        fetchLatestVideoFromMediaPlatform();
      }
    } catch (error) {
      console.error("Error fetching latest video:", error);
      fetchLatestVideoFromMediaPlatform();
    }
  };

  const fetchLatestVideoFromMediaPlatform = () => {
    if (project.id === 5) {
      // Now that we have the correct video info, try embedding with the hash
      console.log(
        "Test 2 - attempting to embed video with correct URL including hash",
      );
      setMediaAssetId("1107336225?h=46fe797c9e"); // Use video ID with hash from API
    } else {
      console.log("No video found for project", project.id);
      setMediaAssetId(null);
    }
  };

  const acceptProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/projects/${project.id}/accept`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      // Invalidate projects query to refresh the dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowThankYou(true);
    },
  });

  const handleAcceptProject = () => {
    acceptProjectMutation.mutate();
  };

  const handleDownload = async () => {
    try {
      // Get the share link (same as previous screen functionality)
      const data = await apiRequest(`/api/projects/${project.id}/share-link`);

      if (data?.success && data?.shareLink) {
        // Open Frame.io share link in new tab (consistent with previous screen)
        window.open(data.shareLink, "_blank");
        console.log("Opened Frame.io share link:", data.shareLink);
      } else {
        throw new Error("No share link available");
      }
    } catch (error) {
      console.error("Error opening share link:", error);
      toast({
        title: "Video unavailable",
        description: "Could not access the final video. Contact support for assistance.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setShowThankYou(false);
    onOpenChange(false);
  };

  if (showThankYou) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Project Accepted!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Thank you for accepting your video project "{project.title}".
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Important Reminder:</strong> Please download your video
                within the next 30 days. After this period, the download link
                will expire and you'll need to contact support to request a new
                link.
              </p>
            </div>

            {downloadLink && (
              <Button 
                onClick={handleDownload} 
                className="w-full bg-neon-green hover:bg-neon-green-dark text-white" 
                size="lg"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Download Final Video
              </Button>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-gradient-to-br from-secondary via-purple-900 to-primary">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-bold">
            Review Your Finished Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              Project: {project.title}
            </h3>
            <p className="text-gray-300 text-sm">
              Your professionally edited video is ready! 😎 Watch it below and
              let us know whatyou think.
            </p>
          </div>

          {/* Single Video Section - Show embedded player with download option below */}
          {mediaAssetId ? (
            <div className="space-y-4">
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                <iframe
                  src={`https://app.frame.io/presentations/${mediaAssetId.includes("?") ? mediaAssetId + "&" : mediaAssetId + "?"}badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0&color=7c3aed`}
                  className="absolute inset-0 w-full h-full"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  title={`${project.title} - Final Video`}
                />
              </div>
              <div className="text-center space-y-2">
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download High Quality Version
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 py-8 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/20">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Your Finished Video is Ready!
              </h3>
              <p className="text-gray-300 max-w-md mx-auto">
                Your edited video has been completed and is available for
                download. Due to privacy settings, the video cannot be previewed
                here but you can download the full quality version.
              </p>
              <Button
                onClick={handleDownload}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Download className="mr-2 h-5 w-5" />
                Download & Watch Video
              </Button>
            </div>
          )}

          {/* Action Cards - Styled like Revision Add-on */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {/* Accept Video Card */}
            <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-700/50 rounded-xl flex flex-col">
              <CardContent className="p-6 text-center flex-1 flex flex-col">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                  <h3 className="text-lg font-bold text-white">Accept Video</h3>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  Love your video? Accept it to mark the project as complete.
                </p>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-center text-sm text-gray-300">
                    <Check className="h-4 w-4 text-green-400 mr-2" />
                    30-day download access
                  </div>
                </div>
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 mb-4">
                  <p className="text-xs text-amber-200 leading-relaxed">
                    Once accepted, the project is archived, and no further
                    changes can be made. Any revisions after this will require a
                    new project - using a full video credit.
                  </p>
                </div>
                <div className="mt-auto">
                  <Button
                    onClick={handleAcceptProject}
                    disabled={acceptProjectMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                  >
                    {acceptProjectMutation.isPending ? (
                      "Accepting..."
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Accept Final Video
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Request Revision Card - Only show for eligible statuses */}
            {["video is ready", "delivered", "complete"].includes(project.status.toLowerCase()) && (
              <Card className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border-2 border-orange-700/50 rounded-xl flex flex-col">
                <CardContent className="p-6 text-center flex-1 flex flex-col">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Plus className="h-6 w-6 text-orange-400" />
                    <h3 className="text-lg font-bold text-white">
                      Request Revision
                    </h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-4">
                    Need changes? Request revisions with detailed feedback.
                  </p>
                  <div className="text-2xl font-bold text-orange-400 mb-1">
                    $5
                  </div>
                  <p className="text-xs text-gray-400 mb-4">
                    per revision request
                  </p>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-center text-sm text-gray-300">
                      <Check className="h-4 w-4 text-orange-400 mr-2" />
                      Minor tweaks & adjustments
                    </div>
                    <div className="flex items-center justify-center text-sm text-gray-300">
                      <Check className="h-4 w-4 text-orange-400 mr-2" />
                      48-hour turnaround
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Button
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3"
                      onClick={() => revisionPaymentMutation.mutate(project.id)}
                      disabled={revisionPaymentMutation.isPending}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {revisionPaymentMutation.isPending
                        ? "Processing..."
                        : "Request Paid Revision"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
