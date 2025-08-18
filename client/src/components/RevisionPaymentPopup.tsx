import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  CreditCard,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface RevisionPaymentPopupProps {
  project: any;
  onPaymentComplete: () => void;
  onCancel: () => void;
}

export function RevisionPaymentPopup({
  project,
  onPaymentComplete,
  onCancel,
}: RevisionPaymentPopupProps) {
  const { toast } = useToast();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "checking" | "completed" | "failed">("pending");
  const popupRef = useRef<Window | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Open Stripe checkout in popup
  const openCheckoutPopup = async () => {
    if (!checkoutUrl) {
      await createPaymentSession();
      return;
    }

    // Open popup window
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    popupRef.current = window.open(
      checkoutUrl,
      "stripe_checkout",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (popupRef.current) {
      // Start monitoring for payment completion
      startPaymentMonitoring();
    } else {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site to complete payment.",
        variant: "destructive",
      });
    }
  };

  // Create Stripe payment session
  const createPaymentSession = async () => {
    setIsCreatingSession(true);
    try {
      const response = await apiRequest(
        "POST",
        "/api/stripe/create-revision-session",
        {
          projectId: project.id,
        }
      );

      if (response.success && response.sessionUrl) {
        setSessionId(response.sessionId);
        setCheckoutUrl(response.sessionUrl);

        // Store in localStorage for recovery
        localStorage.setItem(
          "pending_revision_payment",
          JSON.stringify({
            sessionId: response.sessionId,
            projectId: project.id,
            timestamp: Date.now(),
          })
        );

        // Open popup immediately
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        popupRef.current = window.open(
          response.sessionUrl,
          "stripe_checkout",
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
        );

        if (popupRef.current) {
          startPaymentMonitoring();
        } else {
          toast({
            title: "Popup Blocked",
            description: "Please allow popups for this site and click 'Open Payment Window' to continue.",
            variant: "destructive",
          });
        }
      } else {
        throw new Error(response.message || "Failed to create payment session");
      }
    } catch (error: any) {
      console.error("Failed to create payment session:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create payment session",
        variant: "destructive",
      });
      setPaymentStatus("failed");
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Monitor payment status
  const startPaymentMonitoring = () => {
    // Clear any existing interval
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    // Check every 2 seconds
    checkIntervalRef.current = setInterval(async () => {
      // Check if popup is closed
      if (popupRef.current && popupRef.current.closed) {
        // Popup was closed, check payment status one more time
        await checkPaymentStatus();
        stopPaymentMonitoring();
        return;
      }

      // Check payment status
      await checkPaymentStatus();
    }, 2000);
  };

  // Stop monitoring
  const stopPaymentMonitoring = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  };

  // Check payment status with Stripe
  const checkPaymentStatus = async () => {
    if (!sessionId || paymentStatus === "completed") return;

    // Don't change visual status to "checking" - keep it static
    try {
      const response = await apiRequest(`/api/stripe/verify-revision-payment/${sessionId}`);

      if (response.success && response.payment.stripeStatus === 'paid') {
        setPaymentStatus("completed");
        stopPaymentMonitoring();
        
        // Close popup if still open
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }

        // Clear localStorage
        localStorage.removeItem("pending_revision_payment");

        toast({
          title: "Payment Successful!",
          description: "Your revision payment has been processed.",
        });

        // Short delay before proceeding
        setTimeout(() => {
          onPaymentComplete();
        }, 1500);
      }
      // Don't change status back to "pending" - keep it static
    } catch (error) {
      console.error("Failed to check payment status:", error);
      // Don't change status on error - keep it static
    }
  };

  // Check for existing pending payment on mount
  useEffect(() => {
    const pendingPayment = localStorage.getItem("pending_revision_payment");
    if (pendingPayment) {
      try {
        const data = JSON.parse(pendingPayment);
        if (data.projectId === project.id) {
          setSessionId(data.sessionId);
          // Check status immediately
          checkPaymentStatus();
        }
      } catch (e) {
        console.error("Failed to parse pending payment:", e);
      }
    }

    // Create session automatically on mount
    createPaymentSession();

    // Cleanup on unmount
    return () => {
      stopPaymentMonitoring();
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-gray-900 border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/20 animate-in zoom-in-95 fade-in duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-cyan-500" />
            Revision Payment Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment amount */}
          <div className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-lg p-4">
            <p className="text-gray-300 mb-2 font-medium">Amount to pay:</p>
            <p className="text-4xl font-bold text-cyan-400 animate-pulse">$5.00</p>
            <p className="text-sm text-gray-300 mt-1">One-time payment for revision request</p>
          </div>

          {/* Status message - static display */}
          <div className="space-y-4">
            {paymentStatus === "completed" ? (
              <div className="flex items-center gap-3 text-green-400">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Payment Successful!</p>
                  <p className="text-sm text-gray-400">Redirecting to revision form...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-yellow-400">
                  <AlertCircle className="w-6 h-6" />
                  <div>
                    <p className="font-semibold">Complete payment in popup</p>
                    <p className="text-sm text-gray-400">
                      A secure Stripe checkout window has opened. Please complete your payment there.
                    </p>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-cyan-400 font-semibold">💡 What's happening:</p>
                  <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                    <li>A payment window opened in a new tab</li>
                    <li>Complete your $5 payment there</li>
                    <li>This screen will update automatically when done</li>
                  </ol>
                  <p className="text-xs text-gray-400 mt-3">
                    <strong>Popup blocked?</strong> Click "Open Payment Window" above to try again.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {paymentStatus !== "completed" && (
              <>
                <Button
                  onClick={openCheckoutPopup}
                  disabled={isCreatingSession}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {isCreatingSession ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Session...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Payment Window
                    </>
                  )}
                </Button>
                <Button
                  onClick={checkPaymentStatus}
                  disabled={!sessionId}
                  variant="outline"
                  className="border-gray-700 hover:bg-gray-800"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Status
                </Button>
              </>
            )}
            <Button
              onClick={onCancel}
              variant="outline"
              className="border-gray-700 hover:bg-gray-800"
              disabled={paymentStatus === "completed"}
            >
              Cancel
            </Button>
          </div>

          {/* Help text */}
          <p className="text-xs text-gray-500 text-center">
            Having trouble? Make sure popups are enabled for this site.
            Payment is processed securely through Stripe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}