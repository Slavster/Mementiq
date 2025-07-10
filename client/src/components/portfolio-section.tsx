import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";

const portfolioItems = [
  {
    id: 1,
    title: "Travel Vlog Magic",
    description:
      "Turn your vacation footage into cinematic experiences. Moving music and smooth transitions capture your special moments",
    thumbnail: "/api/assets/Thumbnails/tu_lan_cover.jpg",
    alt: "Highlighting beautiful travel destinations and moments",
    category: "Travel Reel",
    preview: "/api/assets/Videos/Travel video.mp4",
  },
  {
    id: 2,
    title: "Coaching Ad",
    description:
      "Advertise your services with dynamic cuts, animations, and eye-catching effects",
    thumbnail: "/api/assets/Thumbnails/Coaching Ad Cover.png",
    alt: "Engaging ad reel for coaching services",
    category: "Services Ad",
    preview: "/api/assets/Videos/Coaching Ad 1 - 720.mp4",
  },
  {
    id: 3,
    title: "Captivating Interviews",
    description:
      "Enhance your best interview moments with clean audio, dynamic framing, and speaker captions.",
    thumbnail: "/api/assets/Thumbnails/conference cover.png",
    alt: "Conference Interviews",
    category: "Interview",
    preview: "/api/assets/Videos/Conference Interviews.mp4",
  },
  {
    id: 4,
    title: "Event Highlights",
    description:
      "Turn any event into a vibrant highlight reel that perfectly captures emotional moments, energy, and celebration",
    thumbnail: "/api/assets/Thumbnails/Swap_in_city_cover.png",
    alt: "Fun highlight reel of a clothing swap event",
    category: "Events Highlights",
    preview: "/api/assets/Videos/Event promo video.mp4",
  },
  {
    id: 5,
    title: "Product Showcase",
    description:
      "Make your product shine with vibrant color correction, and precise scene transitions",
    thumbnail: "/api/assets/Thumbnails/Sun a wear cover.png",
    alt: "Product video ad",
    category: "Commercial",
    preview: "/api/assets/Videos/Product Ad.mp4",
  },
];

