import { useState } from "react";
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
} from "lucide-react";
import { FrameioUploadInterface } from "@/components/FrameioUploadInterface";
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

interface RevisionVideoReviewStepProps {
  project: Project;
  revisionInstructions: string;
  onInstructionsChange: (instructions: string) => void;
  onBack: () => void;
  onVideoAccepted: () => void;
  onRevisionRequested: () => void;
}

// Component that reuses VideoViewingStep layout but for revision instructions
function RevisionVideoReviewStep({
  project,
  revisionInstructions,
  onInstructionsChange,
}: RevisionVideoReviewStepProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">
          Step 1: Provide Revision Instructions
        </h3>
        <p className="text-gray-400 mb-4">
          Review your video and provide detailed feedback for our editors.
        </p>
      </div>

      {/* Main Video Review Card */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Main Action Button - Reuse existing video share link */}
            <Button
              onClick={async () => {
                try {
                  toast({
                    title: "Opening Review Link",
                    description: "Loading your video for review...",
                  });

                  const response = await apiRequest(
                    `/api/projects/${project.id}/video-share-link`,
                  );

                  if (response.shareUrl) {
                    console.log(
                      "Opening Frame.io review share:",
                      response.shareUrl,
                    );
                    window.open(response.shareUrl, "_blank");

                    toast({
                      title: "Review Link Opened!",
                      description:
                        "You can now review and comment directly on your video",
                    });
                  } else {
                    throw new Error("No share URL returned");
                  }
                } catch (error) {
                  console.error("Failed to create share link:", error);
                  toast({
                    title: "Error",
                    description:
                      "Could not open review link. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-lg px-8 py-4 h-auto"
            >
              <ExternalLink className="w-6 h-6 mr-3" />
              Open Video for Review
            </Button>

            {/* Instructions */}
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-6 text-left space-y-4">
              <div className="space-y-3 text-gray-300">
                <p>
                  ✨ Click above to open your video in review mode where you can{" "}
                  <strong>comment directly on the timeline</strong>.
                </p>

                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-white">
                    🎨 How to Leave Effective Revision Feedback:
                  </p>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Click anywhere on the video timeline to add timestamp-specific comments</li>
                    <li>• Be specific about what needs to change (text, music, transitions, pacing)</li>
                    <li>• Highlight sections that need adjustments</li>
                    <li>• Add reference links or examples if helpful</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Instructions Section */}
      <div className="space-y-2">
        <Label htmlFor="additional-instructions" className="text-white">
          Additional Instructions (Optional)
        </Label>
        <Textarea
          id="additional-instructions"
          placeholder="Add any general feedback or instructions that don't relate to specific timestamps..."
          value={revisionInstructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          className="min-h-[120px] bg-gray-900/50 border-gray-600 text-white placeholder-gray-400"
        />
        <p className="text-sm text-gray-400">
          Use the video review tool above for timestamp-specific feedback, and this field for general notes.
        </p>
      </div>
    </div>
  );
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
  const [reviewLink, setReviewLink] = useState<string>("");
  const [revisionInstructions, setRevisionInstructions] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Generate review link mutation
  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${project!.id}/generate-review-link`,
      );
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setReviewLink(data.reviewLink);
        toast({
          title: "Review Link Generated",
          description:
            "Your review link has been created. Check your email for instructions!",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to generate review link",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate review link. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit revision request mutation
  const submitRevisionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${project!.id}/request-revision`,
        {
          instructions: revisionInstructions,
        },
      );
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Revision Request Submitted",
          description:
            "Your revision instructions have been submitted. We'll start working on them right away!",
        });
        onOpenChange(false);
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
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

  const handleGenerateLink = () => {
    setIsGeneratingLink(true);
    generateLinkMutation.mutate();
  };

  const handleNext = () => {
    if (step === "instructions") {
      onStepChange("uploads");
    } else if (step === "uploads") {
      onStepChange("confirmation");
    }
  };

  const handleBack = () => {
    if (step === "uploads") {
      onStepChange("instructions");
    } else if (step === "confirmation") {
      onStepChange("uploads");
    }
  };

  const handleSubmit = () => {
    if (!revisionInstructions.trim()) {
      toast({
        title: "Instructions Required",
        description: "Please provide revision instructions before submitting.",
        variant: "destructive",
      });
      return;
    }
    submitRevisionMutation.mutate();
  };

  if (!project) return null;

  const renderStepContent = () => {
    switch (step) {
      case "instructions":
        // Reuse VideoViewingStep interface but with revision-specific content
        return (
          <RevisionVideoReviewStep
            project={project}
            revisionInstructions={revisionInstructions}
            onInstructionsChange={setRevisionInstructions}
            onBack={() => {}}
            onVideoAccepted={() => {}}
            onRevisionRequested={() => {}}
          />
        );

      case "uploads":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                Step 2: Upload Additional Assets (Optional)
              </h3>
              <p className="text-gray-600 mb-4">
                Upload any new videos or photos needed for your revisions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Upload New Videos</CardTitle>
                  <CardDescription>
                    Upload any new video footage for your revisions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FrameioUploadInterface
                    project={{
                      id: project.id,
                      title: project.title,
                      status: project.status,
                    }}
                    onUploadComplete={() => {
                      queryClient.invalidateQueries({
                        queryKey: ["/api/projects"],
                      });
                    }}
                    onCancel={() => {
                      // Handle cancel if needed
                    }}
                  />
                </CardContent>
              </Card>

              {/* DirectPhotoUpload component removed */}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800">
                    Optional Step
                  </h4>
                  <p className="text-yellow-700 text-sm">
                    Only upload new assets if they're needed for your revisions.
                    You can skip this step if your feedback only involves
                    editing existing content.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "confirmation":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                Step 3: Confirm Your Revision Request
              </h3>
              <p className="text-gray-600 mb-4">
                Review your submission before sending it to our editors.
              </p>
            </div>

            <Card className="border-cyan-200 bg-cyan-50">
              <CardHeader>
                <CardTitle className="text-cyan-800">
                  Revision Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-medium">Project:</span> {project.title}
                </div>
                <div>
                  <span className="font-medium">Media Platform Comments:</span>
                  <span className="ml-2 text-cyan-600">
                    Left directly on the video timeline
                  </span>
                </div>
                {revisionInstructions && (
                  <div>
                    <span className="font-medium">
                      Additional Instructions:
                    </span>
                    <div className="mt-1 p-2 bg-white rounded border text-sm">
                      {revisionInstructions}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-800">Important</h4>
                  <p className="text-red-700 text-sm">
                    Once you submit these revision instructions, our editors
                    will begin working on your changes. Make sure you've left
                    all necessary feedback on the video before submitting.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitRevisionMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {submitRevisionMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Submitting Instructions...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Revision Instructions
                </>
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

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
            className={`flex items-center gap-2 ${step === "instructions" ? "text-[#2abdee]" : step === "uploads" || step === "confirmation" ? "text-green-400" : "text-gray-400"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${step === "instructions" ? "bg-[#2abdee] text-white" : step === "uploads" || step === "confirmation" ? "bg-green-600 text-white" : "bg-gray-600"}`}
            >
              {step === "uploads" || step === "confirmation" ? "✓" : "1"}
            </div>
            <span className="font-medium text-white">Instructions</span>
          </div>
          <div className="flex-1 h-px bg-gray-600 mx-2" />
          <div
            className={`flex items-center gap-2 ${step === "uploads" ? "text-[#2abdee]" : step === "confirmation" ? "text-green-400" : "text-gray-400"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${step === "uploads" ? "bg-[#2abdee] text-white" : step === "confirmation" ? "bg-green-600 text-white" : "bg-gray-600"}`}
            >
              {step === "confirmation" ? "✓" : "2"}
            </div>
            <span className="font-medium text-white">Assets</span>
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

        {/* Navigation Buttons - Match main workflow style */}
        <div className="flex justify-between pt-6 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === "instructions"}
            className="text-white border-gray-600 hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {step === "confirmation" ? (
            <Button
              onClick={handleSubmit}
              disabled={submitRevisionMutation.isPending}
              className="bg-[#2abdee] hover:bg-cyan-600"
            >
              {submitRevisionMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Submitting Instructions...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Revision Instructions
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-[#2abdee] hover:bg-cyan-600"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}