import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Check, ArrowLeft, CreditCard, Calendar, Plus } from "lucide-react";

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  status: string;
  tier: string;
  usage: number;
  allowance: number;
  periodStart: string;
  periodEnd: string;
  stripeCustomerId: string;
}

// Use the exact same pricing data as the landing page
const subscriptionPlans = [
  {
    name: "Growth Accelerator",
    cadence: "2 videos per week",
    price: "$18",
    monthlyTotal: "$144 billed monthly",
    description:
      "Perfect for committed creators looking to increase their reach",
    features: [
      "2 videos delivered every week",
      "48-hour turnaround guaranteed",
    ],
    highlighted: true,
    buttonText: "Start Bi-Weekly Plan",
    buttonVariant: "default" as const,
  },
  {
    name: "Consistency Club",
    cadence: "1 video per week",
    price: "$19",
    monthlyTotal: "$76 billed monthly",
    description:
      "Ideal for progressing your business, hobby, and personal projects",
    features: ["1 video delivered every week", "4-day turnaround guaranteed"],
    highlighted: false,
    buttonText: "Start Weekly Plan",
    buttonVariant: "outline" as const,
  },
  {
    name: "Creative Spark",
    cadence: "1 video per month",
    price: "$20",
    monthlyTotal: "$20 billed monthly",
    description:
      "Our most accessible plan, designed to let everyone share their moments",
    features: ["1 video delivered every month", "7-day turnaround guaranteed"],
    highlighted: false,
    buttonText: "Start Monthly Plan",
    buttonVariant: "outline" as const,
  },
];

const prepaidPackages = [
  {
    name: "5 Video Package",
    videoCount: 5,
    price: "$25",
    totalPrice: "$125",
    description: "Great for letting those special moments shine",
    features: [
      "5 video editing credits",
      "Great for longer content",
      "1 credit = up to 3 minutes of final video",
      "Use anytime within 1 year",
    ],
    highlighted: false,
    buttonText: "Buy 5 Credits",
    buttonVariant: "outline" as const,
  },
  {
    name: "10 Video Package",
    videoCount: 10,
    price: "$24",
    totalPrice: "$240",
    description: "Creative exploration and everyday storytelling",
    features: [
      "10 video editing credits",
      "Great for longer content",
      "1 credit = up to 3 minutes of final video",
      "Use anytime within 1 year",
    ],
    highlighted: false,
    buttonText: "Buy 10 Credits",
    buttonVariant: "outline" as const,
  },
  {
    name: "20 Video Package",
    videoCount: 20,
    price: "$23",
    totalPrice: "$460",
    description: "Fast channel launches and backlog clearing",
    features: [
      "20 video editing credits",
      "Great for longer content",
      "1 credit = up to 3 minutes of final video",
      "Use anytime within 1 year",
    ],
    highlighted: true,
    buttonText: "Buy 20 Credits",
    buttonVariant: "default" as const,
  },
];

