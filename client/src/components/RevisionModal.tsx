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
    <div className="space-y-8">
      {/* Header - Revision specific */}
      <div className="text-center space-y-4">
        <div className="text-6xl">🎬</div>
        <h1 className="text-3xl font-bold text-white">Review Your Video</h1>
        <p className="text-gray-400">Leave detailed feedback for our editors</p>
      </div>

      {/* Main Video Card - Similar to VideoViewingStep */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Video Title */}
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                "{project.title}"
              </h2>
            </div>

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

            {/* Instructions - Revision specific */}
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
      <Card className="bg-gray-800/50 border-gray-600">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Label htmlFor="additional-instructions" className="text-white text-lg">
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
        </CardContent>
      </Card>
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            Request Revisions: {project.title}
          </DialogTitle>
          <DialogDescription>
            Provide detailed feedback and instructions for your video revisions.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center ${step === "instructions" ? "text-cyan-600" : step === "uploads" || step === "confirmation" ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "instructions" ? "bg-cyan-600 text-white" : step === "uploads" || step === "confirmation" ? "bg-green-600 text-white" : "bg-gray-200"}`}
              >
                1
              </div>
              <span className="ml-2 text-sm font-medium">Instructions</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div
              className={`flex items-center ${step === "uploads" ? "text-cyan-600" : step === "confirmation" ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "uploads" ? "bg-cyan-600 text-white" : step === "confirmation" ? "bg-green-600 text-white" : "bg-gray-200"}`}
              >
                2
              </div>
              <span className="ml-2 text-sm font-medium">Assets</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div
              className={`flex items-center ${step === "confirmation" ? "text-cyan-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "confirmation" ? "bg-cyan-600 text-white" : "bg-gray-200"}`}
              >
                3
              </div>
              <span className="ml-2 text-sm font-medium">Confirm</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === "instructions"}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {step !== "confirmation" && (
            <Button
              onClick={handleNext}
              disabled={
                step === "instructions" &&
                !reviewLink &&
                !project.mediaReviewLink
              }
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