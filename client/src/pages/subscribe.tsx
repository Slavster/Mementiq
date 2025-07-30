import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Check, ArrowLeft, CreditCard, Zap, Crown } from "lucide-react";

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

interface PricingTier {
  id: string;
  name: string;
  price: number;
  projects: number;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 49,
    projects: 2,
    features: [
      '2 Video Projects per month',
      'Professional editing',
      'Standard turnaround (5-7 days)',
      'Email support',
      'HD (1080p) delivery'
    ],
    icon: <Zap className="h-6 w-6" />
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 129,
    projects: 6,
    features: [
      '6 Video Projects per month',
      'Professional editing',
      'Fast turnaround (3-5 days)',
      'Priority email support',
      'HD (1080p) delivery',
      'Custom thumbnails',
      'Basic motion graphics'
    ],
    icon: <CreditCard className="h-6 w-6" />,
    popular: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 249,
    projects: 12,
    features: [
      '12 Video Projects per month',
      'Professional editing',
      'Express turnaround (1-3 days)',
      'Dedicated support',
      '4K delivery available',
      'Custom thumbnails',
      'Advanced motion graphics',
      'Brand kit integration',
      'Unlimited revisions'
    ],
    icon: <Crown className="h-6 w-6" />
  }
];

export default function Subscribe() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get subscription status
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['/api/subscription/status'],
    queryFn: () => apiRequest("GET", "/api/subscription/status"),
  });

  const subscription: SubscriptionStatus = subscriptionData?.subscription;

  // Create checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: async (tier: string) => {
      const response = await apiRequest("POST", "/api/subscription/create-checkout", { tier });
      return response.json();
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Button
              variant="ghost"
              onClick={() => setLocation("/dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <h1 className="text-4xl font-bold mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select the perfect plan for your video editing needs. All plans include professional editing and fast turnaround times.
            </p>
          </div>

          {/* Current Subscription Status */}
          {subscription?.hasActiveSubscription && (
            <Card className="mb-8 border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-800">
                      Current Plan: {subscription.tier?.toUpperCase()}
                    </h3>
                    <p className="text-green-600">
                      {subscription.usage}/{subscription.allowance} projects used this month
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.id}
                className={`relative ${
                  tier.popular
                    ? "border-primary shadow-lg scale-105"
                    : "border-border"
                } ${
                  subscription?.tier === tier.id
                    ? "border-green-500 bg-green-50"
                    : ""
                }`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    {tier.icon}
                  </div>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      ${tier.price}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </CardDescription>
                  <div className="text-sm text-muted-foreground">
                    {tier.projects} projects per month
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={tier.popular ? "default" : "outline"}
                    disabled={
                      createCheckoutMutation.isPending ||
                      (subscription?.tier === tier.id && subscription?.hasActiveSubscription)
                    }
                    onClick={() => createCheckoutMutation.mutate(tier.id)}
                  >
                    {subscription?.tier === tier.id && subscription?.hasActiveSubscription
                      ? "Current Plan"
                      : createCheckoutMutation.isPending
                      ? "Processing..."
                      : `Choose ${tier.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ or Additional Info */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              All plans include professional video editing, unlimited revisions on first draft, 
              and secure cloud storage. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}