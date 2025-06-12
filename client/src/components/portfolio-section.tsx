import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

const portfolioItems = [
  {
    id: 1,
    title: "TechCorp Brand Story",
    description: "Corporate branding video showcasing company culture and values",
    thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600",
    alt: "Modern corporate office environment"
  },
  {
    id: 2,
    title: "FinanceFirst Campaign",
    description: "Marketing campaign that increased client acquisition by 40%",
    thumbnail: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600",
    alt: "Professional video production set with cameras and lighting"
  },
  {
    id: 3,
    title: "EduLearn Platform",
    description: "Educational video series for online learning platform",
    thumbnail: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600",
    alt: "Business professionals in a strategic meeting"
  },
  {
    id: 4,
    title: "RetailMax Product Launch",
    description: "Product demonstration videos that boosted sales by 60%",
    thumbnail: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600",
    alt: "Creative video editing workspace with multiple monitors"
  }
];

export default function PortfolioSection() {
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);

  const handleVideoPlay = (videoId: number) => {
    setSelectedVideo(videoId);
    // In a real implementation, this would open a video modal
    console.log(`Playing video ${videoId}`);
  };

  return (
    <section id="portfolio" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-secondary mb-4">Our Latest Work</h2>
          <p className="text-xl text-charcoal max-w-3xl mx-auto">
            Explore our portfolio of successful video projects that have helped businesses achieve their goals.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {portfolioItems.map((item) => (
            <div key={item.id} className="group cursor-pointer" onClick={() => handleVideoPlay(item.id)}>
              <div className="relative rounded-xl overflow-hidden shadow-lg">
                <img 
                  src={item.thumbnail} 
                  alt={item.alt}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300" 
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                  <Button
                    size="lg"
                    className="bg-white bg-opacity-90 rounded-full p-4 group-hover:bg-opacity-100 transition-all duration-200 transform group-hover:scale-110"
                  >
                    <Play className="h-6 w-6 text-primary ml-1" />
                  </Button>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-secondary">{item.title}</h3>
                <p className="text-charcoal text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button className="bg-primary text-white px-8 py-3 text-lg font-semibold hover:bg-blue-700 transition-colors duration-200">
            View Full Portfolio
          </Button>
        </div>
      </div>
    </section>
  );
}