export default function PortfolioSection() {
  const [selectedVideo, setSelectedVideo] = useState<number>(0);
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);
  const [videoProgress, setVideoProgress] = useState<{ [key: number]: number }>({});
  const [sectionInView, setSectionInView] = useState<boolean>(false);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef<number>(0);
  const isNavigating = useRef<boolean>(false);
  const scrollThreshold = 200; // Responsive timing

  const handleVideoClick = (videoId: number) => {
    const video = videoRefs.current[videoId];
    if (!video) return;

    if (playingVideo === videoId) {
      // Pause current video and save progress
      video.pause();
      setVideoProgress(prev => ({
        ...prev,
        [videoId]: video.currentTime
      }));
      setPlayingVideo(null);
      console.log(`Paused video ${videoId} at ${video.currentTime}s`);
    } else {
      // Stop any currently playing video
      if (playingVideo !== null) {
        const currentVideo = videoRefs.current[playingVideo];
        if (currentVideo) {
          currentVideo.pause();
          setVideoProgress(prev => ({
            ...prev,
            [playingVideo]: currentVideo.currentTime
          }));
        }
      }

      // Start playing the new video
      setPlayingVideo(videoId);
      
      // Resume from saved progress or start from beginning
      const savedTime = videoProgress[videoId] || 0;
      video.currentTime = savedTime;
      
      // Force load and play immediately
      video.load();
      video.play().then(() => {
        console.log(`Playing video ${videoId} from ${savedTime}s`);
      }).catch(error => {
        console.error(`Error playing video ${videoId}:`, error);
      });
    }
  };

  // Update video progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (playingVideo !== null) {
        const video = videoRefs.current[playingVideo];
        if (video && !video.paused) {
          setVideoProgress(prev => ({
            ...prev,
            [playingVideo]: video.currentTime
          }));
        }
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [playingVideo]);

  const nextVideo = () => {
    if (isNavigating.current) return; // Prevent multiple rapid moves
    
    isNavigating.current = true;
    setSelectedVideo((prev) => {
      const next = (prev + 1) % portfolioItems.length;
      console.log(`Moving from video ${prev} to ${next}`);
      return next;
    });
    
    // Reset navigation lock after animation completes
    setTimeout(() => {
      isNavigating.current = false;
    }, 700); // Match transition duration
  };

  const prevVideo = () => {
    if (isNavigating.current) return; // Prevent multiple rapid moves
    
    isNavigating.current = true;
    setSelectedVideo((prev) => {
      const next = (prev - 1 + portfolioItems.length) % portfolioItems.length;
      console.log(`Moving from video ${prev} to ${next}`);
      return next;
    });
    
    // Reset navigation lock after animation completes
    setTimeout(() => {
      isNavigating.current = false;
    }, 700); // Match transition duration
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    // Block all navigation if currently moving
    if (isNavigating.current) return;

    const now = Date.now();
    if (now - lastScrollTime.current < scrollThreshold) {
      return; // Throttle rapid scroll events
    }

    // Simple threshold - no special cases
    const deltaThreshold = 60;

    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // Horizontal scroll
      if (Math.abs(e.deltaX) > deltaThreshold) {
        lastScrollTime.current = now;
        if (e.deltaX > 0) {
          nextVideo();
        } else {
          prevVideo();
        }
      }
    } else {
      // Vertical scroll converted to horizontal
      if (Math.abs(e.deltaY) > deltaThreshold) {
        lastScrollTime.current = now;
        if (e.deltaY > 0) {
          nextVideo();
        } else {
          prevVideo();
        }
      }
    }
  };

  return (
    <section id="portfolio" className="py-20 bg-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-light mb-4">
            Video Portfolio
          </h2>
          <p className="text-xl text-charcoal max-w-3xl mx-auto">
            Check out our latest video edits showcasing diverse styles and
            creative approaches for every type of content.
          </p>
        </div>

        <div
          className="relative h-[650px] flex items-center justify-center overflow-hidden"
          onWheel={handleWheel}
          ref={containerRef}
        >
          <Button
            onClick={prevVideo}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-[60] bg-dark-card/80 hover:bg-dark-card border border-gray-600 text-light p-3 rounded-full shadow-xl backdrop-blur-sm"
            size="sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Button
            onClick={nextVideo}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-[60] bg-dark-card/80 hover:bg-dark-card border border-gray-600 text-light p-3 rounded-full shadow-xl backdrop-blur-sm"
            size="sm"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div className="relative w-full max-w-5xl h-full flex items-center justify-center">
            {portfolioItems.map((item, index) => {
              const offset = index - selectedVideo;
              const isActive = index === selectedVideo;
              const isHovered = playingVideo === item.id;
              const zIndex =
                isActive || isHovered
                  ? 50
                  : portfolioItems.length - Math.abs(offset);

              return (
                <div
                  key={item.id}
                  className={`absolute transition-all duration-700 ease-out cursor-pointer ${
                    isActive ? "scale-100" : "scale-60"
                  }`}
                  style={{
                    transform: `translateX(${offset * 420}px)`,
                    zIndex,
                    opacity:
                      Math.abs(offset) > 2 ? 0 : Math.abs(offset) > 1 ? 0.7 : 1,
                  }}
                  onClick={() => handleVideoClick(item.id)}
                >
                  <div
                    className={`relative rounded-xl overflow-hidden shadow-2xl border-2 transition-all duration-300 ${
                      isActive ? "border-primary/70" : "border-gray-700/50"
                    } ${playingVideo === item.id ? "border-accent" : ""}`}
                  >
                    {/* Always render video element for preloading */}
                    <video
                      ref={(el) => (videoRefs.current[item.id] = el)}
                      className={`${
                        isActive ? "w-[420px] h-[470px]" : "w-80 h-96"
                      } object-cover ${
                        playingVideo === item.id ? "block" : "hidden"
                      } transition-all duration-700`}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      src={item.preview}
                      onLoadStart={() => console.log(`Video ${item.id} load started`)}
                      onLoadedData={() => console.log(`Video ${item.id} data loaded`)}
                      onCanPlay={() => console.log(`Video ${item.id} can play`)}
                      onError={(e) => console.log(`Video ${item.id} error:`, e)}
                      onEnded={() => {
                        // Loop video
                        const video = videoRefs.current[item.id];
                        if (video) {
                          video.currentTime = 0;
                          video.play().catch(() => {
                            // Ignore replay errors
                          });
                        }
                      }}
                    />
                    
                    {/* Show thumbnail when video is not playing */}
                    <img
                      src={item.thumbnail}
                      alt={item.alt}
                      className={`${
                        isActive ? "w-[420px] h-[470px]" : "w-80 h-96"
                      } object-cover ${
                        playingVideo === item.id ? "hidden" : "block"
                      } transition-all duration-700`}
                      loading="lazy"
                      decoding="async"
                    />

                    <div className="absolute top-4 left-4">
                      <span className="bg-black/80 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border border-white/20 shadow-2xl ring-1 ring-black/50">
                        {item.category}
                      </span>
                    </div>

                    {playingVideo !== item.id && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-center justify-center">
                        <Button
                          size="lg"
                          className="bg-accent/90 backdrop-blur-sm rounded-full p-4 hover:bg-accent transition-all duration-200 transform hover:scale-110 border border-cyan-400/30"
                        >
                          <Play className="h-6 w-6 text-secondary ml-1" />
                        </Button>
                      </div>
                    )}

                    {playingVideo === item.id && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-center justify-center">
                        <Button
                          size="lg"
                          className="bg-red-500/90 backdrop-blur-sm rounded-full p-4 hover:bg-red-500 transition-all duration-200 transform hover:scale-110 border border-red-400/30"
                        >
                          <div className="h-6 w-6 bg-white rounded-sm" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {isActive && (
                    <div className="mt-6 text-center">
                      <h3 className="text-xl font-semibold text-light mb-2">
                        {item.title}
                      </h3>
                      <p className="text-charcoal text-sm max-w-xs mx-auto">
                        {item.description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center mt-12">
          <div className="flex justify-center space-x-2 mb-6">
            {portfolioItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedVideo(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === selectedVideo
                    ? "bg-accent"
                    : "bg-gray-600 hover:bg-gray-500"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
