import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Upload,
  CheckCircle,
  Eye,
  AlertTriangle,
  Clock,
  X,
  Check,
} from "lucide-react";
import { FrameioUploadInterface } from "@/components/FrameioUploadInterface";

interface Project {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  mediaReviewLink?: string;
}

type RevisionStep = "video-review" | "upload-footage" | "submit-to-editor" | "video-ready";

interface RevisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  step: "instructions" | "uploads" | "confirmation"; // Keep for backward compatibility
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
  const [currentStep, setCurrentStep] = useState<RevisionStep>("video-review");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showUploadInterface, setShowUploadInterface] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep("video-review");
      setIsSubmitted(false);
      setShowUploadInterface(false);
    }
  }, [open]);

  // Submit revision request mutation
  const submitRevisionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${project!.id}/update-status`,
        {
          status: "revision in progress",
        },
      );
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setIsSubmitted(true);
        toast({
          title: "Revision Request Submitted",
          description: "Your revision instructions have been submitted. We'll start working on them right away!",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        
        // After a short delay, close the modal
        setTimeout(() => {
          onOpenChange(false);
        }, 3000);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to submit revision request",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit revision request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (currentStep === "video-review") {
      setCurrentStep("upload-footage");
    } else if (currentStep === "upload-footage") {
      setCurrentStep("submit-to-editor");
    }
  };

  const handleBack = () => {
    if (!isSubmitted) {
      if (currentStep === "upload-footage") {
        setCurrentStep("video-review");
      } else if (currentStep === "submit-to-editor") {
        setCurrentStep("upload-footage");
      }
    }
  };

  const handleSubmit = () => {
    submitRevisionMutation.mutate();
  };

  if (!project) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case "video-review":
        return (
          <div className="space-y-8">
            {/* Excitement Header - identical to VideoViewingStep */}
            <div className="text-center space-y-4">
              <div className="text-6xl">🎬</div>
              <h1 className="text-3xl font-bold text-white">Review Your Video for Revisions</h1>
            </div>

            {/* Main Video Card - identical structure to VideoViewingStep */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  {/* Main Action Button - uses existing media review link */}
                  <Button
                    onClick={() => {
                      if (project.mediaReviewLink) {
                        window.open(project.mediaReviewLink, "_blank");
                        toast({
                          title: "Opening Frame.io",
                          description: "Your video is opening in Frame.io where you can add revision comments",
                        });
                      } else {
                        toast({
                          title: "Share link not available",
                          description: "The share link for this project is not available. Please contact support.",
                          variant: "destructive",
                        });
                      }
                    }}
                    size="lg"
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-6 text-lg"
                    disabled={!project.mediaReviewLink}
                  >
                    <ExternalLink className="h-5 w-5 mr-3" />
                    Open Video in Frame.io to Add Comments
                  </Button>

                  {/* Instructions text - matching VideoViewingStep style */}
                  <div className="text-gray-400 space-y-4 max-w-2xl mx-auto">
                    <p>
                      Click the button above to open your video in Frame.io. Add comments directly on the timeline to indicate what changes you'd like.
                    </p>
                    <div className="bg-gray-800/50 rounded-lg p-6 text-left space-y-3">
                      <p className="font-semibold text-white">How to add revision comments:</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start">
                          <span className="text-cyan-500 mr-2">•</span>
                          <span>Click on the video timeline where you want changes</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-cyan-500 mr-2">•</span>
                          <span>Type your specific revision instructions</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-cyan-500 mr-2">•</span>
                          <span>Be as detailed as possible about what you want changed</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-cyan-500 mr-2">•</span>
                          <span>You can add multiple comments throughout the video</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "upload-footage":
        return (
          <div className="space-y-6">
            {/* Step Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Step 2: Upload Additional Footage (Optional)
              </h2>
              <p className="text-gray-400">
                If you need to add new footage for your revisions, upload it here
              </p>
            </div>

            {/* Upload Interface */}
            {!showUploadInterface ? (
              <Card className="bg-gray-900/50 border-gray-700">
                <CardContent className="p-8">
                  <div className="text-center space-y-6">
                    <p className="text-gray-400">
                      Do you need to upload additional footage for your revisions?
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button
                        onClick={() => setShowUploadInterface(true)}
                        size="lg"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Upload className="h-5 w-5 mr-2" />
                        Yes, Upload Footage
                      </Button>
                      <Button
                        onClick={handleNext}
                        size="lg"
                        variant="outline"
                        className="text-gray-400 hover:text-white border-gray-600"
                      >
                        No, Continue
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <FrameioUploadInterface
                project={project}
                onComplete={() => {
                  toast({
                    title: "Upload Complete",
                    description: "Your additional footage has been uploaded successfully.",
                  });
                  setShowUploadInterface(false);
                }}
                onCancel={() => setShowUploadInterface(false)}
              />
            )}
          </div>
        );

      case "submit-to-editor":
        return (
          <div className="space-y-6">
            {!isSubmitted ? (
              <>
                {/* Step Title */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Step 3: Submit to Editor
                  </h2>
                  <p className="text-gray-400">
                    Review and confirm your revision request
                  </p>
                </div>

                {/* Confirmation Content */}
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-8 space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        Ready to Submit Your Revision Request?
                      </h3>
                      
                      {/* Checklist */}
                      <div className="bg-gray-800/50 rounded-lg p-6 text-left space-y-3 max-w-2xl mx-auto mb-6">
                        <p className="font-semibold text-white">Before submitting, please confirm:</p>
                        <ul className="space-y-2 text-sm text-gray-400">
                          <li className="flex items-start">
                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                            <span>All revision comments have been added in Frame.io</span>
                          </li>
                          <li className="flex items-start">
                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                            <span>Any additional footage has been uploaded</span>
                          </li>
                          <li className="flex items-start">
                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                            <span>Instructions are clear and specific</span>
                          </li>
                        </ul>
                      </div>

                      {/* Warning */}
                      <div className="bg-orange-900/20 border border-orange-600/30 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                          <AlertTriangle className="h-5 w-5 text-orange-400 mr-2 mt-0.5" />
                          <div className="text-left">
                            <p className="text-orange-400 text-sm">
                              <strong>Important:</strong> Once you submit, this action cannot be undone. 
                              Make sure all your revision instructions and footage are complete.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <Button
                        onClick={handleSubmit}
                        disabled={submitRevisionMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                        size="lg"
                      >
                        {submitRevisionMutation.isPending ? (
                          <>
                            <Clock className="h-5 w-5 mr-2 animate-spin" />
                            Submitting to Editor...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Submit to Editor
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              // "Editor is on it" screen after submission
              <Card className="bg-gray-900/50 border-gray-700">
                <CardContent className="p-12">
                  <div className="text-center space-y-6">
                    <div className="mx-auto w-20 h-20 bg-green-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">
                      Editor is on it!
                    </h2>
                    <p className="text-gray-400 text-lg max-w-md mx-auto">
                      Your revision request has been submitted successfully. Our editors are now working on your changes.
                    </p>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-sm text-gray-400">
                        Project Status: <Badge className="ml-2 bg-yellow-600">Revision in Progress</Badge>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "video-ready":
        return (
          <div className="space-y-6">
            {/* Step Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Step 4: Video is Ready
              </h2>
              <p className="text-gray-400">
                Your revised video is ready for review
              </p>
            </div>

            {/* Placeholder content */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <p className="text-gray-400">
                    This step will be implemented based on your requirements.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white">
            Revision Request for {project?.title}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator - matching existing project stages styling */}
        <div className="flex items-center justify-between mb-8">
          {/* Step 1 - Video Review */}
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
              currentStep === "video-review" ? "bg-cyan-600" :
              ["upload-footage", "submit-to-editor", "video-ready"].includes(currentStep) ? "bg-green-600" :
              "bg-gray-600"
            }`}>
              {["upload-footage", "submit-to-editor", "video-ready"].includes(currentStep) ? "✓" : "1"}
            </div>
            <span className="mt-2 text-xs text-gray-400">Video<br/>Review</span>
          </div>

          <div className="flex-1 h-0.5 bg-gray-600 mx-2 mt-[-1.5rem]" />

          {/* Step 2 - Upload Footage */}
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
              currentStep === "upload-footage" ? "bg-cyan-600" :
              ["submit-to-editor", "video-ready"].includes(currentStep) ? "bg-green-600" :
              "bg-gray-600"
            }`}>
              {["submit-to-editor", "video-ready"].includes(currentStep) ? "✓" : "2"}
            </div>
            <span className="mt-2 text-xs text-gray-400">Upload<br/>Footage</span>
          </div>

          <div className="flex-1 h-0.5 bg-gray-600 mx-2 mt-[-1.5rem]" />

          {/* Step 3 - Submit to Editor */}
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
              currentStep === "submit-to-editor" && !isSubmitted ? "bg-cyan-600" :
              (currentStep === "submit-to-editor" && isSubmitted) || currentStep === "video-ready" ? "bg-green-600" :
              "bg-gray-600"
            }`}>
              {isSubmitted || currentStep === "video-ready" ? "✓" : "3"}
            </div>
            <span className="mt-2 text-xs text-gray-400">Submit to<br/>Editor</span>
          </div>

          <div className="flex-1 h-0.5 bg-gray-600 mx-2 mt-[-1.5rem]" />

          {/* Step 4 - Video Ready */}
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
              currentStep === "video-ready" ? "bg-cyan-600" : "bg-gray-600"
            }`}>
              4
            </div>
            <span className="mt-2 text-xs text-gray-400">Video is Ready!</span>
          </div>
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Buttons */}
        {!isSubmitted && currentStep !== "submit-to-editor" && (
          <div className="flex justify-between pt-6 border-t border-gray-700">
            {currentStep === "video-review" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="text-gray-400 hover:text-white border-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Continue to Next Step
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            ) : currentStep === "upload-footage" ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="text-gray-400 hover:text-white border-gray-600"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Video Review
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Continue to Confirmation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            ) : null}
          </div>
        )}

        {/* Navigation for submit-to-editor step (before submission) */}
        {!isSubmitted && currentStep === "submit-to-editor" && (
          <div className="flex justify-between pt-6 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={handleBack}
              className="text-gray-400 hover:text-white border-gray-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}