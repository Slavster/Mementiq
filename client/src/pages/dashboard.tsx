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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/supabase";
import {
  Plus,
  LogOut,
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Folder,
} from "lucide-react";
import DirectVideoUpload from "@/components/DirectVideoUpload";
import TallyFormStep from "@/components/TallyFormStep";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  verified: boolean;
}

interface Project {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  vimeoFolderId?: string;
  vimeoUserFolderId?: string;
  tallyFormUrl?: string;
  currentUploadSize?: number;
  uploadSizeLimit?: number;
}

// Helper functions for project status
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "draft":
      return "bg-gray-600";
    case "in_progress":
      return "bg-blue-600";
    case "review":
      return "bg-yellow-600";
    case "completed":
      return "bg-green-600";
    case "on_hold":
      return "bg-orange-600";
    case "submitted":
      return "bg-purple-600";
    default:
      return "bg-gray-600";
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "draft":
      return <AlertCircle className="h-3 w-3" />;
    case "in_progress":
      return <Clock className="h-3 w-3" />;
    case "review":
      return <Clock className="h-3 w-3" />;
    case "completed":
      return <CheckCircle className="h-3 w-3" />;
    case "on_hold":
      return <AlertCircle className="h-3 w-3" />;
    case "submitted":
      return <CheckCircle className="h-3 w-3" />;
    default:
      return <AlertCircle className="h-3 w-3" />;
  }
};

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentStep, setCurrentStep] = useState<"upload" | "form">("upload");
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Get user projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: {
      title: string;
      tallyFormUrl?: string;
    }) => {
      const response = await apiRequest("POST", "/api/projects", projectData);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        toast({
          title: "Project created!",
          description: "Your new video project has been created successfully.",
        });
        setShowCreateForm(false);
        setNewProjectTitle("");
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
              <Button
                onClick={handleLogout}
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-black"
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
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-lg">{mappedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <Badge
                    variant={mappedUser.verified ? "default" : "destructive"}
                  >
                    {mappedUser.verified ? "Verified" : "Unverified"}
                  </Badge>
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
              className="bg-accent text-secondary hover:bg-yellow-500 font-semibold"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Video Request
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
                  className="bg-accent text-secondary hover:bg-yellow-500 font-semibold"
                  onClick={() => setShowCreateForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Video Request
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
                          {project.status.replace("_", " ")}
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-400">Created</p>
                        <p className="text-sm">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Last Updated</p>
                        <p className="text-sm">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {project.vimeoFolderId && (
                        <div className="flex items-center gap-2 pt-2">
                          <Folder className="h-4 w-4 text-blue-400" />
                          <span className="text-xs text-blue-400">
                            Upload Ready
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <Button
                        size="sm"
                        className="w-full bg-accent text-secondary hover:bg-yellow-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProject(project);
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Manage & Upload Footage
                      </Button>
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
              Upload and manage video files for this project
            </DialogDescription>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6">
              {/* Project Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <Badge
                    variant="secondary"
                    className={`${getStatusColor(selectedProject.status)} text-white`}
                  >
                    <span className="flex items-center gap-1">
                      {getStatusIcon(selectedProject.status)}
                      {selectedProject.status.replace("_", " ")}
                    </span>
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Video Integration</p>
                  <div className="flex items-center gap-2">
                    {selectedProject.vimeoFolderId ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-green-400">
                          Connected
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm text-yellow-400">
                          Setting up...
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Step Progress */}
              <div className="flex items-center gap-2 mb-6">
                <div
                  className={`flex items-center gap-2 ${currentStep === "upload" ? "text-[#2abdee]" : "text-gray-400"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${currentStep === "upload" ? "bg-[#2abdee] text-white" : "bg-gray-600"}`}
                  >
                    1
                  </div>
                  <span className="font-medium">Upload Footage</span>
                </div>
                <div className="flex-1 h-px bg-gray-600 mx-2" />
                <div
                  className={`flex items-center gap-2 ${currentStep === "form" ? "text-[#2abdee]" : selectedProject.status === "submitted" ? "text-green-400" : "text-gray-400"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${currentStep === "form" ? "bg-[#2abdee] text-white" : selectedProject.status === "submitted" ? "bg-green-600 text-white" : "bg-gray-600"}`}
                  >
                    {selectedProject.status === "submitted" ? "✓" : "2"}
                  </div>
                  <span className="font-medium">Describe Your Dream Edit</span>
                </div>
                <div className="flex-1 h-px bg-gray-600 mx-2" />
                <div
                  className={`flex items-center gap-2 ${selectedProject.status === "submitted" ? "text-green-400" : "text-gray-400"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${selectedProject.status === "submitted" ? "bg-green-600 text-white" : "bg-gray-600"}`}
                  >
                    {selectedProject.status === "submitted" ? "✓" : "3"}
                  </div>
                  <span className="font-medium">Editor is On It!</span>
                </div>
              </div>

              {/* Step Content */}
              {currentStep === "upload" && selectedProject.vimeoFolderId ? (
                <DirectVideoUpload
                  projectId={selectedProject.id}
                  onUploadComplete={() => {
                    // Move to next step
                    setCurrentStep("form");
                    // Refresh project data
                    queryClient.invalidateQueries({ queryKey: ["projects"] });
                  }}
                />
              ) : currentStep === "upload" ? (
                <Card className="bg-yellow-500/10 border-yellow-500/30">
                  <CardContent className="p-6 text-center">
                    <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-yellow-500 mb-2">
                      Setting up video project
                    </h3>
                    <p className="text-gray-400">
                      Your project folder is being created. This may take a few
                      moments. Please refresh or try again shortly.
                    </p>
                  </CardContent>
                </Card>
              ) : currentStep === "form" ? (
                <div className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep("upload")}
                      className="text-white border-gray-600 hover:bg-gray-700"
                    >
                      ← Back to Upload
                    </Button>
                  </div>
                  <TallyFormStep
                    projectId={selectedProject.id}
                    userId={user?.id || ""}
                    onFormComplete={() => {
                      // Refresh project data and show success
                      queryClient.invalidateQueries({ queryKey: ["projects"] });
                      toast({
                        title: "Project Submitted!",
                        description:
                          "Your project request has been successfully submitted.",
                      });
                      // Close dialog after brief delay
                      setTimeout(() => {
                        setSelectedProject(null);
                        setCurrentStep("upload");
                      }, 2000);
                    }}
                  />
                </div>
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
    </div>
  );
}
