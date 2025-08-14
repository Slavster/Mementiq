import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { signOut, supabase } from "@/lib/supabase";
import {
  Plus,
  LogOut,
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Folder,
  CreditCard,
  Crown,
  Settings,
  Download,
  Play,
  Eye,
  ExternalLink,
} from "lucide-react";

import TallyFormStep from "@/components/TallyFormStep";
import { ProjectAcceptanceModal } from "@/components/ProjectAcceptanceModal";
import { RevisionModal } from "@/components/RevisionModal";
import { FrameioOAuthButton } from "@/components/FrameioOAuthButton";
import { FrameioUploadInterface } from "@/components/FrameioUploadInterface";
import { VideoViewingStep } from "@/components/VideoViewingStep";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  verified: boolean;
}

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  status: string;
  tier: string;
  productName: string;
  usage: number;
  allowance: number;
  periodStart: string;
  periodEnd: string;
  stripeCustomerId: string;
  hasReachedLimit: boolean;
}

interface Project {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  frameioFolderId?: string;
  frameioUserFolderId?: string;
  tallyFormUrl?: string;
  frameioReviewLink?: string;
  currentUploadSize?: number;
  uploadSizeLimit?: number;
}

// Helper functions for project status
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "draft":
      return "bg-gray-600";
    case "awaiting instructions":
      return "bg-orange-600";
    case "awaiting revision instructions":
      return "bg-orange-600";
    case "edit in progress":
      return "bg-primary";
    case "video is ready":
      return "bg-green-600";
    case "delivered":
      return "bg-green-600";
    case "complete":
      return "bg-emerald-600";
    case "revision in progress":
      return "bg-orange-600";
    default:
      return "bg-gray-600";
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "draft":
      return <AlertCircle className="h-3 w-3" />;
    case "awaiting instructions":
      return <Upload className="h-3 w-3" />;
    case "awaiting revision instructions":
      return <CreditCard className="h-3 w-3" />;
    case "edit in progress":
      return <Video className="h-3 w-3" />;
    case "video is ready":
      return <CheckCircle className="h-3 w-3" />;
    case "delivered":
      return <Download className="h-3 w-3" />;
    case "complete":
      return <CheckCircle className="h-3 w-3" />;
    case "revision in progress":
      return <Clock className="h-3 w-3" />;
    default:
      return <AlertCircle className="h-3 w-3" />;
  }
};

