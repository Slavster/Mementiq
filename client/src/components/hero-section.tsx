import { Button } from "@/components/ui/button";
import { Play, ArrowRight, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useRef } from "react";

// Helper function to get hero video URL from R2
const getHeroVideoUrl = () => {
  if (import.meta.env.VITE_MEDIA_BASE_URL) {
    return `${import.meta.env.VITE_MEDIA_BASE_URL}/VSL_Low.mp4`;
  }
  // Fallback - this shouldn't be used since we always want R2
  return "";
};

export default function HeroSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [, setLocation] = useLocation();
  
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const toggleVideoPlay = async () => {
    if (videoRef.current) {
      try {
        if (isPlaying) {
          videoRef.current.pause();
        } else {
          await videoRef.current.play();
        }
      } catch (error) {
        console.error('Video play failed:', error);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const restartVideo = async () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      try {
        await videoRef.current.play();
      } catch (error) {
        console.error('Video restart failed:', error);
      }
    }
  };

  return (
    <section className="bg-gradient-to-br from-secondary via-purple-900 to-primary text-white pt-20 pb-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Title - centered on all screens */}
        <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-8 text-center">
          Bring Your Stories to <span className="text-accent">Life</span>
        </h1>
        
        {/* Content area - mobile: stacked, desktop: split left/right */}
        <div className="grid grid-cols-1 md:!grid-cols-2 gap-8 md:gap-12 items-start">
          {/* Left half - content */}
          <div className="min-w-0 md:pr-12 flex flex-col justify-start">
            <p className="text-2xl text-[#ffffff] font-semibold mb-6 leading-relaxed">
              Professional quality, transparently priced, and{" "}
              <span className="text-accent font-bold">
                hassle-free video editing <br />
              </span>{" "}
              All at the touch of a button.
            </p>
            <p className="text-2xl mb-8 text-left text-[#ffffff] font-semibold">
              For You. For All. Forever.
            </p>
            <div className="flex flex-col gap-4 items-start">
              <Button
                onClick={() => setLocation('/auth')}
                className="bg-accent text-secondary px-8 py-4 text-lg font-semibold hover:bg-yellow-500 transition-all duration-200 h-auto transform hover:scale-105 w-auto"
              >
                Start Creating
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={() => scrollToSection("portfolio")}
                variant="outline"
                className="border-2 border-accent text-accent px-8 py-4 text-lg font-semibold hover:bg-accent hover:text-secondary transition-colors duration-200 h-auto w-auto"
              >
                View Portfolio
              </Button>
            </div>
          </div>
          
          {/* Right half - video */}
          <div className="min-w-0 flex items-center justify-center">
            <div className="relative rounded-xl overflow-hidden shadow-xl border border-purple-500/30 w-full max-w-none md:max-w-[224px] group">
              <video
                ref={videoRef}
                src={getHeroVideoUrl()}
                className="w-full h-auto aspect-[9/16]"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                crossOrigin="anonymous"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedData={() => {
                  // Try to play when data is loaded and disable text tracks
                  if (videoRef.current) {
                    // Disable any text tracks (captions/subtitles)
                    const tracks = videoRef.current.textTracks;
                    for (let i = 0; i < tracks.length; i++) {
                      tracks[i].mode = 'disabled';
                    }
                    videoRef.current.play().catch(console.error);
                  }
                }}
                data-testid="hero-video"
                disablePictureInPicture
                controls={false}
              >
                {/* Explicitly disable any potential captions */}
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                {!isPlaying && (
                  <div className="flex items-center justify-center h-full">
                    <Button
                      size="sm"
                      onClick={toggleVideoPlay}
                      className="bg-accent/90 backdrop-blur-sm rounded-full p-4 hover:bg-accent transition-all duration-200 transform hover:scale-110 border border-yellow-400/30"
                      data-testid="button-play-hero-video"
                    >
                      <Play className="h-6 w-6 text-secondary ml-1" />
                    </Button>
                  </div>
                )}
                {isPlaying && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button
                      size="sm"
                      onClick={toggleMute}
                      className="bg-black/50 backdrop-blur-sm rounded-full p-2 hover:bg-black/70 transition-all duration-200"
                      data-testid="button-mute-hero-video"
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4 text-white" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-white" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={restartVideo}
                      className="bg-black/50 backdrop-blur-sm rounded-full p-2 hover:bg-black/70 transition-all duration-200"
                      data-testid="button-restart-hero-video"
                    >
                      <RotateCcw className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
