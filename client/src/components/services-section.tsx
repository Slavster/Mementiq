import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Gem, Megaphone, Palette, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useState, useRef } from "react";

const services = [
  {
    iconName: "Smartphone",
    title: "Social Media Content",
    description: "Eye-catching edits perfect for Instagram, TikTok, YouTube, and other platforms that get you noticed.",
    features: [
      "For the busy professional",
      "For the budding creator",
      "For the new entrepreneur",
      "For a top dating profile"
    ],
    bgColor: "bg-primary bg-opacity-20",
    iconColor: "text-primary"
  },
  {
    iconName: "Gem",
    title: "Treasured Memories",
    description: "Your special moments transformed into cinematic masterpieces - from travel vlogs, community gatherings, life milestones, to once-in-a-lifetime events, and more.",
    features: [
      "For the jet setter",
      "For the hobbyist",
      "For the family archivist",
      "For the community connector",
      "For tasteful keepsakes"
    ],
    bgColor: "bg-accent bg-opacity-20",
    iconColor: "text-accent"
  },
  {
    iconName: "Megaphone",
    title: "Promotional Content",
    description: "Skip the Editing Headache and quickly transform your raw footage into high-converting ads and captivating content.",
    features: [
      "For the small business owner",
      "For the freelancer",
      "For the digital nomad",
      "For the marketer",
      "For effective branding"
    ],
    bgColor: "bg-purple-500 bg-opacity-20",
    iconColor: "text-purple-400"
  },
  {
    iconName: "Palette",
    title: "Creative Storytelling",
    description: "Bring your creative vision to life with professional editing that captures emotion and tells your story.",
    features: [
      "For the musician",
      "For the film maker",
      "For the artisan",
      "For the performer",
      "For creative expression"
    ],
    bgColor: "bg-emerald-500 bg-opacity-20",
    iconColor: "text-emerald-400"
  }
];

export default function ServicesSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef<number>(0);
  const scrollThreshold = 300;

  const nextService = () => {
    setCurrentIndex((prev) => (prev + 1) % services.length);
  };

  const prevService = () => {
    setCurrentIndex((prev) => (prev - 1 + services.length) % services.length);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    const now = Date.now();
    if (now - lastScrollTime.current < scrollThreshold) {
      return;
    }
    
    const deltaThreshold = 50;
    
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (Math.abs(e.deltaX) > deltaThreshold) {
        lastScrollTime.current = now;
        if (e.deltaX > 0) {
          nextService();
        } else {
          prevService();
        }
      }
    } else {
      if (Math.abs(e.deltaY) > deltaThreshold) {
        lastScrollTime.current = now;
        if (e.deltaY > 0) {
          nextService();
        } else {
          prevService();
        }
      }
    }
  };

  return (
    <section id="services" className="py-20 bg-lightgray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-light mb-4">Video Editing Services</h2>
          <p className="text-xl text-charcoal max-w-3xl mx-auto">
            Professional video editing that brings your creative vision to life with cinematic quality and attention to detail.
          </p>
        </div>
        
        <div 
          className="relative h-[500px] flex items-center justify-center"
          onWheel={handleWheel}
          ref={containerRef}
        >
          <Button
            onClick={prevService}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-dark-card/80 hover:bg-dark-card border border-gray-600 text-light p-3 rounded-full shadow-xl backdrop-blur-sm"
            size="sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button
            onClick={nextService}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-dark-card/80 hover:bg-dark-card border border-gray-600 text-light p-3 rounded-full shadow-xl backdrop-blur-sm"
            size="sm"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div className="relative w-full max-w-6xl h-full flex items-center justify-center">
            {services.map((service, index) => {
              const offset = index - currentIndex;
              const isActive = index === currentIndex;
              const zIndex = services.length - Math.abs(offset);
              
              return (
                <div
                  key={index}
                  className={`absolute transition-all duration-700 ease-out ${
                    isActive ? 'scale-100' : 'scale-90'
                  }`}
                  style={{
                    transform: `translateX(${offset * 400}px)`,
                    zIndex,
                    opacity: Math.abs(offset) > 1 ? 0 : Math.abs(offset) > 0 ? 0.7 : 1,
                  }}
                >
                  <Card className="bg-dark-card border-2 border-dashed border-gray-600 hover:border-accent rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 w-96 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-purple-500"></div>
                    <CardContent className="p-8">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0 mt-1">
                          {service.iconName === "Smartphone" && <Smartphone className={`h-8 w-8 ${service.iconColor}`} />}
                          {service.iconName === "Gem" && <Gem className={`h-8 w-8 ${service.iconColor}`} />}
                          {service.iconName === "Megaphone" && <Megaphone className={`h-8 w-8 ${service.iconColor}`} />}
                          {service.iconName === "Palette" && <Palette className={`h-8 w-8 ${service.iconColor}`} />}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-semibold text-light mb-4">{service.title}</h3>
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-4 mb-6 border-l-4 border-accent/30">
                        <p className="text-gray-400 text-sm font-normal">{service.description}</p>
                      </div>
                      <ul className="space-y-2">
                        {service.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-center text-charcoal font-medium text-[16px]">
                            <Check className="h-4 w-4 text-accent mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center mt-12">
          <div className="flex justify-center space-x-2 mb-6">
            {services.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-accent' : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
