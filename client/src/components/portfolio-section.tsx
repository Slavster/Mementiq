import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";

const portfolioItems = [
  {
    id: 1,
    title: "Travel Vlog Magic",
    description: "Cinematic travel edit featuring stunning landscapes and smooth transitions",
    thumbnail: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600",
    alt: "Beautiful travel destination with mountains and water",
    category: "Travel"
  },
  {
    id: 2,
    title: "Social Media Reel",
    description: "High-energy Instagram reel with dynamic cuts and trendy effects",
    thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600",
    alt: "Creative smartphone content creation setup",
    category: "Social Media"
  },
  {
    id: 3,
    title: "Music Video Edit",
    description: "Artistic music video with color grading and rhythm-synced cuts",
    thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600",
    alt: "Professional music recording setup with instruments",
    category: "Music"
  },
  {
    id: 4,
    title: "Event Highlights",
    description: "Wedding highlight reel capturing emotional moments and celebrations",
    thumbnail: "https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600",
    alt: "Beautiful wedding celebration moment",
    category: "Events"
  },
  {
    id: 5,
    title: "YouTube Channel Intro",
    description: "Branded intro sequence with motion graphics and logo animation",
    thumbnail: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600",
    alt: "Creative video editing workspace with multiple monitors",
    category: "Branding"
  },
  {
    id: 6,
    title: "Product Showcase",
    description: "Sleek product video with professional lighting and smooth camera moves",
    thumbnail: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600",
    alt: "Professional product photography setup",
    category: "Commercial"
  }
];

export default function PortfolioSection() {
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleVideoPlay = (videoId: number) => {
    setSelectedVideo(videoId);
    console.log(`Playing video ${videoId}`);
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  return (
    <section id="portfolio" className="py-20 bg-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-light mb-4">Video Portfolio</h2>
          <p className="text-xl text-charcoal max-w-3xl mx-auto">
            Check out our latest video edits showcasing diverse styles and creative approaches for every type of content.
          </p>
        </div>

        <div className="relative">
          <Button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-dark-card/80 hover:bg-dark-card border border-gray-600 text-light p-3 rounded-full shadow-xl backdrop-blur-sm"
            size="sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-dark-card/80 hover:bg-dark-card border border-gray-600 text-light p-3 rounded-full shadow-xl backdrop-blur-sm"
            size="sm"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div 
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {portfolioItems.map((item) => (
              <div key={item.id} className="group cursor-pointer flex-shrink-0 w-80" onClick={() => handleVideoPlay(item.id)}>
                <div className="relative rounded-xl overflow-hidden shadow-xl border border-gray-700 hover:border-primary/50 transition-all duration-300">
                  <img 
                    src={item.thumbnail} 
                    alt={item.alt}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-accent/90 text-secondary px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                      {item.category}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent group-hover:from-black/70 transition-all duration-300 flex items-center justify-center">
                    <Button
                      size="lg"
                      className="bg-accent/90 backdrop-blur-sm rounded-full p-4 hover:bg-accent transition-all duration-200 transform group-hover:scale-110 border border-yellow-400/30"
                    >
                      <Play className="h-6 w-6 text-secondary ml-1" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-light">{item.title}</h3>
                  <p className="text-charcoal text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <Button className="bg-primary text-light px-8 py-3 text-lg font-semibold hover:bg-purple-600 transition-colors duration-200">
            View Full Portfolio
          </Button>
        </div>
      </div>
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
