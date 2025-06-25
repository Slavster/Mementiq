import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, CreditCard, Calendar } from "lucide-react";
import { useState } from "react";

const subscriptionPlans = [
  {
    name: "2x Weekly Delivery",
    cadence: "2 videos per week",
    price: "$18",
    monthlyTotal: "$144/month",
    savings: "28% cheaper",
    description: "Perfect for active content creators who need consistent output",
    features: [
      "2 videos weekly",
      "48-hour turnaround guaranteed"
    ],
    highlighted: true,
    buttonText: "Start 2x Weekly Plan",
    buttonVariant: "default" as const
  },
  {
    name: "Weekly Delivery", 
    cadence: "1 video per week",
    price: "$19",
    monthlyTotal: "$76/month",
    savings: "24% cheaper",
    description: "Ideal for businesses and personal projects",
    features: [
      "1 video weekly",
      "7-day turnaround guaranteed"
    ],
    highlighted: false,
    buttonText: "Start Weekly Plan",
    buttonVariant: "outline" as const
  },
  {
    name: "Monthly Delivery",
    cadence: "1 video per month", 
    price: "$20",
    monthlyTotal: "$20/month",
    savings: "20% cheaper",
    description: "Great for occasional high-quality content",
    features: [
      "1 video monthly",
      "14-day turnaround guaranteed"
    ],
    highlighted: false,
    buttonText: "Start Monthly Plan",
    buttonVariant: "outline" as const
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
      "Use anytime within 1 year"
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
    description: "For budding content creators",
    features: [
      "10 video editing credits",
      "Use anytime within 1 year"
    ],
    highlighted: false,
    buttonText: "Buy 10 Credits",
    buttonVariant: "outline" as const
  },
  {
    name: "20 Video Package",
    videoCount: 20,
    price: "$23",
    totalPrice: "$460",
    description: "Clear your content backlogs",
    features: [
      "20 video editing credits",
      "Use anytime within 1 year"
    ],
    highlighted: true,
    buttonText: "Buy 20 Credits",
    buttonVariant: "default" as const
  }
];

export default function PricingSection() {
  const [selectedTab, setSelectedTab] = useState<"subscription" | "prepaid">("subscription");

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

  const currentPlans = selectedTab === "subscription" ? subscriptionPlans : prepaidPackages;

  return (
    <section id="pricing" className="py-20 bg-gradient-to-b from-darker via-dark to-darker">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-light mb-6">
            Choose How You <span className="text-accent">Pay</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Subscriptions or prepaid packages. Tired of subscriptions? No worries! Buy credits and use them anytime in the next year.
          </p>

          {/* Pricing Selector */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-800 rounded-xl p-1 border border-gray-700">
              <div className="flex">
                <button
                  onClick={() => setSelectedTab("subscription")}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    selectedTab === "subscription"
                      ? "bg-accent text-dark shadow-lg"
                      : "text-gray-400 hover:text-light"
                  }`}
                >
                  <Calendar className="h-5 w-5" />
                  Subscription Plans
                </button>
                <button
                  onClick={() => setSelectedTab("prepaid")}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    selectedTab === "prepaid"
                      ? "bg-accent text-dark shadow-lg"
                      : "text-gray-400 hover:text-light"
                  }`}
                >
                  <CreditCard className="h-5 w-5" />
                  Prepaid Packages
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* What's Included Section */}
        <div className="mb-12">
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-2 border-accent/30 rounded-2xl">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-light text-center mb-6">What's Included with Every Video</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0" />
                  <span className="text-gray-300">4K delivery with multiple formats</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0" />
                  <span className="text-gray-300">Professional color grading</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0" />
                  <span className="text-gray-300">Audio mixing & cleanup</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0" />
                  <span className="text-gray-300">Motion graphics & transitions</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0" />
                  <span className="text-gray-300">Text overlays & titles</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0" />
                  <span className="text-gray-300">Music & sound effects</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {currentPlans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative rounded-2xl shadow-xl transition-all duration-300 bg-dark-card border-2 ${
                plan.highlighted 
                  ? selectedTab === "subscription"
                    ? 'border-accent shadow-2xl scale-105 bg-gradient-to-br from-primary/10 to-accent/10'
                    : 'border-purple-500 shadow-2xl scale-105 bg-gradient-to-br from-purple-900/20 to-pink-900/20'
                  : 'border-gray-700 hover:border-accent/50'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                  <span className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-lg whitespace-nowrap ${
                    selectedTab === "subscription"
                      ? "bg-accent text-dark"
                      : "bg-purple-500 text-white"
                  }`}>
                    {selectedTab === "subscription" ? "Most Popular" : "Best Value"}
                  </span>
                </div>
              )}
              
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-light mb-2">{plan.name}</h3>
                  <p className="text-gray-400 mb-4">{plan.description}</p>
                  {selectedTab === "subscription" && (
                    <>
                      <div className="text-sm text-accent font-medium mb-2">{(plan as any).cadence}</div>
                      <div className="text-4xl font-bold text-primary mb-1">{plan.price}</div>
                      <p className="text-sm text-gray-400 mb-2">per video</p>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-green-900/30 text-green-400 border-green-600">
                          {(plan as any).savings}
                        </Badge>
                      </div>
                      <p className="text-lg font-semibold text-accent">{(plan as any).monthlyTotal}</p>
                    </>
                  )}
                  {selectedTab === "prepaid" && (
                    <>
                      <div className="text-4xl font-bold text-purple-400 mb-1">{plan.price}</div>
                      <p className="text-sm text-gray-400 mb-2">per video</p>
                      <p className="text-lg font-semibold text-purple-300">Total: {(plan as any).totalPrice}</p>
                    </>
                  )}
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className={`h-5 w-5 mr-3 flex-shrink-0 mt-0.5 ${
                        selectedTab === "subscription" ? "text-accent" : "text-purple-400"
                      }`} />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => handlePlanSelect(plan.name)}
                  variant={plan.buttonVariant}
                  className={`w-full py-3 font-semibold transition-all duration-300 ${
                    plan.highlighted 
                      ? selectedTab === "subscription"
                        ? 'bg-gradient-to-r from-primary to-accent text-dark hover:shadow-lg hover:shadow-accent/25 transform hover:scale-105'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/25 transform hover:scale-105'
                      : 'bg-gray-700 text-light hover:bg-gray-600 border-gray-600 hover:border-accent/50'
                  }`}
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedTab === "subscription" && (
          <div className="text-center text-sm text-gray-400 mb-12">
            <p>Need more than 2x weekly delivery? <a href="#contact" className="text-accent hover:underline">Contact sales</a> for a custom package.</p>
          </div>
        )}

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

        <div className="text-center mb-8">
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

        {/* Asterisks at bottom */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>*Subscription plans require a 2-month minimum commitment</p>
          <p>*Pricing limited to videos with max length of 3 minutes</p>
          <p>*For longer content or custom packages, contact sales</p>
        </div>
      </div>
    </section>
  );
}
