import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

const packages = [
  {
    name: "Starter",
    price: "$2,499",
    description: "Perfect for small businesses and startups",
    features: [
      "Up to 60 seconds",
      "Professional script writing",
      "1-day filming",
      "Basic animation & graphics",
      "3 rounds of revisions",
      "HD delivery"
    ],
    highlighted: false,
    buttonText: "Get Started",
    buttonVariant: "outline" as const
  },
  {
    name: "Professional",
    price: "$4,999",
    description: "Ideal for growing businesses",
    features: [
      "Up to 2 minutes",
      "Professional script & storyboard",
      "2-day filming",
      "Advanced animation & graphics",
      "Professional voiceover",
      "5 rounds of revisions",
      "4K delivery + social media cuts"
    ],
    highlighted: true,
    buttonText: "Get Started",
    buttonVariant: "default" as const
  },
  {
    name: "Enterprise",
    price: "$9,999",
    description: "For large-scale video campaigns",
    features: [
      "Up to 5 minutes",
      "Complete creative development",
      "Multi-day filming",
      "Premium animation & VFX",
      "Celebrity voiceover options",
      "Unlimited revisions",
      "Complete video asset package"
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
    <section id="pricing" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-secondary mb-4">Transparent Pricing</h2>
          <p className="text-xl text-charcoal max-w-3xl mx-auto">
            Choose the package that fits your needs. All packages include professional production and unlimited revisions.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {packages.map((pkg, index) => (
            <Card 
              key={index} 
              className={`relative rounded-xl shadow-lg transition-colors duration-300 ${
                pkg.highlighted 
                  ? 'border-2 border-primary shadow-xl' 
                  : 'border-2 border-gray-100 hover:border-primary'
              }`}
            >
              {pkg.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-secondary mb-2">{pkg.name}</h3>
                  <p className="text-charcoal mb-6">{pkg.description}</p>
                  <div className="text-4xl font-bold text-primary mb-2">{pkg.price}</div>
                  <p className="text-sm text-charcoal">per video</p>
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
                  className={`w-full py-3 font-semibold transition-colors duration-200 ${
                    pkg.highlighted 
                      ? 'bg-primary text-white hover:bg-blue-700' 
                      : 'bg-gray-100 text-charcoal hover:bg-gray-200'
                  }`}
                >
                  {pkg.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-charcoal mb-4">Need a custom solution? We'd love to discuss your unique requirements.</p>
          <Button 
            onClick={scrollToContact}
            className="bg-accent text-white px-8 py-3 text-lg font-semibold hover:bg-green-600 transition-colors duration-200"
          >
            Schedule Free Consultation
          </Button>
        </div>
      </div>
    </section>
  );
}
