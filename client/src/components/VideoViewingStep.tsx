import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Check, RotateCcw, Play, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FrameVideo } from './FrameVideo';

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



export function VideoViewingStep({ project, onBack, onVideoAccepted, onRevisionRequested }: VideoViewingStepProps) {
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
        const videos = files.filter((file: any) => 
          file.fileType && file.fileType.startsWith('video/')
        );
        setVideoFiles(videos);
        

      } catch (error) {
        console.error('Failed to fetch video files:', error);
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
        method: 'POST',
      });
      
      toast({
        title: "Video Accepted!",
        description: "The video has been marked as complete and accepted.",
      });
      
      onVideoAccepted();
    } catch (error) {
      console.error('Failed to accept video:', error);
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
        method: 'POST',
      });
      
      toast({
        title: "Revision Requested",
        description: "The editor has been notified about your revision request.",
      });
      
      onRevisionRequested();
    } catch (error) {
      console.error('Failed to request revision:', error);
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
      const data = await apiRequest(`/api/projects/${project.id}/download/${videoFile.mediaAssetId}`);
      
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        toast({
          title: "Download Started",
          description: "Your video download has started.",
        });
      } else {
        throw new Error('Failed to generate download link');
      }
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: "Could not download the video. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        <h3 className="text-xl font-semibold text-white mb-2">No Video Files Found</h3>
        <p className="text-gray-400 mb-6">The video might still be processing or there was an issue loading it.</p>
      </div>
    );
  }

  const primaryVideo = videoFiles[0]; // Use the first video as primary

  return (
    <div className="space-y-6">
      {/* Video Player Section */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-cyan-500 flex items-center gap-2">
            <Play className="h-5 w-5" />
            Your Completed Video
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Frame.io V4 Notice and Viewer */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700" style={{ aspectRatio: '16/9' }}>
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="text-center space-y-4">
                <Play className="w-16 h-16 text-cyan-500 mx-auto opacity-70" />
                <h3 className="text-xl font-semibold text-white">
                  Video Ready for Review
                </h3>
                <p className="text-gray-400 max-w-md">
                  Your video "{primaryVideo.filename}" has been delivered and is ready for viewing.
                </p>
                <p className="text-sm text-gray-500">
                  Frame.io V4 requires using their web interface for video playback.
                </p>
                <Button
                  onClick={() => {
                    // Use the stored view URL from database, or construct one from project data
                    let viewUrl = primaryVideo.mediaAssetUrl;
                    
                    // If no stored URL or it's a legacy URL, construct a proper Frame.io V4 URL
                    if (!viewUrl || viewUrl.includes('frame.io/assets/') || viewUrl.includes('frame.io/files/')) {
                      // Use the project's mediaFolderId which now stores the Frame.io project ID
                      viewUrl = `https://next.frame.io/project/${project.mediaFolderId}/view/${primaryVideo.mediaAssetId}`;
                    }
                    
                    console.log('Opening Frame.io URL:', viewUrl);
                    window.open(viewUrl, '_blank');
                  }}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-6 py-3"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Watch Video in Frame.io
                </Button>
                <p className="text-xs text-gray-600 mt-2">
                  Opens in a new tab with full playback controls
                </p>
              </div>
            </div>
          </div>

          {/* Video Details */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            <span>📁 {primaryVideo.filename}</span>
            <span>📏 {formatFileSize(primaryVideo.fileSize)}</span>
            <span>🎬 {primaryVideo.fileType}</span>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Download Button */}
        <Button
          variant="outline"
          className="border-gray-600 hover:border-cyan-500 h-12"
          onClick={() => handleDownload(primaryVideo)}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Video
        </Button>

        {/* Accept Button */}
        <Button
          className="bg-green-600 hover:bg-green-700 h-12"
          onClick={handleAcceptVideo}
          disabled={isAccepting}
        >
          {isAccepting ? (
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          {isAccepting ? 'Accepting...' : 'Accept Video'}
        </Button>

        {/* Request Revision Button */}
        <Button
          variant="outline"
          className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white h-12"
          onClick={handleRequestRevision}
          disabled={isRequestingRevision}
        >
          {isRequestingRevision ? (
            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
          ) : (
            <RotateCcw className="h-4 w-4 mr-2" />
          )}
          {isRequestingRevision ? 'Requesting...' : 'Request Revision'}
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
                <div key={video.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{video.filename}</p>
                    <p className="text-sm text-gray-400">{formatFileSize(video.fileSize)} • {video.fileType}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(video)}
                    className="border-gray-600 hover:border-cyan-500"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back Button */}
      <div className="text-center">
        <Button variant="ghost" onClick={onBack} className="text-gray-400 hover:text-white">
          ← Back to Project Overview
        </Button>
      </div>
    </div>
  );
}