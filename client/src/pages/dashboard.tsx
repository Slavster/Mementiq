import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Plus, LogOut, Video, Clock, CheckCircle, AlertCircle } from "lucide-react";

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
  tallyFormUrl?: string;
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await apiRequest('/api/auth/me');
      return response.json();
    },
    retry: false,
    onError: () => {
      setLocation('/auth');
    }
  });

  // Get user projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const response = await apiRequest('/api/projects');
      return response.json();
    },
    enabled: !!userData?.success
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/auth/logout', {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation('/');
      toast({
        title: "Logged out",
        description: "You've been logged out successfully.",
      });
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'review':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'review':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-purple-900 to-primary flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!userData?.success) {
    setLocation('/auth');
    return null;
  }

  const user: User = userData.user;
  const projects: Project[] = projectsData?.projects || [];

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
              <span className="text-white">Welcome, {user.firstName}</span>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-black"
                disabled={logoutMutation.isPending}
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
                  <p className="text-lg font-semibold">{user.firstName} {user.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-lg">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <Badge variant={user.verified ? "default" : "destructive"}>
                    {user.verified ? "Verified" : "Unverified"}
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
              onClick={() => {
                toast({
                  title: "Coming Soon",
                  description: "Project creation will be available in the next phase!",
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>

          {projectsLoading ? (
            <div className="text-white text-center py-8">Loading projects...</div>
          ) : projects.length === 0 ? (
            <Card className="bg-black/20 backdrop-blur-xl border-gray-800/30 text-white">
              <CardContent className="py-16 text-center">
                <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                <p className="text-gray-400 mb-6">
                  Start your first video editing project to get started
                </p>
                <Button 
                  className="bg-accent text-secondary hover:bg-yellow-500 font-semibold"
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "Project creation will be available in the next phase!",
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id} className="bg-black/20 backdrop-blur-xl border-gray-800/30 text-white hover:bg-black/30 transition-all duration-200">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <Badge 
                        variant="secondary" 
                        className={`${getStatusColor(project.status)} text-white`}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(project.status)}
                          {project.status.replace('_', ' ')}
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}