export default function DashboardPage() {
  // 🟣 IMMEDIATE LOGGING: Dashboard component loaded
  console.log(`🟣 DASHBOARD: Component loaded at ${new Date().toISOString()}`);

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentStep, setCurrentStep] = useState<
    "upload" | "form" | "confirmation" | "video-ready"
  >("upload");
  const [acceptanceModalOpen, setAcceptanceModalOpen] = useState(false);
  const [acceptanceProject, setAcceptanceProject] = useState<Project | null>(
    null,
  );
  const [downloadLink, setDownloadLink] = useState<string | undefined>();
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionProject, setRevisionProject] = useState<Project | null>(null);
  const [revisionStep, setRevisionStep] = useState<
    "instructions" | "uploads" | "confirmation"
  >("instructions");
  const [showSendToEditorDialog, setShowSendToEditorDialog] = useState(false);
  const [pendingProject, setPendingProject] = useState<Project | null>(null);
  const [sendToEditorConfirmationStep, setSendToEditorConfirmationStep] =
    useState<1 | 2>(1);
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Handle revision payment success/failure from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const revisionPayment = urlParams.get("revision_payment");

    if (revisionPayment === "success") {
      toast({
        title: "Revision Payment Successful",
        description:
          "Your revision request has been submitted. We'll start working on it right away!",
      });
      // Clean up URL parameters
      window.history.replaceState({}, "", "/dashboard");
      // Refresh project data to show updated status
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    } else if (revisionPayment === "cancelled") {
      toast({
        title: "Revision Payment Cancelled",
        description:
          "Your revision payment was cancelled. You can try again anytime.",
        variant: "destructive",
      });
      // Clean up URL parameters
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [toast, queryClient]);

  // Get user projects - always fetch fresh data to show latest updates
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
    staleTime: 0, // Always consider data stale to ensure fresh timestamps
    gcTime: 0, // Don't cache old data
  });

  // Get subscription status
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
  });

  const subscription: SubscriptionStatus | undefined = (subscriptionData as any)
    ?.subscription;

  // Send to editor mutation
  const sendToEditorMutation = useMutation({
    mutationFn: async (projectId: number) => {
      console.log("🚀 MUTATION: Starting sendToEditor mutation for project", projectId);
      const response = await apiRequest(
        "PATCH",
        `/api/projects/${projectId}/status`,
        {
          status: "edit in progress",
        },
      );
      console.log("🚀 MUTATION: Server response:", response);
      return response;
    },
    onSuccess: (data) => {
      console.log("🎉 MUTATION SUCCESS: onSuccess called with data:", data);
      if (data.success) {
        console.log("🎉 MUTATION SUCCESS: data.success is true, proceeding with updates");
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        toast({
          title: "Project Sent to Editor!",
          description:
            "Your project is now being worked on. Keep an eye on your email for updates.",
          duration: 5000,
        });
        
        // Update the selected project with the new status instead of closing dialog
        if (selectedProject) {
          console.log("🔄 STATE UPDATE: Updating selectedProject status from:", selectedProject.status, "to: Edit in Progress");
          const updatedProject = {
            ...selectedProject,
            status: "Edit in Progress",
            updatedAt: new Date().toISOString()
          };
          setSelectedProject(updatedProject);
          console.log("✅ STATE UPDATE: Updated selectedProject:", updatedProject);
        } else {
          console.error("❌ STATE UPDATE: selectedProject is null/undefined");
        }
        
        setCurrentStep("confirmation");
        setShowSendToEditorDialog(false);
        setPendingProject(null);
        setSendToEditorConfirmationStep(1);
      } else {
        toast({
          title: "Failed to send project",
          description: data.message || "Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to send project",
        description: `An error occurred: ${error.message || "Please try again."}`,
        variant: "destructive",
      });
    },
  });

  // Create project mutation with subscription validation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: {
      title: string;
      tallyFormUrl?: string;
    }) => {
      const response = await apiRequest("POST", "/api/projects", projectData);
      return response; // apiRequest already returns parsed JSON data
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        queryClient.invalidateQueries({
          queryKey: ["/api/subscription/status"],
        });
        toast({
          title: "Project created!",
          description: "Your new video project has been created successfully.",
        });
        setShowCreateForm(false);
        setNewProjectTitle("");
      } else if (data.requiresSubscription) {
        toast({
          title: "Subscription Required",
          description: "You need an active subscription to create projects.",
          variant: "destructive",
        });
        setLocation("/subscribe");
      } else if (data.requiresUpgrade) {
        toast({
          title: "Upgrade Required",
          description: `You've reached your ${data.tier} plan limit (${data.allowance} projects). Upgrade to create more projects.`,
          variant: "destructive",
        });
        setLocation("/subscribe");
      } else {
        toast({
          title: "Failed to create project",
          description: data.message || "Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to create project",
        description: `An error occurred: ${error.message || "Please try again."}`,
        variant: "destructive",
      });
    },
  });

  // Helper function to check if user can create projects
  const canCreateProject = () => {
    if (!subscription) return false;
    if (!subscription.hasActiveSubscription) return false;
    if (subscription.usage >= subscription.allowance) return false;
    return true;
  };

  const handleCreateProject = () => {
    if (!canCreateProject()) {
      if (!subscription?.hasActiveSubscription) {
        toast({
          title: "Subscription Required",
          description: "You need an active subscription to create projects.",
          variant: "destructive",
        });
        setLocation("/subscribe");
      } else if (
        subscription &&
        subscription.hasActiveSubscription &&
        subscription.hasReachedLimit
      ) {
        // Show upgrade popup for users who reached their limit (only if they have active subscription)
        toast({
          title: "Reached your limit? Upgrade your plan for more videos.",
          description: `You've used all ${subscription.allowance} videos in your ${subscription.productName || subscription.tier} plan.`,
          variant: "destructive",
          action: (
            <Button
              size="sm"
              onClick={() => setLocation("/subscribe")}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Upgrade Plan
            </Button>
          ),
        });
        return;
      }
      return;
    }
    setShowCreateForm(true);
  };

  // Handle opening acceptance modal and fetching download link
  const handleAcceptanceModal = async (project: Project) => {
    setAcceptanceProject(project);
    setAcceptanceModalOpen(true);

    // Fetch download link for the project
    try {
      const response = await fetch(`/api/projects/${project.id}/download-link`);
      if (response.ok) {
        const data = await response.json();
        setDownloadLink(data.downloadLink);
      } else {
        console.error("Failed to fetch download link");
        setDownloadLink(undefined);
      }
    } catch (error) {
      console.error("Error fetching download link:", error);
      setDownloadLink(undefined);
    }
  };

  const handleRevisionModal = (project: Project) => {
    setRevisionProject(project);
    setRevisionStep("instructions");
    setRevisionModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        toast({
          title: "Logout failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        queryClient.clear();
        setLocation("/");
        toast({
          title: "Logged out",
          description: "You've been logged out successfully.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-purple-900 to-primary flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will be redirected by useEffect
  }

  const projects: Project[] = (projectsData as any)?.projects || [];

  // Map Supabase user to expected User interface
  const mappedUser: User = {
    id: 0, // Not used for display, kept for interface compatibility
    email: user.email || "",
    firstName:
      user.user_metadata?.firstName ||
      user.user_metadata?.first_name ||
      user.user_metadata?.full_name?.split(" ")[0] ||
      user.user_metadata?.name?.split(" ")[0] ||
      "",
    lastName:
      user.user_metadata?.lastName ||
      user.user_metadata?.last_name ||
      user.user_metadata?.full_name?.split(" ").slice(1).join(" ") ||
      user.user_metadata?.name?.split(" ").slice(1).join(" ") ||
      "",
    company: user.user_metadata?.company || "",
    verified: user.email_confirmed_at !== null,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-purple-900 to-primary">
      {/* Header */}
      <nav className="bg-black/20 backdrop-blur-xl border-b border-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-[#2abdee] text-2xl font-bold">Mementiq</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white">
                Welcome, {mappedUser.firstName}
              </span>
              {subscription && (
                <Button
                  onClick={() =>
                    window.open(
                      "https://billing.stripe.com/p/login/test_4gMdR81Z2fYr6m9aOd6wE00",
                      "_blank",
                    )
                  }
                  variant="outline"
                  className="border-2 border-accent text-accent px-6 py-2 font-semibold hover:bg-accent hover:text-secondary transition-colors duration-200"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Subscription
                </Button>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-2 border-accent text-accent px-6 py-2 font-semibold hover:bg-accent hover:text-secondary transition-colors duration-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info */}
        <div className="mb-8">
          <Card className="bg-black/20 backdrop-blur-xl border-gray-800/30 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">Account Overview</CardTitle>
              <CardDescription className="text-gray-300">
                Manage your video editing projects and account settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Name</p>
                  <p className="text-lg font-semibold">
                    {mappedUser.firstName} {mappedUser.lastName}
                  </p>
                  <div className="mt-2">
                    <p className="text-sm text-gray-400">Account Status</p>
                    <Badge
                      variant={mappedUser.verified ? "default" : "destructive"}
                      className="mt-1"
                    >
                      {mappedUser.verified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-lg">{mappedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Videos Created</p>
                  {subscriptionLoading ? (
                    <div className="animate-pulse">Loading...</div>
                  ) : subscription?.hasActiveSubscription ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="default"
                          className={`${subscription.hasReachedLimit ? "bg-orange-600" : "bg-purple-600"}`}
                        >
                          {subscription.productName ||
                            subscription.tier?.toUpperCase()}
                        </Badge>
                        {subscription.tier === "premium" && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-semibold">
                          {subscription.usage}/{subscription.allowance} Videos
                          Created
                        </p>
                        {subscription.periodEnd && (
                          <p className="text-xs text-gray-400">
                            Resets:{" "}
                            {new Date(
                              subscription.periodEnd,
                            ).toLocaleDateString()}
                          </p>
                        )}
                        {subscription.hasActiveSubscription &&
                          subscription.hasReachedLimit && (
                            <Button
                              size="sm"
                              onClick={() => setLocation("/subscribe")}
                              className="mt-1 bg-orange-600 hover:bg-orange-700"
                            >
                              <Crown className="h-3 w-3 mr-1" />
                              Upgrade
                            </Button>
                          )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Badge variant="destructive">No Active Plan</Badge>
                      <Button
                        size="sm"
                        onClick={() => setLocation("/subscribe")}
                        className="mt-2"
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Subscribe
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white">Your Projects</h2>
            <Button
              className={
                subscription?.hasActiveSubscription &&
                subscription?.hasReachedLimit
                  ? "bg-orange-600 hover:bg-orange-700 font-semibold"
                  : "bg-accent text-secondary hover:bg-yellow-500 font-semibold"
              }
              onClick={handleCreateProject}
            >
              {subscription?.hasActiveSubscription &&
              subscription?.hasReachedLimit ? (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  New Video Request
                </>
              )}
            </Button>
          </div>

          {projectsLoading ? (
            <div className="text-white text-center py-8">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <Card className="bg-black/20 backdrop-blur-xl border-gray-800/30 text-white">
              <CardContent className="py-16 text-center">
                <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Ready to create something amazing?
                </h3>
                <p className="text-gray-400 mb-6">
                  Transform your vision into professional video content. Start
                  your first project and let our expert team bring your ideas to
                  life.
                </p>
                <Button
                  className={
                    subscription?.hasActiveSubscription &&
                    subscription?.hasReachedLimit
                      ? "bg-orange-600 hover:bg-orange-700 font-semibold"
                      : "bg-accent text-secondary hover:bg-yellow-500 font-semibold"
                  }
                  onClick={handleCreateProject}
                >
                  {subscription?.hasActiveSubscription &&
                  subscription?.hasReachedLimit ? (
                    <>
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Create More Videos
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Video Request
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="bg-black/20 backdrop-blur-xl border-gray-800/30 text-white hover:bg-black/30 transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedProject(project)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <Badge
                        variant="secondary"
                        className={`${getStatusColor(project.status)} text-white`}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(project.status)}
                          {project.status
                            .replace("_", " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Created</p>
                          <p className="text-sm">
                            {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Last Updated</p>
                          <p className="text-sm">
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      {project.status.toLowerCase() === "delivered" ? (
                        <Button
                          size="sm"
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptanceModal(project);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review Your Finished Video
                        </Button>
                      ) : project.status.toLowerCase() ===
                        "awaiting revision instructions" ? (
                        <Button
                          size="sm"
                          className="w-full bg-accent text-secondary hover:bg-yellow-500 font-semibold"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevisionModal(project);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Describe Your Revisions
                        </Button>
                      ) : project.status.toLowerCase() === "complete" ? (
                        <div className="space-y-2">
                          <Button
                            size="sm"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={async (e) => {
                              e.stopPropagation();
                              // Use the stored Frame.io review link from the project
                              const shareLink = project.frameioReviewLink;

                              if (shareLink) {
                                window.open(shareLink, "_blank");
                                console.log(
                                  "Opened existing share link:",
                                  shareLink,
                                );
                              } else {
                                // Fallback: Try to get share link via API for older projects
                                try {
                                  const data = await apiRequest(
                                    `/api/projects/${project.id}/video-share-link`,
                                  );
                                  if (data?.shareUrl) {
                                    window.open(data.shareUrl, "_blank");
                                    console.log(
                                      "Opened share link from API:",
                                      data.shareUrl,
                                    );
                                  } else {
                                    throw new Error("No share link available");
                                  }
                                } catch (error) {
                                  console.error(
                                    "Error opening share link:",
                                    error,
                                  );
                                  toast({
                                    title: "Video unavailable",
                                    description:
                                      "Could not access the video. Please try viewing the video from the Review screen first.",
                                    variant: "destructive",
                                  });
                                }
                              }
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Download Final Video
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full bg-accent text-secondary hover:bg-yellow-500"
                          onClick={async (e) => {
                            e.stopPropagation();
                            console.log(
                              `🟡 BUTTON: Manage & Upload Footage clicked for project ${project.id}`,
                            );
                            console.log(
                              `🟡 BUTTON: Project status is: ${project.status}`,
                            );

                            // Ensure Frame.io folder structure exists before opening project
                            try {
                              console.log(`🟡 BUTTON: Getting auth token...`);
                              const token = await supabase.auth.getSession();
                              if (!token.data.session?.access_token) {
                                console.log(
                                  `🔴 BUTTON: No authentication token found`,
                                );
                                toast({
                                  title: "Authentication Error",
                                  description: "Please log in again",
                                  variant: "destructive",
                                });
                                return;
                              }
                              console.log(
                                `🟡 BUTTON: Token found, making API call...`,
                              );

                              // Call folder structure verification endpoint
                              const url = `/api/projects/${project.id}/ensure-folder-structure`;
                              console.log(`🟡 BUTTON: Calling ${url}`);
                              const response = await fetch(url, {
                                method: "POST",
                                headers: {
                                  Authorization: `Bearer ${token.data.session.access_token}`,
                                  "Content-Type": "application/json",
                                },
                              });
                              console.log(
                                `🟡 BUTTON: Response status: ${response.status}`,
                              );

                              const result = await response.json();

                              if (result.success) {
                                if (result.frameioConfigured) {
                                  console.log(
                                    "✅ Frame.io folder structure verified:",
                                    result.folderStructure,
                                  );
                                } else {
                                  console.log(
                                    "⚠️ Frame.io setup needs attention:",
                                    result.error,
                                  );
                                  toast({
                                    title: "Folder Setup",
                                    description:
                                      "Frame.io folder structure verified and ready for uploads",
                                    duration: 3000,
                                  });
                                }
                              } else {
                                console.error(
                                  "❌ Failed to ensure folder structure:",
                                  result.message,
                                );
                                toast({
                                  title: "Setup Warning",
                                  description:
                                    "Could not verify folder structure, but you can still proceed",
                                  variant: "destructive",
                                  duration: 5000,
                                });
                              }
                            } catch (error) {
                              console.error(
                                "Folder structure check failed:",
                                error,
                              );
                              toast({
                                title: "Connection Warning",
                                description:
                                  "Could not verify folder setup, but you can still proceed",
                                variant: "destructive",
                                duration: 5000,
                              });
                            }

                            // Continue with normal flow regardless of folder setup result
                            setSelectedProject(project);
                            // Set the appropriate step based on project status
                            if (
                              project.status.toLowerCase() === "video is ready"
                            ) {
                              setCurrentStep("video-ready");
                            } else if (
                              project.status.toLowerCase() ===
                                "edit in progress" ||
                              project.status.toLowerCase() === "delivered"
                            ) {
                              setCurrentStep("confirmation");
                            } else {
                              setCurrentStep("upload");
                            }
                          }}
                        >
                          {project.status.toLowerCase() === "video is ready" ? (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Review Video
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Manage & Upload Footage
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Project Details Dialog */}
      <Dialog
        open={!!selectedProject}
        onOpenChange={() => {
          setSelectedProject(null);
          setCurrentStep("upload");
        }}
      >
        <DialogContent className="bg-black/95 backdrop-blur-xl border-gray-800/30 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#2abdee] text-xl">
              {selectedProject?.title}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Upload and manage media files for this project
            </DialogDescription>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6">
              {/* Project Info */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Status</span>
                  <Badge
                    variant="secondary"
                    className={`${getStatusColor(selectedProject.status)} text-white`}
                  >
                    <span className="flex items-center gap-1">
                      {getStatusIcon(selectedProject.status)}
                      {selectedProject.status
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </Badge>
                </div>
              </div>

              {/* Step Progress */}
              <div className="flex items-center gap-2 mb-6">
                <div
                  className={`flex items-center gap-2 ${currentStep === "upload" ? "text-[#2abdee]" : currentStep === "form" || currentStep === "confirmation" || selectedProject.status === "Edit in Progress" || selectedProject.status === "Video is Ready" ? "text-green-400" : "text-gray-400"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${currentStep === "upload" ? "bg-[#2abdee] text-white" : currentStep === "form" || currentStep === "confirmation" || selectedProject.status === "Edit in Progress" || selectedProject.status === "Video is Ready" ? "bg-green-600 text-white" : "bg-gray-600"}`}
                  >
                    {currentStep === "form" ||
                    currentStep === "confirmation" ||
                    selectedProject.status === "Edit in Progress" ||
                    selectedProject.status === "Video is Ready"
                      ? "✓"
                      : "1"}
                  </div>
                  <span className="font-medium">Upload Footage</span>
                </div>
                <div className="flex-1 h-px bg-gray-600 mx-2" />
                <div
                  className={`flex items-center gap-2 ${currentStep === "form" ? "text-[#2abdee]" : currentStep === "confirmation" || selectedProject.status === "Edit in Progress" || selectedProject.status === "Video is Ready" ? "text-green-400" : "text-gray-400"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${currentStep === "form" ? "bg-[#2abdee] text-white" : currentStep === "confirmation" || selectedProject.status === "Edit in Progress" || selectedProject.status === "Video is Ready" ? "bg-green-600 text-white" : "bg-gray-600"}`}
                  >
                    {currentStep === "confirmation" ||
                    selectedProject.status === "Edit in Progress" ||
                    selectedProject.status === "Video is Ready"
                      ? "✓"
                      : "2"}
                  </div>
                  <span className="font-medium">Describe Your Dream Edit</span>
                </div>
                <div className="flex-1 h-px bg-gray-600 mx-2" />
                <div
                  className={`flex items-center gap-2 ${currentStep === "confirmation" ? "text-[#2abdee]" : selectedProject.status === "Edit in Progress" || selectedProject.status === "Video is Ready" ? "text-green-400" : "text-gray-400"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${currentStep === "confirmation" ? "bg-[#2abdee] text-white" : selectedProject.status === "Edit in Progress" || selectedProject.status === "Video is Ready" ? "bg-green-600 text-white" : "bg-gray-600"}`}
                  >
                    {selectedProject.status === "Edit in Progress" ||
                    selectedProject.status === "Video is Ready"
                      ? "✓"
                      : "3"}
                  </div>
                  <span className="font-medium">Submit to Editor</span>
                </div>
                <div className="flex-1 h-px bg-gray-600 mx-2" />
                <div
                  className={`flex items-center gap-2 ${currentStep === "video-ready" ? "text-[#2abdee]" : selectedProject.status === "Video is Ready" ? "text-green-400" : "text-gray-400"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${currentStep === "video-ready" ? "bg-[#2abdee] text-white" : selectedProject.status === "Video is Ready" ? "bg-green-600 text-white" : "bg-gray-600"}`}
                  >
                    {selectedProject.status === "Video is Ready" ? "✓" : "4"}
                  </div>
                  <span className="font-medium">Video is Ready!</span>
                </div>
              </div>

              {/* Step Content */}
              {currentStep === "upload" ? (
                <FrameioUploadInterface
                  project={selectedProject}
                  onUploadComplete={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["/api/projects"],
                    });
                    setCurrentStep("form");
                  }}
                  onCancel={() => {
                    setSelectedProject(null);
                    setCurrentStep("upload");
                  }}
                  onProjectStatusChange={() => {
                    // Refresh projects data when status changes from draft to awaiting instructions
                    queryClient.invalidateQueries({
                      queryKey: ["/api/projects"],
                    });
                  }}
                />
              ) : currentStep === "form" ? (
                <TallyFormStep
                  projectId={selectedProject.id}
                  userId={user?.id || ""}
                  backToUploadButton={
                    selectedProject.status.toLowerCase() !==
                      "edit in progress" &&
                    selectedProject.status.toLowerCase() !== "video is ready" &&
                    selectedProject.status.toLowerCase() !== "delivered" &&
                    selectedProject.status.toLowerCase() !== "complete" ? (
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep("upload")}
                        className="text-white border-gray-600 hover:bg-gray-700"
                      >
                        ← Back to Upload
                      </Button>
                    ) : null
                  }
                  onFormComplete={() => {
                    // Move to step 3 instead of closing
                    setCurrentStep("confirmation");
                    queryClient.invalidateQueries({ queryKey: ["projects"] });
                  }}
                />
              ) : currentStep === "confirmation" ? (
                <div className="space-y-4">
                  <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="p-6 text-center">
                      <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-green-400 mb-2">
                        {(() => {
                          console.log("Confirmation screen - selectedProject.status:", selectedProject.status);
                          return selectedProject.status.toLowerCase() === "edit in progress" ? "Project Submitted!" : "Ready to Submit?";
                        })()}
                      </h3>
                      <p className="text-gray-300 mb-6 whitespace-pre-line">
                        {selectedProject.status.toLowerCase() === "edit in progress"
                          ? "Your project is being worked on by an editor 🎉\n You can't upload more footage now, but you can update your instructions if needed."
                          : "Everything looks in order, nice!\n You can send it off to an editor now or upload additional footage / new instructions."}
                      </p>
                      <div className="flex gap-4 justify-center">
                        {selectedProject.status.toLowerCase() === "edit in progress" ? (
                          <Button
                            variant="outline"
                            onClick={() => setCurrentStep("form")}
                            className="text-white border-gray-600 hover:bg-gray-700"
                          >
                            Update Instructions
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => setCurrentStep("upload")}
                              className="text-white border-gray-600 hover:bg-gray-700"
                            >
                              ← Back to Upload
                            </Button>
                            <Button
                              onClick={() => {
                                setPendingProject(selectedProject);
                                setShowSendToEditorDialog(true);
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Send to Editor
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : currentStep === "video-ready" ? (
                <VideoViewingStep
                  project={selectedProject}
                  onBack={() => setCurrentStep("confirmation")}
                  onVideoAccepted={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["/api/projects"],
                    });
                    toast({
                      title: "Video Accepted!",
                      description:
                        "Thank you for your feedback. The project is now complete.",
                    });
                    setSelectedProject(null);
                    setCurrentStep("upload");
                  }}
                  onRevisionRequested={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["/api/projects"],
                    });
                    setCurrentStep("confirmation");
                  }}
                />
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="bg-black/95 backdrop-blur-xl border-gray-800/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-[#2abdee]">
              Create New Video Request
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Start a new video editing project. Give it a descriptive title
              that will help you track its progress.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newProjectTitle.trim()) {
                createProjectMutation.mutate({ title: newProjectTitle.trim() });
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="project-title">Project Title</Label>
              <Input
                id="project-title"
                placeholder="e.g., Product Launch Video, Conference Highlights, etc."
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                className="bg-black/20 border-gray-700 text-white placeholder:text-gray-400"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewProjectTitle("");
                }}
                className="border-gray-700 text-gray-300 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-accent text-secondary hover:bg-yellow-500 font-semibold"
                disabled={
                  createProjectMutation.isPending || !newProjectTitle.trim()
                }
              >
                {createProjectMutation.isPending
                  ? "Creating..."
                  : "Create Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Project Acceptance Modal */}
      <ProjectAcceptanceModal
        open={acceptanceModalOpen && !!acceptanceProject}
        onOpenChange={setAcceptanceModalOpen}
        project={acceptanceProject || { id: 0, title: "", status: "" }}
        downloadLink={downloadLink}
      />

      {/* Revision Modal */}
      <RevisionModal
        open={revisionModalOpen && !!revisionProject}
        onOpenChange={setRevisionModalOpen}
        project={revisionProject}
        step={revisionStep}
        onStepChange={setRevisionStep}
      />

      {/* Send to Editor Confirmation Dialog */}
      <AlertDialog
        open={showSendToEditorDialog}
        onOpenChange={setShowSendToEditorDialog}
      >
        <AlertDialogContent className="bg-black/95 backdrop-blur-xl border-gray-800/30 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">
              ⚠️{" "}
              {sendToEditorConfirmationStep === 1
                ? "Send Project to Editor?"
                : "Final Confirmation Required"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              <div className="space-y-3">
                {sendToEditorConfirmationStep === 1 ? (
                  <>
                    <p>
                      <strong>Important:</strong> Once you send this project to
                      the editor, you will{" "}
                      <strong>
                        no longer be able to upload additional footage
                      </strong>
                      .
                    </p>
                    <p>
                      You'll only be able to edit your project instructions
                      through a new form. Make sure you've uploaded all the
                      footage you need before proceeding.
                    </p>
                    <p className="text-amber-400 font-medium">
                      Sure you're ready to send "{pendingProject?.title}" to the
                      editor?
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-red-400 font-semibold">
                      ⚠️ FINAL WARNING ⚠️
                    </p>
                    <p>
                      This action is <strong>irreversible</strong>. You will{" "}
                      <strong>NOT</strong> be able to upload any more footage to
                      "{pendingProject?.title}" after this point.
                    </p>
                    <p className="text-amber-400 font-medium">
                      Click "CONFIRM - Send to Editor" to proceed, or cancel to
                      go back.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={() => {
                setShowSendToEditorDialog(false);
                setPendingProject(null);
                setSendToEditorConfirmationStep(1);
              }}
            >
              {sendToEditorConfirmationStep === 1
                ? "Cancel - Let me upload more footage"
                : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                sendToEditorConfirmationStep === 1
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
              onClick={() => {
                console.log("🔘 DIALOG BUTTON: Clicked with step:", sendToEditorConfirmationStep);
                if (sendToEditorConfirmationStep === 1) {
                  console.log("🔘 DIALOG BUTTON: Moving to step 2");
                  setSendToEditorConfirmationStep(2);
                } else {
                  if (pendingProject) {
                    console.log("🔘 DIALOG BUTTON: Triggering mutation for project:", pendingProject.id);
                    sendToEditorMutation.mutate(pendingProject.id);
                  } else {
                    console.error("❌ DIALOG BUTTON: No pendingProject available");
                  }
                }
              }}
              disabled={sendToEditorMutation.isPending}
            >
              {sendToEditorMutation.isPending
                ? "Sending..."
                : sendToEditorConfirmationStep === 1
                  ? "Yes, Continue"
                  : "CONFIRM - Send to Editor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
