import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  CheckCircle,
  ExternalLink,
  Upload,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  DollarSign,
} from "lucide-react";

interface RevisionConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  onRevisionSubmitted: () => void;
}

interface PaymentVerification {
  success: boolean;
  payment: {
    status: string;
    amount: number;
    currency: string;
    stripeStatus: string;
  };
  project: {
    id: number;
    title: string;
    status: string;
    frameioReviewLink?: string;
  };
}

export function RevisionConfirmationModal({
  open,
  onOpenChange,
  sessionId,
  onRevisionSubmitted,
}: RevisionConfirmationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentData, setPaymentData] = useState<PaymentVerification | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Verify payment when modal opens
  useEffect(() => {
    if (open && sessionId && !paymentData) {
      verifyPayment();
    }
  }, [open, sessionId]);

  const verifyPayment = async () => {
    if (!sessionId) return;
    
    setIsVerifying(true);
    try {
      const response = await apiRequest(`/api/stripe/verify-revision-payment/${sessionId}`);
      setPaymentData(response);
      
      if (response.success && response.payment.stripeStatus === 'paid') {
        toast({
          title: "Payment Successful",
          description: `$${(response.payment.amount / 100).toFixed(2)} payment confirmed for revision request.`,
        });
      }
    } catch (error) {
      console.error("Failed to verify payment:", error);
      toast({
        title: "Payment Verification Failed",
        description: "Unable to verify your payment. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Submit revision request mutation
  const submitRevisionMutation = useMutation({
    mutationFn: async () => {
      if (!paymentData?.project.id) {
        throw new Error("No project found");
      }
      
      const response = await apiRequest(
        "POST",
        `/api/projects/${paymentData.project.id}/request-revision`
      );
      return response;
    },
    onSuccess: () => {
      setShowSuccess(true);
      toast({
        title: "Revision Request Submitted",
        description: "Your revision request has been sent to the editor. You'll receive updates via email.",
      });
      
      // Invalidate projects cache to refresh status
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      // Notify parent component
      onRevisionSubmitted();
    },
    onError: (error: any) => {
      console.error("Failed to submit revision request:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit revision request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitRevision = () => {
    submitRevisionMutation.mutate();
  };

  const handleClose = () => {
    setPaymentData(null);
    setShowSuccess(false);
    onOpenChange(false);
  };

  if (!paymentData && !isVerifying) {
    return null;
  }

  // Show success screen after revision is submitted
  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600">
              Revision Request Sent!
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Revision Request Submitted</h3>
              <p className="text-gray-600">
                Your revision request for "<strong>{paymentData?.project.title}</strong>" has been sent to the editor.
              </p>
              <p className="text-sm text-gray-500">
                The project status has been updated to "Revision in Progress". You'll receive email updates when your revised video is ready.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <Button onClick={handleClose} className="w-full">
              Return to Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show verification loading
  if (isVerifying) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying your payment...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-green-600">
            Payment Successful - Ready for Revision
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Confirmation */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Payment Confirmed</h3>
                  <p className="text-sm text-green-700">
                    ${(paymentData?.payment.amount! / 100).toFixed(2)} USD - Revision Request for "{paymentData?.project.title}"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Video Review */}
          {paymentData?.project.frameioReviewLink && (
            <Card className="border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <ExternalLink className="h-5 w-5 text-purple-600 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-purple-800 mb-2">Current Video Review</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Review your current video and leave specific comments about changes needed.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(paymentData.project.frameioReviewLink, "_blank")}
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Video Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-amber-800 mb-3">Important Instructions</h3>
                  <div className="space-y-3 text-sm text-amber-700">
                    <div className="flex items-start gap-2">
                      <Upload className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Upload any new footage</strong> - If you have additional videos or photos to include, upload them to your project folder before submitting.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Add Frame.io comments</strong> - Click "Open Video Review" above and add specific comments with timestamps for each change you want made.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Submit when ready</strong> - Once all new footage is uploaded and comments are added, click "Submit for Revision" below.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-4">
              When you're ready to send your revision request to the editor, click the button below. 
              The project status will be updated to "Revision in Progress".
            </p>
            <Button
              onClick={handleSubmitRevision}
              disabled={submitRevisionMutation.isPending}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3"
              size="lg"
            >
              {submitRevisionMutation.isPending ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-3"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-5 w-5" />
                  Submit for Revision
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}