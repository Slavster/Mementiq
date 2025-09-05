import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function PaymentSuccessPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Get payment type and project ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const paymentType = urlParams.get('type');
  const projectId = urlParams.get('project_id');
  const isRevisionPayment = paymentType === 'revision' && projectId;

  // Invalidate subscription status on success to refresh data
  useEffect(() => {
    console.log("💳 Payment success page - invalidating subscription queries");
    // Force refetch with longer stale time to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    queryClient.refetchQueries({ queryKey: ["/api/subscription/status"] });
    
    // Also invalidate project data for revision payments
    if (isRevisionPayment) {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  }, [queryClient, isRevisionPayment]);

  // Auto-redirect based on payment type
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const timer = setTimeout(() => {
        setIsRedirecting(true);
        // For revision payments, redirect to the specific project
        if (isRevisionPayment) {
          setLocation(`/dashboard?project=${projectId}`);
        } else {
          // For subscription payments, redirect to dashboard
          setLocation("/dashboard");
        }
      }, isRevisionPayment ? 2000 : 3000); // Shorter delay for revision payments

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, authLoading, setLocation, isRevisionPayment, projectId]);

  // If not authenticated, redirect to auth page
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/auth");
    }
  }, [isAuthenticated, authLoading, setLocation]);

  // Show loading if still checking auth or redirecting
  if (authLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-purple-900 to-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/20 backdrop-blur-xl border-gray-800/30 text-white">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
            <p className="text-gray-300">
              {authLoading ? "Verifying your account..." : 
               isRevisionPayment ? "Redirecting to your project..." : "Redirecting to dashboard..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show different content for revision payments
  if (isRevisionPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-purple-900 to-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/20 backdrop-blur-xl border-gray-800/30 text-white">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Payment Successful!</h2>
            <p className="text-gray-300">
              Redirecting you to your project to finalize revision instructions...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Original subscription payment success content
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-purple-900 to-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black/20 backdrop-blur-xl border-gray-800/30 text-white">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription className="text-gray-300">
            Welcome to your new subscription plan. You're all set to start creating amazing video content.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-400">
            Your subscription is now active and you can create projects according to your plan limits.
          </div>
          
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="text-center">
              <p className="text-green-300 font-medium">What's Next?</p>
              <p className="text-sm text-gray-300 mt-1">
                Head to your dashboard to create your first video project and start working with our team.
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => setLocation("/dashboard")}
            className="w-full bg-accent text-secondary hover:bg-yellow-500 font-semibold"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              You can manage your subscription anytime from the dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}