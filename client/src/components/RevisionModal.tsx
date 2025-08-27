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
  Edit3,
  MessageCircle,
  Info,
} from "lucide-react";
import { FrameioUploadInterface } from "@/components/FrameioUploadInterface";
import type { Project } from "@/../../shared/schema";

type RevisionStep = "video-review" | "upload-footage" | "submit-to-editor";

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
  const [videoFiles, setVideoFiles] = useState<any[]>([]);
  const [videoLoading, setVideoLoading] = useState(true);

  // Reset state when modal opens, or show appropriate state based on project status
  useEffect(() => {
    if (open && project) {
      if (project.status.toLowerCase() === "revision in progress") {
        console.log(
          "🎯 Project already in revision progress, showing confirmation screen",
        );
        setCurrentStep("submit-to-editor");
        setIsSubmitted(true); // Show confirmation state
      } else {
        console.log("🎯 Starting new revision workflow");
        setCurrentStep("video-review");
        setIsSubmitted(false);
      }
      setVideoLoading(true);
    }
  }, [open, project]);

  // Fetch video files for this project - EXACT from VideoViewingStep
  useEffect(() => {
    let mounted = true;

    const fetchVideoFiles = async () => {
      if (!project) return;

      try {
        const files = await apiRequest(`/api/projects/${project.id}/files`);

        if (!mounted) return;

        // Filter for video files only
        const videos = files.filter(
          (file: any) => file.fileType && file.fileType.startsWith("video/"),
        );
        setVideoFiles(videos);
      } catch (error) {
        if (!mounted) return;

        console.error("Failed to fetch video files:", error);
        toast({
          title: "Error",
          description: "Could not load video files",
          variant: "destructive",
        });
      } finally {
        if (mounted) {
          setVideoLoading(false);
        }
      }
    };

    if (open && project) {
      fetchVideoFiles();
    }

    return () => {
      mounted = false;
    };
  }, [open, project, toast]);

  // Submit revision request mutation
  const submitRevisionMutation = useMutation({
    mutationFn: async () => {
      console.log("🔍 Making revision request...");
      try {
        const data = await apiRequest(
          "POST",
          `/api/projects/${project!.id}/request-revision`,
          {},
        );
        console.log("🔍 Response data:", data);
        return data;
      } catch (error) {
        console.error("❌ Error in mutation function:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        setIsSubmitted(true); // This will transform the submit-to-editor step
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });

        // Auto-close modal after showing confirmation
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

  // Helper function from VideoViewingStep
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const primaryVideo = videoFiles[0]; // Use the first video as primary

  const renderStepContent = () => {
    switch (currentStep) {
      case "video-review":
        return (
          <div className="space-y-8">
            {/* Revision Header */}
            <div className="text-center space-y-4">
              <Edit3 className="text-6xl w-16 h-16 mx-auto text-cyan-400" />
              <h1 className="text-3xl font-bold text-white">
                Let us know what needs changing
              </h1>
            </div>

            {/* Main Video Card - EXACT from VideoViewingStep */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  {/* Video Title - EXACT from VideoViewingStep */}
                  {primaryVideo && (
                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold text-white">
                        "{primaryVideo.filename}"
                      </h2>
                    </div>
                  )}

                  {/* Main Action Button - EXACT from VideoViewingStep */}
                  <Button
                    onClick={async () => {
                      try {
                        const response = await apiRequest(
                          `/api/projects/${project.id}/video-share-link`,
                        );

                        if (response.shareUrl) {
                          console.log(
                            "Opening Frame.io public share:",
                            response.shareUrl,
                          );
                          window.open(response.shareUrl, "_blank");
                        } else {
                          throw new Error("No share URL returned");
                        }
                      } catch (error) {
                        console.error("Failed to retrieve share link:", error);

                        toast({
                          title: "Error",
                          description:
                            "Could not retrieve share link. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-lg px-8 py-4 h-auto"
                  >
                    <ExternalLink className="w-6 h-6 mr-3" />
                    Open Video Link
                  </Button>

                  {/* Instructions */}
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-6 text-left space-y-4">
                    <div className="space-y-3 text-gray-300">
                      <p className="flex items-start">
                        <MessageCircle className="w-5 h-5 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                        Clicking the button above will open a new tab where you
                        can review your video. Use comments and annotations to
                        tell us precisely what you want changed.
                      </p>

                      <p className="flex items-start">
                        <Info className="w-5 h-5 text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>Important:</strong> This link will only be
                          available for 30 days, so make sure to submit your
                          revision instructions before then!
                        </span>
                      </p>

                      <p className="flex items-start">
                        <span className="text-2xl mr-2 mt-0.5 flex-shrink-0">🎞️</span>
                        <span>
                          Comment right on the video! Frame-accurate notes,
                          highlights, and annotations. Add links if helpful.
                        </span>
                      </p>

                      <p className="flex items-start">
                        <ExternalLink className="w-5 h-5 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                        <a
                          href="https://support.frame.io/en/articles/1161479-review-links-explained-for-clients"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 underline"
                        >
                          Quick primer on Frame.io review tool
                        </a>
                      </p>
                    </div>
                  </div>

                  {/* Frame.io Instructions */}
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6 text-left">
                    <div className="text-gray-300 space-y-3">
                      <p className="font-semibold text-white">
                        All revision instructions must be left as comments
                        within Frame.io:
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start">
                          <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                          <span>
                            Click directly on the video timeline to add precise
                            comments
                          </span>
                        </li>
                        <li className="flex items-start">
                          <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                          <span>
                            Use drawing tools or emoji to highlight problem
                            areas
                          </span>
                        </li>
                        <li className="flex items-start">
                          <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                          <span>
                            Be specific about the changes you want made
                          </span>
                        </li>
                        <li className="flex items-start">
                          <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                          <span>
                            Comments, annotations, and highlights are saved
                            automatically
                          </span>
                        </li>
                      </ul>

                      <div className="mt-4 space-y-1">
                        <p className="text-sm text-gray-400">
                          Make sure you're done commenting before moving on.
                        </p>
                        <p className="text-sm text-gray-400">
                          The next step will allow you to upload additional
                          footage if needed.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Next Step Button */}
                  <div className="text-center pt-4">
                    <Button
                      onClick={handleNext}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black px-8 py-3"
                      size="lg"
                    >
                      Next: Upload Additional Footage
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
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
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-white">
                  Step 2: Upload Additional Footage (Optional)
                </h2>
                <Button
                  onClick={() => setCurrentStep("video-review")}
                  variant="outline"
                  size="sm"
                  className="bg-black text-white border-gray-600 hover:bg-gray-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
              <p className="text-gray-400">
                If you need to add new footage for your revisions, upload it
                here
              </p>
            </div>

            {/* Direct Upload Interface - same as first video request */}
            <FrameioUploadInterface
              project={project}
              onUploadComplete={() => {
                handleNext();
              }}
              onCancel={() => handleNext()}
              onProjectStatusChange={() => {
                // Optional callback for project status changes
              }}
            />
          </div>
        );

      case "submit-to-editor":
        return (
          <div className="space-y-6">
            {!isSubmitted ? (
              <>
                {/* Step Title */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-bold text-white">
                      Step 3: Submit to Editor
                    </h2>
                    {!isSubmitted && (
                      <Button
                        onClick={() => setCurrentStep("upload-footage")}
                        variant="outline"
                        size="sm"
                        className="bg-black text-white border-gray-600 hover:bg-gray-800"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                    )}
                  </div>
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
                        <p className="font-semibold text-white">
                          Before submitting, please confirm:
                        </p>
                        <ul className="space-y-2 text-sm text-gray-400">
                          <li className="flex items-start">
                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                            <span>
                              All revision comments have been added in Frame.io
                            </span>
                          </li>
                          <li className="flex items-start">
                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                            <span>
                              Any additional footage has been uploaded
                            </span>
                          </li>
                          <li className="flex items-start">
                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                            <span>Instructions are clear and specific</span>
                          </li>
                        </ul>
                      </div>

                      {/* Warning */}
                      <div className="bg-pink-900/20 border border-pink-600/30 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
                        <div className="flex items-start">
                          <AlertTriangle className="h-5 w-5 text-pink-400 mr-2 mt-0.5" />
                          <div className="text-left">
                            <p className="text-pink-400 text-sm">
                              <strong>Important: </strong>
                              Once you submit, you won't be able to add more
                              comments or footage.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <Button
                        onClick={handleSubmit}
                        disabled={submitRevisionMutation.isPending}
                        className="w-full bg-neon-green hover:bg-yellow-400 text-black py-3 transition-colors duration-200"
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
              <div className="space-y-6">
                {/* Step Title - without back button */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Step 3: Submit to Editor
                  </h2>
                  <p className="text-gray-400">
                    Your revision has been submitted
                  </p>
                </div>

                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="p-12">
                    <div className="text-center space-y-6">
                      <div className="mx-auto w-20 h-20 bg-green-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-white" />
                      </div>
                      <h2 className="text-3xl font-bold text-green-400">
                        Editor is on it! 🎬
                      </h2>
                      <p className="text-gray-300 text-lg max-w-md mx-auto">
                        Your revision request has been submitted successfully.
                        Our editors are now working on your changes.
                      </p>

                      {/* Payment Confirmed Section */}
                      <div className="bg-gray-800/50 rounded-lg p-6 max-w-2xl mx-auto text-left">
                        <div className="flex items-center mb-3">
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                            <CheckCircle className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold text-lg">
                              Payment Confirmed
                            </h3>
                            <p className="text-green-400 text-sm">
                              $5.00 revision fee has been processed
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* What happens next section */}
                      <div className="bg-gray-800/50 rounded-lg p-6 max-w-2xl mx-auto text-left">
                        <div className="flex items-center mb-4">
                          <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center mr-3">
                            <Info className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="text-white font-semibold text-lg">
                            What happens next?
                          </h3>
                        </div>
                        <ul className="space-y-3 text-gray-300">
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3 mt-2"></div>
                            <span>
                              The editor will review all your Frame.io comments
                              and highlights
                            </span>
                          </li>
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3 mt-2"></div>
                            <span>
                              They'll make the requested changes to your video
                            </span>
                          </li>
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3 mt-2"></div>
                            <span>
                              You'll receive an email when the revised video is
                              ready
                            </span>
                          </li>
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3 mt-2"></div>
                            <span>
                              You can then access your revised video link right
                              here and let us know what you think
                            </span>
                          </li>
                        </ul>
                      </div>

                      {/* Timeline section */}
                      <div className="bg-gray-800/50 rounded-lg p-6 max-w-2xl mx-auto text-left">
                        <div className="flex items-center mb-4">
                          <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center mr-3">
                            <Clock className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="text-white font-semibold text-lg">
                            Timeline
                          </h3>
                        </div>
                        <p className="text-gray-300">
                          Revisions typically take{" "}
                          <span className="text-white font-semibold">
                            2 - 5 days
                          </span>{" "}
                          to complete, depending on demand and complexity of
                          changes requested.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white">
            Revision Request for {project?.title}
          </DialogTitle>
        </DialogHeader>

        {/* Step Progress - matching upload modal styling */}
        <div className="flex items-center gap-2 mb-6">
          {/* Step 1 - Video Review */}
          <div
            className={`flex items-center gap-2 ${
              currentStep === "video-review"
                ? "text-[#2abdee]"
                : ["upload-footage", "submit-to-editor"].includes(currentStep)
                  ? "text-lime-400"
                  : "text-gray-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                currentStep === "video-review"
                  ? "bg-[#2abdee] text-white"
                  : ["upload-footage", "submit-to-editor"].includes(currentStep)
                    ? "bg-neon-green text-black"
                    : "bg-gray-600"
              }`}
            >
              {["upload-footage", "submit-to-editor", "video-ready"].includes(
                currentStep,
              )
                ? "✓"
                : "1"}
            </div>
            <span className="font-medium">Video Review</span>
          </div>

          <div className="flex-1 h-px bg-gray-600 mx-2" />

          {/* Step 2 - Upload Footage */}
          <div
            className={`flex items-center gap-2 ${
              currentStep === "upload-footage"
                ? "text-[#2abdee]"
                : ["submit-to-editor", "video-ready"].includes(currentStep)
                  ? "text-lime-400"
                  : "text-gray-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                currentStep === "upload-footage"
                  ? "bg-[#2abdee] text-white"
                  : ["submit-to-editor", "video-ready"].includes(currentStep)
                    ? "bg-neon-green text-black"
                    : "bg-gray-600"
              }`}
            >
              {["submit-to-editor", "video-ready"].includes(currentStep)
                ? "✓"
                : "2"}
            </div>
            <span className="font-medium">Upload Footage</span>
          </div>

          <div className="flex-1 h-px bg-gray-600 mx-2" />

          {/* Step 3 - Submit to Editor */}
          <div
            className={`flex items-center gap-2 ${
              currentStep === "submit-to-editor" && !isSubmitted
                ? "text-[#2abdee]"
                : (currentStep === "submit-to-editor" && isSubmitted)
                  ? "text-lime-400"
                  : "text-gray-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                currentStep === "submit-to-editor" && !isSubmitted
                  ? "bg-[#2abdee] text-white"
                  : (currentStep === "submit-to-editor" && isSubmitted)
                    ? "bg-neon-green text-black"
                    : "bg-gray-600"
              }`}
            >
              {isSubmitted ? "✓" : "3"}
            </div>
            <span className="font-medium">Submit to Editor</span>
          </div>

          <div className="flex-1 h-px bg-gray-600 mx-2" />

          {/* Step 4 - Video Ready */}
          <div
            className={`flex items-center gap-2 text-gray-400`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gray-600`}
            >
              4
            </div>
            <span className="font-medium">Video is Ready!</span>
          </div>
        </div>

        {/* Step Content */}
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
}