export default function SubscribePage() {
  const [selectedTab, setSelectedTab] = useState<"subscription" | "prepaid">("subscription");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Get subscription status
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
  });

  const subscription: SubscriptionStatus | undefined = (subscriptionData as any)?.subscription;

  // Create checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: async (tier: string) => {
      const response = await apiRequest("POST", "/api/subscription/create-checkout", { tier });
      return response;
    },
    onSuccess: (data) => {
      if (data.success && data.checkoutUrl) {
        toast({
          title: "Redirecting to checkout...",
          description: "You'll be redirected to Stripe to complete your subscription.",
        });
        
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.message || "Failed to create checkout session");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Checkout failed",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  const handlePlanSelect = (planName: string) => {
    // Map plan names to subscription tiers
    const tierMap: { [key: string]: string } = {
      "Creative Spark": "basic",
      "Consistency Club": "standard", 
      "Growth Accelerator": "premium"
    };
    
    const tier = tierMap[planName];
    if (tier) {
      createCheckoutMutation.mutate(tier);
    } else {
      // For prepaid packages, redirect to contact or show message
      toast({
        title: "Coming Soon",
        description: "Prepaid packages will be available soon. Please try our subscription plans.",
      });
    }
  };

  const currentPlans = selectedTab === "subscription" ? subscriptionPlans : prepaidPackages;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-darker via-dark to-darker">
        <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-darker via-dark to-darker">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header with Back Button */}
        <div className="text-center mb-16">
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            className="mb-6 text-gray-400 hover:text-light"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h2 className="text-5xl font-bold text-light mb-6">
            Flexible & <span className="text-accent">Transparent</span> Pricing
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Choose how you want to pay - subscription or video packs.
            <br />
            We've got you covered.
          </p>

          {/* Pricing Selector */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-800 rounded-xl p-1 border border-gray-700 relative">
              <div className="flex">
                <button
                  onClick={() => setSelectedTab("subscription")}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 relative ${
                    selectedTab === "subscription"
                      ? "bg-accent shadow-lg"
                      : "text-gray-400 hover:text-light"
                  }`}
                  style={selectedTab === "subscription" ? { color: "#000000" } : {}}
                >
                  <Calendar className="h-5 w-5" style={selectedTab === "subscription" ? { color: "#000000" } : {}} />
                  <span>Subscription Plans</span>
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                    <span className="text-xs text-green-400 bg-dark border border-green-400 px-2 py-1 rounded-full whitespace-nowrap shadow-lg">
                      28% cheaper
                    </span>
                  </div>
                </button>
                <button
                  disabled
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 relative cursor-not-allowed opacity-50 text-gray-500 bg-gray-700/50"
                >
                  <CreditCard className="h-5 w-5" />
                  <span>Prepaid Packages</span>
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                    <span className="text-xs text-gray-400 bg-gray-600 border border-gray-500 px-2 py-1 rounded-full whitespace-nowrap shadow-lg">
                      Coming Soon
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Subscription Disclaimer */}
          {selectedTab === "subscription" && (
            <div className="text-center mb-12">
              <p className="text-gray-400 text-sm">
                Change plans or cancel anytime
              </p>
            </div>
          )}
        </div>

        {/* Current Subscription Status */}
        {subscription?.hasActiveSubscription && (
          <div className="mb-12 max-w-2xl mx-auto">
            <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-2 border-green-700/50 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-light mb-2">
                      Current Plan: {subscription.tier?.charAt(0).toUpperCase() + subscription.tier?.slice(1)}
                    </h3>
                    <p className="text-gray-400">
                      {subscription.usage}/{subscription.allowance} videos created this month
                    </p>
                  </div>
                  <Badge 
                    variant="outline"
                    className="bg-black border-green-400 text-green-400"
                  >
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* What's Included Section */}
        <div className="mb-12">
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-2 border-accent/30 rounded-2xl">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-light text-center mb-6">
                What's Included with Every Video
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0" />
                  <span className="text-gray-300">
                    4K delivery with multiple formats
                  </span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0" />
                  <span className="text-gray-300">
                    Professional color grading
                  </span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0" />
                  <span className="text-gray-300">Audio mixing & cleanup</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0" />
                  <span className="text-gray-300">
                    Motion graphics & transitions
                  </span>
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
                    ? "border-accent shadow-2xl scale-105 bg-gradient-to-br from-primary/10 to-accent/10"
                    : "border-purple-500 shadow-2xl scale-105 bg-gradient-to-br from-purple-900/20 to-pink-900/20"
                  : "border-gray-700 hover:border-accent/50"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <span
                    className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-lg whitespace-nowrap ${
                      selectedTab === "subscription"
                        ? "bg-accent text-dark"
                        : "bg-purple-500 text-white"
                    }`}
                  >
                    Best Value
                  </span>
                </div>
              )}

              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-light mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-400 mb-4">{plan.description}</p>
                  {selectedTab === "subscription" && (
                    <>
                      <div className="text-sm text-accent font-medium mb-2">
                        {(plan as any).cadence}
                      </div>
                      <div className="text-4xl font-bold text-primary mb-1">
                        {plan.price}
                      </div>
                      <p className="text-sm text-gray-400 mb-2">per video</p>
                      <p className="text-lg font-semibold text-accent">
                        {(plan as any).monthlyTotal}
                      </p>
                    </>
                  )}
                  {selectedTab === "prepaid" && (
                    <>
                      <div className="text-4xl font-bold text-purple-400 mb-1">
                        {plan.price}
                      </div>
                      <p className="text-sm text-gray-400 mb-2">per video</p>
                      <p className="text-lg font-semibold text-purple-300">
                        Total: {(plan as any).totalPrice}
                      </p>
                    </>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check
                        className={`h-5 w-5 mr-3 flex-shrink-0 mt-0.5 ${
                          selectedTab === "subscription"
                            ? "text-accent"
                            : "text-purple-400"
                        }`}
                      />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handlePlanSelect(plan.name)}
                  variant={plan.buttonVariant}
                  disabled={createCheckoutMutation.isPending}
                  className={`w-full py-3 font-semibold transition-all duration-300 ${
                    plan.highlighted
                      ? selectedTab === "subscription"
                        ? "bg-gradient-to-r from-primary to-accent text-dark hover:shadow-lg hover:shadow-accent/25 transform hover:scale-105"
                        : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/25 transform hover:scale-105"
                      : selectedTab === "subscription"
                        ? "bg-cyan-500 text-white hover:bg-cyan-400 border-cyan-400 hover:border-cyan-300"
                        : "bg-purple-600 text-white hover:bg-purple-500 border-purple-500 hover:border-purple-400"
                  }`}
                >
                  {createCheckoutMutation.isPending ? "Processing..." : plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revision Add-on Section */}
        <div id="revision-addon" className="max-w-2xl mx-auto mb-8">
          <Card className="bg-gradient-to-r from-orange-900/20 to-red-900/20 border-2 border-orange-700/50 rounded-2xl">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Plus className="h-6 w-6 text-orange-400" />
                <h3 className="text-2xl font-bold text-light">
                  Revision Add-on
                </h3>
              </div>
              <p className="text-gray-400 mb-4">
                Need changes to your video? Add revisions a-la-carte for any
                plan or package.
              </p>
              <div className="text-3xl font-bold text-orange-400 mb-2">$5</div>
              <p className="text-sm text-gray-400 mb-6">per revision request</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300 max-w-md mx-auto mb-6">
                <div className="flex items-center justify-center md:justify-start">
                  <Check className="h-4 w-4 text-orange-400 mr-2" />
                  Minor tweaks & adjustments
                </div>
                <div className="flex items-center justify-center md:justify-start">
                  <Check className="h-4 w-4 text-orange-400 mr-2" />
                  48-hour turnaround
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Note */}
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            All plans include professional editing, multiple revisions, and dedicated support.
            <br />
            Questions? <span className="text-accent cursor-pointer hover:underline">Contact us</span> for help choosing the right plan.
          </p>
        </div>
      </div>
    </div>
  );
}