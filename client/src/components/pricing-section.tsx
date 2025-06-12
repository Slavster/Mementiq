import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

const packages = [
  {
    name: "Quick Edit",
    price: "$199",
    description: "Perfect for social media content",
    features: [
      "Up to 3 minutes",
      "Basic color correction",
      "Music & sound effects",
      "Text overlays & titles",
      "2 rounds of revisions",
      "1080p delivery"
    ],
    highlighted: false,
    buttonText: "Get Started",
    buttonVariant: "outline" as const
  },
  {
    name: "Pro Edit",
    price: "$499",
    description: "Ideal for content creators",
    features: [
      "Up to 10 minutes",
      "Advanced color grading",
      "Motion graphics & transitions",
      "Audio mixing & cleanup",
      "5 rounds of revisions",
      "4K delivery + multiple formats"
    ],
    highlighted: true,
    buttonText: "Get Started",
    buttonVariant: "default" as const
  },
  {
    name: "Cinematic",
    price: "$999",
    description: "For premium content & films",
    features: [
      "Up to 30 minutes",
      "Professional color grading",
      "Custom motion graphics",
      "Professional audio mixing",
      "Unlimited revisions",
      "4K delivery + project files"
    ],
    highlighted: false,
    buttonText: "Get Started",
    buttonVariant: "outline" as const
  }
];

export default function PricingSection() {
  const scrollToContact = () => {
    const element = document.getElementById('contact');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePackageSelect = (packageName: string) => {
    console.log(`Selected package: ${packageName}`);
    scrollToContact();
  };

  return (
    <section id="pricing" className="py-20 bg-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-light mb-4">Simple Pricing</h2>
          <p className="text-xl text-charcoal max-w-3xl mx-auto">
            Professional video editing at transparent prices. Choose the package that fits your content needs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {packages.map((pkg, index) => (
            <Card 
              key={index} 
              className={`relative rounded-xl shadow-xl transition-all duration-300 bg-dark-card border ${
                pkg.highlighted 
                  ? 'border-2 border-primary shadow-2xl scale-105' 
                  : 'border-gray-700 hover:border-primary/50'
              }`}
            >
              {pkg.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-accent text-secondary px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}
              
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-light mb-2">{pkg.name}</h3>
                  <p className="text-charcoal mb-6">{pkg.description}</p>
                  <div className="text-4xl font-bold text-primary mb-2">{pkg.price}</div>
                  <p className="text-sm text-charcoal">per project</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  {pkg.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0" />
                      <span className="text-charcoal">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => handlePackageSelect(pkg.name)}
                  variant={pkg.buttonVariant}
                  className={`w-full py-3 font-semibold transition-all duration-200 ${
                    pkg.highlighted 
                      ? 'bg-primary text-light hover:bg-purple-600 shadow-lg' 
                      : 'bg-gray-700 text-light hover:bg-gray-600 border-gray-600'
                  }`}
                >
                  {pkg.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-charcoal mb-4">Need something custom? Let's discuss your creative vision and requirements.</p>
          <Button 
            onClick={scrollToContact}
            className="bg-accent text-secondary px-8 py-3 text-lg font-semibold hover:bg-yellow-500 transition-colors duration-200"
          >
            Get Custom Quote
          </Button>
        </div>
      </div>
    </section>
  );
}
