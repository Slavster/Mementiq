import { Card, CardContent } from "@/components/ui/card";
import { Video, Megaphone, GraduationCap, Check } from "lucide-react";

const services = [
  {
    icon: Video,
    title: "Social Media Content",
    description: "Eye-catching edits perfect for Instagram, TikTok, YouTube, and other platforms that get you noticed.",
    features: ["Short-form content", "Reels & Stories", "YouTube videos"],
    bgColor: "bg-primary bg-opacity-20",
    iconColor: "text-primary"
  },
  {
    icon: Megaphone,
    title: "Personal Projects",
    description: "Transform your personal moments into cinematic masterpieces - from travel vlogs to life events.",
    features: ["Travel videos", "Event highlights", "Personal branding"],
    bgColor: "bg-accent bg-opacity-20",
    iconColor: "text-accent"
  },
  {
    icon: GraduationCap,
    title: "Creative Storytelling",
    description: "Bring your creative vision to life with professional editing that captures emotion and tells your story.",
    features: ["Music videos", "Short films", "Creative content"],
    bgColor: "bg-purple-500 bg-opacity-20",
    iconColor: "text-purple-400"
  }
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-20 bg-lightgray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-light mb-4">Video Editing Services</h2>
          <p className="text-xl text-charcoal max-w-3xl mx-auto">
            Professional video editing that brings your creative vision to life with cinematic quality and attention to detail.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <Card key={index} className="bg-dark-card border border-gray-700 rounded-xl shadow-xl hover:shadow-2xl hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-8">
                  <div className={`${service.bgColor} rounded-lg p-4 w-16 h-16 flex items-center justify-center mb-6 border border-gray-600`}>
                    <IconComponent className={`h-8 w-8 ${service.iconColor}`} />
                  </div>
                  <h3 className="text-2xl font-semibold text-light mb-4">{service.title}</h3>
                  <p className="text-charcoal mb-6">{service.description}</p>
                  <ul className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-charcoal">
                        <Check className="h-4 w-4 text-accent mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
