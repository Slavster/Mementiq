import { useState, useEffect } from "react";
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, ExternalLink, Play, Check, Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ProjectAcceptanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: number;
    title: string;
    status: string;
    vimeoFolderId?: string;
  };
  downloadLink?: string;
}

export function ProjectAcceptanceModal({ 
  open, 
  onOpenChange, 
  project, 
  downloadLink 
}: ProjectAcceptanceModalProps) {
  const [showThankYou, setShowThankYou] = useState(false);
  const [vimeoVideoId, setVimeoVideoId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Reset state when modal closes or project changes
  React.useEffect(() => {
    if (!open) {
      setShowThankYou(false);
      setVimeoVideoId(null);
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
        console.log('Using actual project video:', data.videoId);
        setVimeoVideoId(data.videoId);
      } else {
        console.log('No video found via API, using fallback logic');
        fetchLatestVideoFromVimeo();
      }
    } catch (error) {
      console.error('Error fetching latest video:', error);
      fetchLatestVideoFromVimeo();
    }
  };

  const fetchLatestVideoFromVimeo = () => {
    // Since the actual project videos have privacy restrictions, we need to:
    // 1. Check if video allows embedding
    // 2. If not, show download option instead of embedded player
    // 3. For demo purposes, show message about video privacy
    
    if (project.id === 5) {
      // The actual videos (1107336225, 1104081202, 1106029270) are private
      // So we'll handle this with a download-only approach
      console.log('Test 2 videos are private - showing download option');
      setVimeoVideoId(null); // Don't try to embed private videos
    } else {
      console.log('No video found for project', project.id);
    }
  };

  const acceptProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${project.id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to accept project');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate projects query to refresh the dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setShowThankYou(true);
    },
  });

  const handleAcceptProject = () => {
    acceptProjectMutation.mutate();
  };

  const handleDownload = () => {
    if (downloadLink) {
      window.open(downloadLink, '_blank');
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
                <strong>Important Reminder:</strong> Please download your video within the next 30 days. 
                After this period, the download link will expire and you'll need to contact support 
                to request a new link.
              </p>
            </div>
            
            {downloadLink && (
              <Button 
                onClick={handleDownload}
                className="w-full"
                size="lg"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Your Video
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
              Your edited video is ready! Watch it below and let us know what you think.
            </p>
          </div>
          
          {/* Vimeo Video Player */}
          {vimeoVideoId && (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
              <iframe
                src={`https://player.vimeo.com/video/${vimeoVideoId}?badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0`}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={`${project.title} - Final Video`}
                onError={() => console.log('Video failed to load')}
              />
            </div>
          )}

          {/* Video Description */}
          <div className="text-center py-2">
            <p className="text-sm text-gray-400">
              Your edited video from the project folder
            </p>
          </div>
          
          {/* Additional download option alongside video player */}
          {downloadLink && (
            <div className="text-center py-4">
              <Button 
                onClick={handleDownload}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Download High Quality Version
              </Button>
              <p className="text-xs text-gray-400 mt-2">
                Download the full resolution video file
              </p>
            </div>
          )}

          {/* Show message for private videos that can't be embedded */}
          {!vimeoVideoId && (
            <div className="text-center space-y-4 py-8 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/20">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Your Finished Video is Ready!
              </h3>
              <p className="text-gray-300 max-w-md mx-auto">
                Your edited video has been completed and is available for download. Due to privacy settings, the video cannot be previewed here but you can download the full quality version.
              </p>
              {downloadLink && (
                <Button 
                  onClick={handleDownload}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download Your Video
                </Button>
              )}
            </div>
          )}

          {/* Fallback if no video or download link */}
          {!vimeoVideoId && !downloadLink && (
            <div className="text-center space-y-3 py-8">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="h-8 w-8 text-white" />
              </div>
              <Button 
                onClick={handleDownload}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                size="lg"
              >
                <Download className="mr-2 h-4 w-4" />
                Download & Watch Video
              </Button>
              <p className="text-xs text-gray-400">
                Click to download and watch your finished video
              </p>
            </div>
          )}
          
          {/* Action Cards - Styled like Revision Add-on */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {/* Accept Video Card */}
            <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-700/50 rounded-xl">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                  <h3 className="text-lg font-bold text-white">
                    Accept Video
                  </h3>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  Love your video? Accept it to mark the project as complete.
                </p>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-center text-sm text-gray-300">
                    <Check className="h-4 w-4 text-green-400 mr-2" />
                    Project marked complete
                  </div>
                  <div className="flex items-center justify-center text-sm text-gray-300">
                    <Check className="h-4 w-4 text-green-400 mr-2" />
                    30-day download access
                  </div>
                </div>
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
              </CardContent>
            </Card>

            {/* Request Revision Card */}
            <Card className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border-2 border-orange-700/50 rounded-xl">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Plus className="h-6 w-6 text-orange-400" />
                  <h3 className="text-lg font-bold text-white">
                    Request Revision
                  </h3>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  Need changes? Request revisions with detailed feedback.
                </p>
                <div className="text-2xl font-bold text-orange-400 mb-1">$5</div>
                <p className="text-xs text-gray-400 mb-4">per revision request</p>
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
                <Button 
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3"
                  onClick={() => {
                    window.location.href = '/subscribe#revision-addon';
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Request Paid Revision
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 text-center">
            <p className="text-xs text-blue-300">
              <strong>Important:</strong> Once you accept the video, the project will be marked as complete. 
              Future revisions may require additional charges as shown above.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}