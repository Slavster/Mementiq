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
  X,
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
        return (
          <div className="space-y-6">
            {/* Step Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Step 1: Provide Revision Instructions
              </h2>
              <p className="text-gray-400">
                Review your video and provide detailed feedback for our editors.
              </p>
            </div>

            {/* Main content matching video review screen */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  {reviewLink || project.mediaReviewLink ? (
                    <>
                      {/* Main Action Button - matches video viewing step exactly */}
                      <Button
                        onClick={async () => {
                          try {
                            toast({
                              title: "Creating Share Link",
                              description: "Generating public Frame.io share...",
                            });

                            const response = await apiRequest(
                              `/api/projects/${project.id}/video-share-link`,
                            );

                            if (response.shareUrl) {
                              window.open(response.shareUrl, "_blank");
                              toast({
                                title: "Share Link Created!",
                                description:
                                  "Opening your video in a public Frame.io share (no login required)",
                              });
                            } else {
                              throw new Error("No share URL returned");
                            }
                          } catch (error) {
                            console.error("Failed to create share link:", error);
                            toast({
                              title: "Failed to create share link",
                              description:
                                "Could not generate a public share link. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }}
                        size="lg"
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-6 text-lg"
                      >
                        <ExternalLink className="h-5 w-5 mr-3" />
                        Open Video in Frame.io to Add Comments
                      </Button>

                      {/* Instructions text - matches video viewing step */}
                      <div className="text-gray-400 space-y-4 max-w-2xl mx-auto">
                        <p>
                          Your video is available for viewing and feedback in Frame.io's professional review platform.
                        </p>
                        <div className="bg-gray-800/50 rounded-lg p-6 text-left space-y-3">
                          <p className="font-semibold text-white">In the Frame.io viewer:</p>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start">
                              <span className="text-cyan-500 mr-2">•</span>
                              <span>Click anywhere on the video timeline to leave timestamp-specific comments</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-cyan-500 mr-2">•</span>
                              <span>Be as detailed as possible about what needs to be changed</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-cyan-500 mr-2">•</span>
                              <span>Mention specific elements like text, music, transitions, or pacing</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-cyan-500 mr-2">•</span>
                              <span>Draw on frames to highlight exact areas needing changes</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Error state matching the video viewing step style */}
                      <div className="bg-orange-900/20 border border-orange-600/30 rounded-lg p-6">
                        <div className="flex items-center justify-center text-orange-500 mb-4">
                          <AlertTriangle className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                          Review Link Needed
                        </h3>
                        <p className="text-gray-400 mb-6">
                          We couldn't automatically generate your review link. Please click below to create it manually.
                        </p>
                        <Button
                          onClick={handleGenerateLink}
                          disabled={generateLinkMutation.isPending || isGeneratingLink}
                          size="lg"
                          className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg"
                        >
                          {generateLinkMutation.isPending ? (
                            <>
                              <Clock className="h-5 w-5 mr-3 animate-spin" />
                              Generating Review Link...
                            </>
                          ) : (
                            <>
                              <Eye className="h-5 w-5 mr-3" />
                              Generate Review Link
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
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
            {/* Step Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Step 3: Review & Confirm
              </h2>
              <p className="text-gray-400">
                Review your revision request before submitting to our editors.
              </p>
            </div>

            {/* Main content matching video review screen exactly */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  {/* Main Action Button - same as video viewing/revision instructions */}
                  <Button
                    onClick={async () => {
                      try {
                        toast({
                          title: "Creating Share Link",
                          description: "Generating public Frame.io share...",
                        });

                        const response = await apiRequest(
                          `/api/projects/${project.id}/video-share-link`,
                        );

                        if (response.shareUrl) {
                          window.open(response.shareUrl, "_blank");
                          toast({
                            title: "Share Link Created!",
                            description:
                              "Opening your video in a public Frame.io share (no login required)",
                          });
                        } else {
                          throw new Error("No share URL returned");
                        }
                      } catch (error) {
                        console.error("Failed to create share link:", error);
                        toast({
                          title: "Failed to create share link",
                          description:
                            "Could not generate a public share link. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                    size="lg"
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-6 text-lg"
                  >
                    <ExternalLink className="h-5 w-5 mr-3" />
                    Open Video in Frame.io to Review Comments
                  </Button>

                  {/* Instructions text - exactly matching video viewing step */}
                  <div className="text-gray-400 space-y-4 max-w-2xl mx-auto">
                    <p>
                      Review all the comments and instructions you've added to ensure everything is complete before submitting.
                    </p>
                    <div className="bg-gray-800/50 rounded-lg p-6 text-left space-y-3">
                      <p className="font-semibold text-white">Before submitting, verify:</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start">
                          <span className="text-cyan-500 mr-2">•</span>
                          <span>All necessary comments have been added to the video timeline</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-cyan-500 mr-2">•</span>
                          <span>Any additional footage needed has been uploaded</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-cyan-500 mr-2">•</span>
                          <span>Instructions are clear and specific about desired changes</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-cyan-500 mr-2">•</span>
                          <span>All assets and references are properly marked in Frame.io</span>
                        </li>
                      </ul>
                    </div>
                  </div>
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-gray-800">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            Request Revisions: {project.title}
          </h1>
          <p className="text-gray-400">
            Provide detailed feedback and instructions for your video revisions.
          </p>
        </div>

        {/* Progress Indicator - matching project workflow stages */}
        <div className="flex items-center gap-2 mb-8">
          {/* Stage 1: Footage Upload */}
          <div
            className={`flex items-center gap-2 ${
              step === "uploads" ? "text-[#2abdee]" : "text-green-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                step === "uploads" ? "bg-[#2abdee] text-white" : "bg-green-600 text-white"
              }`}
            >
              {step === "uploads" ? "1" : "✓"}
            </div>
            <span className="font-medium">Footage Upload</span>
          </div>
          
          <div className="flex-1 h-px bg-gray-600 mx-2" />
          
          {/* Stage 2: Instructions */}
          <div
            className={`flex items-center gap-2 ${
              step === "instructions" ? "text-[#2abdee]" : 
              step === "confirmation" ? "text-green-400" : "text-gray-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                step === "instructions" ? "bg-[#2abdee] text-white" : 
                step === "confirmation" ? "bg-green-600 text-white" : "bg-gray-600"
              }`}
            >
              {step === "confirmation" ? "✓" : "2"}
            </div>
            <span className="font-medium">Instructions</span>
          </div>
          
          <div className="flex-1 h-px bg-gray-600 mx-2" />
          
          {/* Stage 3: Confirmation / Video Review */}
          <div
            className={`flex items-center gap-2 ${
              step === "confirmation" ? "text-[#2abdee]" : "text-gray-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                step === "confirmation" ? "bg-[#2abdee] text-white" : "bg-gray-600"
              }`}
            >
              3
            </div>
            <span className="font-medium">Confirmation / Video Review</span>
          </div>
          
          <div className="flex-1 h-px bg-gray-600 mx-2" />
          
          {/* Stage 4: Edit in Progress */}
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-semibold">
              4
            </div>
            <span className="font-medium">Edit in Progress</span>
          </div>
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation/Action Buttons based on step */}
        {step === "instructions" && (
          <div className="flex justify-between pt-6 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white border-gray-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!reviewLink && !project.mediaReviewLink}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {step === "uploads" && (
          <div className="flex justify-between pt-6 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={handleBack}
              className="text-gray-400 hover:text-white border-gray-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {step === "confirmation" && (
          <div className="pt-6 border-t border-gray-700 space-y-4">
            {/* Warning text */}
            <div className="bg-orange-900/20 border border-orange-600/30 rounded-lg p-4">
              <p className="text-orange-400 text-sm">
                ⚠️ Please double-check that all footage has been uploaded and all instructions have been provided in Frame.io before submitting.
              </p>
            </div>
            
            {/* Submit button */}
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
        )}
      </DialogContent>
    </Dialog>
  );
}