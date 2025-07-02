import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";

const portfolioItems = [
  {
    id: 1,
    title: "Travel Vlog Magic",
    description:
      "Cinematic travel edit featuring stunning landscapes and smooth transitions",
    thumbnail:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=600",
    alt: "Beautiful travel destination with mountains and water",
    category: "Travel",
    preview:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
  {
    id: 2,
    title: "Social Media Reel",
    description:
      "High-energy Instagram reel with dynamic cuts and trendy effects",
    thumbnail:
      "https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=600",
    alt: "Creative smartphone content creation setup",
    category: "Social Media",
    preview:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  },
  {
    id: 3,
    title: "Music Video Edit",
    description:
      "Artistic music video with color grading and rhythm-synced cuts",
    thumbnail:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=600",
    alt: "Professional music recording setup with instruments",
    category: "Music",
    preview:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
  {
    id: 4,
    title: "Event Highlights",
    description:
      "Wedding highlight reel capturing emotional moments and celebrations",
    thumbnail:
      "https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=600",
    alt: "Beautiful wedding celebration moment",
    category: "Events",
    preview:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  },
  {
    id: 5,
    title: "YouTube Channel Intro",
    description:
      "Branded intro sequence with motion graphics and logo animation",
    thumbnail:
      "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=600",
    alt: "Creative video editing workspace with multiple monitors",
    category: "Branding",
    preview:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  },
  {
    id: 6,
    title: "Product Showcase",
    description:
      "Sleek product video with professional lighting and smooth camera moves",
    thumbnail:
      "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=600",
    alt: "Professional product photography setup",
    category: "Commercial",
    preview:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  },
];

export default function PortfolioSection() {
  const [selectedVideo, setSelectedVideo] = useState<number>(0);
  const [hoveredVideo, setHoveredVideo] = useState<number | null>(null);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef<number>(0);
  const scrollThreshold = 300; // Minimum time between scroll events in ms

  const handleVideoPlay = (videoId: number) => {
    console.log(`Playing video ${videoId}`);
  };

  const handleVideoHover = (videoId: number) => {
    setHoveredVideo(videoId);
    const video = videoRefs.current[videoId];
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  };

  const handleVideoLeave = () => {
    if (hoveredVideo !== null) {
      const video = videoRefs.current[hoveredVideo];
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    }
    setHoveredVideo(null);
  };

  const nextVideo = () => {
    setSelectedVideo((prev) => (prev + 1) % portfolioItems.length);
  };

  const prevVideo = () => {
    setSelectedVideo(
      (prev) => (prev - 1 + portfolioItems.length) % portfolioItems.length,
    );
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    const now = Date.now();
    if (now - lastScrollTime.current < scrollThreshold) {
      return; // Throttle rapid scroll events
    }

    const deltaThreshold = 50; // Minimum delta to trigger scroll

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
          className="relative h-[600px] flex items-center justify-center"
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
              const isHovered = hoveredVideo === item.id;
              const zIndex =
                isActive || isHovered
                  ? 50
                  : portfolioItems.length - Math.abs(offset);

              return (
                <div
                  key={item.id}
                  className={`absolute transition-all duration-700 ease-out cursor-pointer ${
                    isActive || isHovered ? "scale-110" : "scale-90"
                  }`}
                  style={{
                    transform: `translateX(${offset * 200}px)`,
                    zIndex,
                    opacity:
                      Math.abs(offset) > 2 ? 0 : Math.abs(offset) > 1 ? 0.6 : 1,
                  }}
                  onClick={() => handleVideoPlay(item.id)}
                  onMouseEnter={() => handleVideoHover(item.id)}
                  onMouseLeave={handleVideoLeave}
                >
                  <div
                    className={`relative rounded-xl overflow-hidden shadow-2xl border-2 transition-all duration-300 ${
                      isActive ? "border-primary/70" : "border-gray-700/50"
                    } ${hoveredVideo === item.id ? "border-accent" : ""}`}
                  >
                    {hoveredVideo === item.id ? (
                      <video
                        ref={(el) => (videoRefs.current[item.id] = el)}
                        className="w-80 h-96 object-cover"
                        muted
                        loop
                        playsInline
                        onEnded={() => {
                          const video = videoRefs.current[item.id];
                          if (video) {
                            video.currentTime = 0;
                            video.play();
                          }
                        }}
                      >
                        <source src={item.preview} type="video/mp4" />
                      </video>
                    ) : (
                      <img
                        src={item.thumbnail}
                        alt={item.alt}
                        className="w-80 h-96 object-cover"
                      />
                    )}

                    <div className="absolute top-4 left-4">
                      <span className="bg-accent/90 text-secondary px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                        {item.category}
                      </span>
                    </div>

                    {hoveredVideo !== item.id && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-center justify-center">
                        <Button
                          size="lg"
                          className="bg-accent/90 backdrop-blur-sm rounded-full p-4 hover:bg-accent transition-all duration-200 transform hover:scale-110 border border-cyan-400/30"
                        >
                          <Play className="h-6 w-6 text-secondary ml-1" />
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
