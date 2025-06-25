import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, CreditCard, Calendar } from "lucide-react";

const subscriptionPlans = [
  {
    name: "2x Weekly Delivery",
    cadence: "2 videos per week",
    price: "$18",
    monthlyTotal: "$144/month",
    savings: "28% cheaper",
    description: "Perfect for active content creators who need consistent output",
    features: [
      "2 professionally edited videos weekly",
      "4K delivery with multiple formats", 
      "Professional color grading",
      "Audio mixing & cleanup",
      "Motion graphics & transitions",
      "48-hour turnaround guaranteed"
    ],
    highlighted: true,
    buttonText: "Start 2x Weekly Plan",
    buttonVariant: "default" as const,
    minCommitment: "2 month minimum*"
  },
  {
    name: "Weekly Delivery", 
    cadence: "1 video per week",
    price: "$19",
    monthlyTotal: "$76/month",
    savings: "24% cheaper",
    description: "Ideal for businesses and personal projects",
    features: [
      "1 professionally edited video weekly",
      "4K delivery with multiple formats",
      "Professional color grading", 
      "Audio mixing & cleanup",
      "Motion graphics & transitions",
      "7-day turnaround guaranteed"
    ],
    highlighted: false,
    buttonText: "Start Weekly Plan",
    buttonVariant: "outline" as const,
    minCommitment: "2 month minimum*"
  },
  {
    name: "Monthly Delivery",
    cadence: "1 video per month", 
    price: "$20",
    monthlyTotal: "$20/month",
    savings: "20% cheaper",
    description: "Great for occasional high-quality content",
    features: [
      "1 professionally edited video monthly",
      "4K delivery with multiple formats",
      "Professional color grading",
      "Audio mixing & cleanup", 
      "Motion graphics & transitions",
      "14-day turnaround guaranteed"
    ],
    highlighted: false,
    buttonText: "Start Monthly Plan",
    buttonVariant: "outline" as const,
    minCommitment: "2 month minimum*"
  }
];

