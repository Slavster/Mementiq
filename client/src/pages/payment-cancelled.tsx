import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";
import { useLocation } from "wouter";

export default function PaymentCancelledPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-purple-900 to-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black/20 backdrop-blur-xl border-gray-800/30 text-white">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
          <CardDescription className="text-gray-300">
            Your subscription payment was cancelled. No charges were made to your account.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-400">
            You can try again anytime or return to your dashboard to continue with your current plan.
          </div>
          
          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => setLocation("/subscribe")}
              className="bg-accent text-secondary hover:bg-yellow-500 font-semibold"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button
              onClick={() => setLocation("/dashboard")}
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Need help? Contact support for assistance with your subscription.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}