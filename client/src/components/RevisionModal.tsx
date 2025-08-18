import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { VideoViewingStep } from "@/components/VideoViewingStep";

interface Project {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  mediaReviewLink?: string;
}

interface RevisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  step: "instructions" | "uploads" | "confirmation";
  onStepChange: (step: "instructions" | "uploads" | "confirmation") => void;
}

export function RevisionModal({
  open,
  onOpenChange,
  project,
  step,
  onStepChange,
}: RevisionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Submit revision request mutation
  const submitRevisionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${project!.id}/request-revision`,
        {
          instructions: "Revision feedback provided in Frame.io",
        },
      );
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Revision Request Submitted!",
          description: "Your revision request has been submitted to our editors.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        onOpenChange(false);
        // Reset step for next time
        onStepChange("instructions");
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to submit revision request",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error("Failed to submit revision:", error);
      toast({
        title: "Error",
        description: "Failed to submit revision request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === "instructions") {
      onStepChange("confirmation");
    }
  };

  const handleSubmit = () => {
    submitRevisionMutation.mutate();
  };

  const renderStepContent = () => {
    if (!project) return null;

    switch (step) {
      case "instructions":
        return (
          <div className="space-y-6">
            {/* Revision specific warning */}
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-orange-400 font-semibold">Important: Review Before Submission</p>
                  <p className="text-gray-300 text-sm">
                    Make sure all your revision comments are added directly in Frame.io using the video review link below.
                    Double-check all your feedback before submitting, as you won't be able to edit after submission.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Reuse existing VideoViewingStep */}
            <VideoViewingStep
              project={project}
              onBack={() => {}}
              onVideoAccepted={() => {}}
              onRevisionRequested={() => {}}
            />
          </div>
        );

      case "confirmation":
        return (
          <div className="space-y-6">
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-400 mb-2">
                  Ready to Submit Revision Request?
                </h3>
                <p className="text-gray-300 mb-6">
                  Make sure you've added all your feedback comments in Frame.io before submitting.
                  Your revision request will be sent to our editors immediately.
                </p>
                <Button
                  onClick={handleSubmit}
                  disabled={submitRevisionMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                >
                  {submitRevisionMutation.isPending ? (
                    <>
                      <Clock className="h-5 w-5 mr-2 animate-spin" />
                      Submitting Revision Request...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Submit Revision Request
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center text-white text-xl">
            Request Revisions: {project.title}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Provide detailed feedback and instructions for your video revisions.
          </DialogDescription>
        </DialogHeader>

        {/* Step Progress - Match main project workflow design */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className={`flex items-center gap-2 ${step === "instructions" ? "text-[#2abdee]" : step === "confirmation" ? "text-green-400" : "text-gray-400"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${step === "instructions" ? "bg-[#2abdee] text-white" : step === "confirmation" ? "bg-green-600 text-white" : "bg-gray-600"}`}
            >
              {step === "confirmation" ? "✓" : "1"}
            </div>
            <span className="font-medium text-white">Instructions</span>
          </div>
          <div className="flex-1 h-px bg-gray-600 mx-2" />
          <div
            className={`flex items-center gap-2 text-gray-400`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gray-600`}
            >
              2
            </div>
            <span className="font-medium text-white">Assets (Skipped for Revision)</span>
          </div>
          <div className="flex-1 h-px bg-gray-600 mx-2" />
          <div
            className={`flex items-center gap-2 ${step === "confirmation" ? "text-[#2abdee]" : "text-gray-400"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${step === "confirmation" ? "bg-[#2abdee] text-white" : "bg-gray-600"}`}
            >
              3
            </div>
            <span className="font-medium text-white">Confirm</span>
          </div>
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Buttons - Only show for instructions step */}
        {step === "instructions" && (
          <div className="flex justify-end pt-6 border-t border-gray-700">
            <Button
              onClick={handleNext}
              className="bg-[#2abdee] hover:bg-cyan-600"
            >
              Next
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}