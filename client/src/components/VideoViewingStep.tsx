import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Check, RotateCcw, Play, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import Hls from 'hls.js';

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

interface MediaLinks {
  hls?: string;
  mp4?: string;
  proxy?: string;
}

export function VideoViewingStep({ project, onBack, onVideoAccepted, onRevisionRequested }: VideoViewingStepProps) {
  const { toast } = useToast();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);
  const [videoFiles, setVideoFiles] = React.useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaLinks, setMediaLinks] = useState<MediaLinks | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

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
        
        // Auto-load video streaming URLs for the first video
        if (videos.length > 0) {
          loadVideoStream(videos[0].mediaAssetId);
        }
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

  // Step 3: React hook to fetch stream URL with Frame.io V4 support
  const loadVideoStream = async (assetId: string) => {
    setLoadingVideo(true);
    try {
      // Use new streaming endpoint
      const result = await apiRequest(`/api/files/${assetId}/stream`);
      console.log('Received streaming result:', result);
      
      // Handle successful streaming URL
      if (result && result.url) {
        console.log('Direct streaming available:', result);
        setMediaLinks(result);
        
        // Setup video player with the streaming URL
        if (videoRef.current) {
          setupVideoPlayer(result);
        }
      } 
      // Handle Frame.io V4 limitation (no direct streaming)
      else if (result && result.available === false) {
        console.log('Frame.io V4 streaming limitation:', result.reason);
        setMediaLinks(null);
        
        toast({
          title: "Direct Streaming Not Available",
          description: "Frame.io V4 requires web interface for video playback",
          variant: "default",
        });
      }
      // Handle other cases
      else {
        console.log('No streaming URL available:', result);
        setMediaLinks(null);
        
        toast({
          title: "Streaming Not Available",
          description: "Video transcoding may be in progress. Try Frame.io web interface.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Failed to load video stream:', error);
      
      // If link expired (common with Frame.io), try to refresh
      if (error.message?.includes('403') || error.message?.includes('expired')) {
        console.log('Media link may have expired, retrying...');
        setTimeout(() => loadVideoStream(assetId), 2000);
        return;
      }
      
      toast({
        title: "Video Loading Error",
        description: "Could not load video stream. You can still view it in Frame.io.",
        variant: "destructive",
      });
      setMediaLinks(null);
    } finally {
      setLoadingVideo(false);
    }
  };

  // Step 4 & 5: React player that handles HLS, MP4, and MOV
  const setupVideoPlayer = (mediaLink: any) => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    console.log(`Setting up video player for ${mediaLink.kind}: ${mediaLink.url}`);

    // Handle HLS streaming (.m3u8)
    if (mediaLink.kind === 'hls' && Hls.isSupported()) {
      console.log('Setting up HLS player');
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600
      });
      
      hls.loadSource(mediaLink.url);
      hls.attachMedia(video);
      hlsRef.current = hls;
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed successfully');
        video.play().catch(console.error);
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error, destroying HLS instance');
              hls.destroy();
              break;
          }
        }
      });
    }
    // Handle native MP4/MOV playback (including .mov files)
    else if (mediaLink.kind === 'mp4' || mediaLink.kind === 'mov' || mediaLink.url) {
      console.log(`Setting up native video player for ${mediaLink.kind}`);
      video.src = mediaLink.url;
      
      // Set up error handling for direct video playback
      video.onerror = (e) => {
        console.error('Video playback error:', e);
        toast({
          title: "Playback Error",
          description: "Video format may not be supported. Try Frame.io web interface.",
          variant: "destructive",
        });
      };
      
      // Auto-play when ready
      video.oncanplay = () => {
        console.log('Video can start playing');
        video.play().catch(console.error);
      };
    }
    else {
      console.log('No compatible video format available');
      toast({
        title: "Unsupported Format",
        description: "Video format not supported for direct playback.",
        variant: "destructive",
      });
    }
  };

  // Cleanup HLS on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

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
          {/* Direct Video Player */}
          <div className="relative bg-black rounded-lg overflow-hidden border border-gray-700" style={{ aspectRatio: '16/9' }}>
            {loadingVideo ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-400">Loading video...</p>
                </div>
              </div>
            ) : mediaLinks ? (
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                controls
                preload="metadata"
                poster="" // You can add a thumbnail URL here if available
              >
                Your browser does not support video playback.
              </video>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  {/* Video Icon */}
                  <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto">
                    <Play className="w-10 h-10 text-cyan-500" />
                  </div>
                  
                  {/* Video Info */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">{primaryVideo.filename}</h3>
                    <p className="text-gray-400">{formatFileSize(primaryVideo.fileSize)} • {primaryVideo.fileType}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-yellow-400 text-sm font-medium">Direct streaming not available</p>
                      <p className="text-gray-400 text-xs">Frame.io V4 requires web interface for video playback</p>
                    </div>
                    
                    {/* View Button - Enhanced with better URL handling */}
                    <Button
                      onClick={() => {
                        const viewUrl = primaryVideo.mediaAssetUrl || `https://next.frame.io/project/${project.mediaFolderId}/view/${primaryVideo.mediaAssetId}`;
                        window.open(viewUrl, '_blank');
                      }}
                      className="bg-cyan-600 hover:bg-cyan-700"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View & Review in Frame.io
                    </Button>
                    
                    <p className="text-gray-500 text-xs">
                      Use Frame.io's interface to watch, comment, and request revisions
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Frame.io Branding */}
            <div className="absolute top-4 left-4">
              <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1 text-xs text-gray-300">
                {loadingVideo ? 'Loading...' : mediaLinks ? 'Direct Video Playback' : 'Frame.io V4 - Web Interface Required'}
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