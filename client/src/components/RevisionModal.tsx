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
import DirectVideoUpload from "@/components/DirectVideoUpload";
import DirectPhotoUpload from "@/components/DirectPhotoUpload";

interface Project {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  vimeoReviewLink?: string;
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
            "Your Vimeo review link has been created. Check your email for instructions!",
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
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                Step 1: Provide Revision Instructions
              </h3>
              <p className="text-gray-600 mb-4">
                Review your video and provide detailed feedback for our editors.
              </p>
            </div>

            {reviewLink || project.vimeoReviewLink ? (
              <>
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-800 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Review Your Video
                    </CardTitle>
                    <CardDescription className="text-green-700">
                      Click the link below to watch your video in review mode,
                      highlight and leave comments on anything you want changed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() =>
                        window.open(
                          reviewLink || project.vimeoReviewLink,
                          "_blank",
                        )
                      }
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Video in Review Mode
                    </Button>
                  </CardContent>
                </Card>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    💡 How to Leave Effective Feedback:
                  </h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>
                      • Click anywhere on the video timeline to leave
                      timestamp-specific comments
                    </li>
                    <li>
                      • Be as detailed as possible about what needs to be
                      changed
                    </li>
                    <li>
                      • Mention specific elements like text, music, transitions,
                      or pacing
                    </li>
                    <li>
                      • If you have new assets, you can upload them in the next
                      step
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">
                    Additional Instructions (Optional)
                  </Label>
                  <Textarea
                    id="instructions"
                    placeholder="Add any general feedback or instructions that don't relate to specific timestamps..."
                    value={revisionInstructions}
                    onChange={(e) => setRevisionInstructions(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <p className="text-sm text-gray-600">
                    You can leave detailed timestamp comments on Vimeo and use
                    this field for general notes.
                  </p>
                </div>
              </>
            ) : (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-orange-800 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Review Link Needed
                  </CardTitle>
                  <CardDescription className="text-orange-700">
                    We couldn't automatically generate your review link. Please
                    click below to create it manually.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleGenerateLink}
                    disabled={
                      generateLinkMutation.isPending || isGeneratingLink
                    }
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    {generateLinkMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Generating Review Link...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Generate Vimeo Review Link
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
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
                  <DirectVideoUpload
                    projectId={project.id}
                    onUploadComplete={() => {
                      queryClient.invalidateQueries({
                        queryKey: ["/api/projects"],
                      });
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Upload New Photos</CardTitle>
                  <CardDescription>
                    Upload any new images or graphics for your revisions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DirectPhotoUpload
                    projectId={project.id}
                    onUploadComplete={() => {
                      queryClient.invalidateQueries({
                        queryKey: ["/api/projects"],
                      });
                    }}
                  />
                </CardContent>
              </Card>
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

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800">
                  Revision Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-medium">Project:</span> {project.title}
                </div>
                <div>
                  <span className="font-medium">Vimeo Comments:</span>
                  <span className="ml-2 text-blue-600">
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
                    all necessary feedback on the Vimeo video before submitting.
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
              className={`flex items-center ${step === "instructions" ? "text-blue-600" : step === "uploads" || step === "confirmation" ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "instructions" ? "bg-blue-600 text-white" : step === "uploads" || step === "confirmation" ? "bg-green-600 text-white" : "bg-gray-200"}`}
              >
                1
              </div>
              <span className="ml-2 text-sm font-medium">Instructions</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div
              className={`flex items-center ${step === "uploads" ? "text-blue-600" : step === "confirmation" ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "uploads" ? "bg-blue-600 text-white" : step === "confirmation" ? "bg-green-600 text-white" : "bg-gray-200"}`}
              >
                2
              </div>
              <span className="ml-2 text-sm font-medium">Assets</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div
              className={`flex items-center ${step === "confirmation" ? "text-blue-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "confirmation" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
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
                !project.vimeoReviewLink
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
