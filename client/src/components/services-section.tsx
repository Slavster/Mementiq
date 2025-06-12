import { Card, CardContent } from "@/components/ui/card";
import { Video, Megaphone, GraduationCap, Check } from "lucide-react";

const services = [
  {
    icon: Video,
    title: "Corporate Videos",
    description: "Professional corporate videos that communicate your brand message, showcase your team, and build trust with stakeholders.",
    features: ["Company introductions", "Training materials", "Executive interviews"],
    bgColor: "bg-primary bg-opacity-10",
    iconColor: "text-primary"
  },
  {
    icon: Megaphone,
    title: "Marketing Content",
    description: "Engaging marketing videos that boost brand awareness, drive conversions, and connect with your target audience.",
    features: ["Product demonstrations", "Social media content", "Promotional videos"],
    bgColor: "bg-accent bg-opacity-10",
    iconColor: "text-accent"
  },
  {
    icon: GraduationCap,
    title: "Educational Content",
    description: "Clear, engaging educational videos that simplify complex topics and enhance learning experiences.",
    features: ["Online courses", "Tutorial videos", "Webinar production"],
    bgColor: "bg-secondary bg-opacity-10",
    iconColor: "text-secondary"
  }
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-20 bg-lightgray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-secondary mb-4">Our Video Production Services</h2>
          <p className="text-xl text-charcoal max-w-3xl mx-auto">
            From corporate videos to creative campaigns, we deliver professional video content that captures attention and drives results.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <Card key={index} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border-0">
                <CardContent className="p-8">
                  <div className={`${service.bgColor} rounded-lg p-4 w-16 h-16 flex items-center justify-center mb-6`}>
                    <IconComponent className={`h-8 w-8 ${service.iconColor}`} />
                  </div>
                  <h3 className="text-2xl font-semibold text-secondary mb-4">{service.title}</h3>
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
