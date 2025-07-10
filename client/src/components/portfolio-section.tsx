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
  const [hoveredVideo, setHoveredVideo] = useState<number | null>(null);
  const [preloadedVideos, setPreloadedVideos] = useState<Set<number>>(new Set());
  const [sectionInView, setSectionInView] = useState<boolean>(false);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef<number>(0);
  const scrollThreshold = 300; // Minimum time between scroll events in ms

  const handleVideoPlay = (videoId: number) => {
    console.log(`Playing video ${videoId}`);
  };

  // Preload first video chunk when section comes into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !sectionInView) {
          setSectionInView(true);
          // Prefetch the first video's initial chunk
          fetch(`${portfolioItems[0].preview}`, {
            headers: { 'Range': 'bytes=0-1048575' } // 1MB initial prefetch
          }).then(() => {
            console.log('Prefetched first video chunk');
          }).catch(() => {
            // Ignore prefetch errors
          });
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [sectionInView]);

  // Preload adjacent videos when hovering over portfolio items
  const preloadAdjacentVideos = (currentId: number) => {
    const adjacentIds = [currentId - 1, currentId + 1].filter(
      id => id >= 0 && id < portfolioItems.length && !preloadedVideos.has(id)
    );
    
    adjacentIds.forEach(id => {
      if (!preloadedVideos.has(id)) {
        // Prefetch just the first chunk for faster startup
        fetch(portfolioItems[id].preview, {
          headers: { 'Range': 'bytes=0-1048575' } // 1MB chunk
        }).then(() => {
          setPreloadedVideos(prev => new Set(prev).add(id));
          console.log(`Preloaded video ${id} chunk`);
        }).catch(() => {
          // Ignore prefetch errors
        });
      }
    });
  };

  const handleVideoHover = (videoId: number) => {
    setHoveredVideo(videoId);
    const video = videoRefs.current[videoId];
    if (video) {
      video.currentTime = 0;
      // Start loading immediately and play when ready
      video.load(); // Force reload to start range requests
      
      // Try to play immediately, fallback to waiting for data
      const playPromise = video.play().catch(() => {
        // If immediate play fails, wait for some data
        if (video.readyState < 3) {
          video.addEventListener('canplay', () => {
            video.play().catch(() => {
              // Ignore autoplay errors
            });
          }, { once: true });
        }
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
                  onMouseEnter={() => {
                    handleVideoHover(item.id);
                    preloadAdjacentVideos(item.id);
                  }}
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
                        preload="auto"
                        onLoadStart={() => console.log(`Video ${item.id} load started`)}
                        onLoadedData={() => console.log(`Video ${item.id} data loaded`)}
                        onCanPlay={() => console.log(`Video ${item.id} can play`)}
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
                        loading="lazy"
                        decoding="async"
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
