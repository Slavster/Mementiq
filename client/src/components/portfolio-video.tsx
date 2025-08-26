import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface PortfolioVideoProps {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  preview: string;
  alt: string;
  category: string;
  isPlaying: boolean;
  isMuted: boolean;
  onPlayToggle: () => void;
  onMuteToggle: () => void;
  onProgress: (progress: number) => void;
  progress?: number;
}

export default function PortfolioVideo({
  id,
  title,
  description,
  thumbnail,
  preview,
  alt,
  category,
  isPlaying,
  isMuted,
  onPlayToggle,
  onMuteToggle,
  onProgress,
  progress = 0
}: PortfolioVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [posterLoaded, setPosterLoaded] = useState(false);

  // Preload thumbnail image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setPosterLoaded(true);
    img.src = thumbnail;
  }, [thumbnail]);

  // Handle play/pause state changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.muted = isMuted;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error(`Error playing video ${title}:`, error);
        });
      }
    } else {
      video.pause();
    }
  }, [isPlaying, isMuted, title]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.duration) {
      const progress = (video.currentTime / video.duration) * 100;
      onProgress(progress);
    }
  };

  const handleLoadedMetadata = () => {
    setIsLoading(false);
  };

  const handleEnded = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      onPlayToggle();
    }
  };

  return (
    <div 
      className="flex-shrink-0 w-[400px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-xl shadow-xl group">
        <div
          className="relative cursor-pointer h-[300px] flex items-center justify-center bg-gray-900"
          onClick={onPlayToggle}
        >
          {/* Show thumbnail when not playing */}
          {!isPlaying && posterLoaded && (
            <img 
              src={thumbnail}
              alt={alt}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          )}

          {/* Video element - only load when clicked */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${!isPlaying ? 'invisible' : ''}`}
            muted={isMuted}
            playsInline
            preload="none"
            poster={thumbnail}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
          >
            <source src={preview} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Loading spinner */}
          {isLoading && isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" />
            </div>
          )}

          {/* Overlay controls */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isHovered || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            
            <Button
              size="lg"
              className="relative z-10 rounded-full bg-white/90 hover:bg-white text-black p-4 shadow-lg backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                onPlayToggle();
              }}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-1" />
              )}
            </Button>

            {/* Mute button */}
            {isPlaying && (
              <Button
                size="sm"
                className="absolute bottom-4 right-4 z-10 rounded-full bg-white/90 hover:bg-white text-black p-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onMuteToggle();
                }}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Progress bar */}
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
              <div
                className="h-full bg-accent transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <div className="p-4 bg-dark-card border border-gray-700">
          <span className="text-sm text-accent font-semibold">{category}</span>
          <h3 className="text-lg font-bold text-white mt-2 mb-1">{title}</h3>
          <p className="text-sm text-gray-300 line-clamp-2">{description}</p>
        </div>
      </div>
    </div>
  );
}