const prepaidPackages = [
  {
    name: "5 Video Package",
    videoCount: 5,
    price: "$25",
    totalPrice: "$125",
    description: "Perfect for trying us out",
    features: [
      "5 video editing credits",
      "Use anytime within 1 year",
      "4K delivery with multiple formats",
      "Professional color grading",
      "Audio mixing & cleanup",
      "Motion graphics & transitions"
    ],
    highlighted: false,
    buttonText: "Buy 5 Credits",
    buttonVariant: "outline" as const
  },
  {
    name: "10 Video Package",
    videoCount: 10,
    price: "$24",
    totalPrice: "$240",
    description: "Great for regular content creators",
    features: [
      "10 video editing credits",
      "Use anytime within 1 year",
      "4K delivery with multiple formats",
      "Professional color grading",
      "Audio mixing & cleanup",
      "Motion graphics & transitions"
    ],
    highlighted: true,
    buttonText: "Buy 10 Credits",
    buttonVariant: "default" as const
  },
  {
    name: "20 Video Package",
    videoCount: 20,
    price: "$23",
    totalPrice: "$460",
    description: "Best value for heavy users",
    features: [
      "20 video editing credits",
      "Use anytime within 1 year",
      "4K delivery with multiple formats",
      "Professional color grading",
      "Audio mixing & cleanup",
      "Motion graphics & transitions"
    ],
    highlighted: false,
    buttonText: "Buy 20 Credits",
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

  const handlePlanSelect = (planName: string) => {
    console.log(`Selected plan: ${planName}`);
    scrollToContact();
  };

  return (
    <section id="pricing" className="py-20 bg-gradient-to-b from-darker via-dark to-darker">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-light mb-6">
            Choose How You <span className="text-accent">Pay</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-6">
            Subscriptions or prepaid packages. Tired of subscriptions? No worries! Buy credits and use them anytime in the next year.
          </p>
          <p className="text-sm text-gray-400 italic">
            *Pricing limited to videos with max length of 3 minutes. For longer content or custom packages, contact sales.
          </p>
        </div>

        {/* Subscription Plans */}
        <div className="mb-16">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Calendar className="h-6 w-6 text-accent" />
            <h3 className="text-3xl font-bold text-light">Subscription Plans</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {subscriptionPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative rounded-2xl shadow-xl transition-all duration-300 bg-dark-card border-2 ${
                  plan.highlighted 
                    ? 'border-accent shadow-2xl scale-105 bg-gradient-to-br from-primary/10 to-accent/10' 
                    : 'border-gray-700 hover:border-accent/50'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-accent text-dark px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-light mb-2">{plan.name}</h3>
                    <p className="text-gray-400 mb-4">{plan.description}</p>
                    <div className="text-sm text-accent font-medium mb-2">{plan.cadence}</div>
                    <div className="text-4xl font-bold text-primary mb-1">{plan.price}</div>
                    <p className="text-sm text-gray-400 mb-2">per video</p>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Badge variant="secondary" className="bg-green-900/30 text-green-400 border-green-600">
                        {plan.savings}
                      </Badge>
                    </div>
                    <p className="text-lg font-semibold text-accent">{plan.monthlyTotal}</p>
                    <p className="text-xs text-orange-400 mt-1">{plan.minCommitment}</p>
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    onClick={() => handlePlanSelect(plan.name)}
                    variant={plan.buttonVariant}
                    className={`w-full py-3 font-semibold transition-all duration-300 ${
                      plan.highlighted 
                        ? 'bg-gradient-to-r from-primary to-accent text-dark hover:shadow-lg hover:shadow-accent/25 transform hover:scale-105' 
                        : 'bg-gray-700 text-light hover:bg-gray-600 border-gray-600 hover:border-accent/50'
                    }`}
                  >
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center text-sm text-gray-400">
            <p>Need more than 2x weekly delivery? <a href="#contact" className="text-accent hover:underline">Contact sales</a> for a custom package.</p>
          </div>
        </div>

        {/* Prepaid Packages */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-3 mb-8">
            <CreditCard className="h-6 w-6 text-accent" />
            <h3 className="text-3xl font-bold text-light">Prepaid Video Packages</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {prepaidPackages.map((pkg, index) => (
              <Card 
                key={index} 
                className={`relative rounded-2xl shadow-xl transition-all duration-300 bg-dark-card border-2 ${
                  pkg.highlighted 
                    ? 'border-purple-500 shadow-2xl scale-105 bg-gradient-to-br from-purple-900/20 to-pink-900/20' 
                    : 'border-gray-700 hover:border-purple-500/50'
                }`}
              >
                {pkg.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                      Best Value
                    </span>
                  </div>
                )}
                
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-light mb-2">{pkg.name}</h3>
                    <p className="text-gray-400 mb-4">{pkg.description}</p>
                    <div className="text-4xl font-bold text-purple-400 mb-1">{pkg.price}</div>
                    <p className="text-sm text-gray-400 mb-2">per video</p>
                    <p className="text-lg font-semibold text-purple-300">Total: {pkg.totalPrice}</p>
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {pkg.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="h-5 w-5 text-purple-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    onClick={() => handlePlanSelect(pkg.name)}
                    variant={pkg.buttonVariant}
                    className={`w-full py-3 font-semibold transition-all duration-300 ${
                      pkg.highlighted 
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/25 transform hover:scale-105' 
                        : 'bg-gray-700 text-light hover:bg-gray-600 border-gray-600 hover:border-purple-500/50'
                    }`}
                  >
                    {pkg.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Revision Add-on Section */}
        <div className="max-w-2xl mx-auto mb-12">
          <Card className="bg-gradient-to-r from-orange-900/20 to-red-900/20 border-2 border-orange-700/50 rounded-2xl">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Plus className="h-6 w-6 text-orange-400" />
                <h3 className="text-2xl font-bold text-light">Revision Add-on</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Need changes to your video? Add revisions a-la-carte for any plan or package.
              </p>
              <div className="text-3xl font-bold text-orange-400 mb-2">$5</div>
              <p className="text-sm text-gray-400 mb-6">per revision request</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-orange-400 mr-2" />
                  Minor tweaks & adjustments
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-orange-400 mr-2" />
                  48-hour turnaround
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-orange-400 mr-2" />
                  Color & audio changes
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-orange-400 mr-2" />
                  Text & graphic updates
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-gray-400 mb-6">
            Questions about pricing or need a custom solution? Let's find the perfect fit for your content needs.
          </p>
          <Button 
            onClick={scrollToContact}
            className="bg-accent text-dark px-8 py-4 text-lg font-semibold hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105"
          >
            Get Started Today
          </Button>
        </div>
      </div>
    </section>
  );
}
