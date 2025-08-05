import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, ExternalLink } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ProjectAcceptanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: number;
    title: string;
    status: string;
  };
  downloadLink?: string;
}

export function ProjectAcceptanceModal({ 
  open, 
  onOpenChange, 
  project, 
  downloadLink 
}: ProjectAcceptanceModalProps) {
  const [showThankYou, setShowThankYou] = useState(false);
  const queryClient = useQueryClient();

  const acceptProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${project.id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to accept project');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate projects query to refresh the dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setShowThankYou(true);
    },
  });

  const handleAcceptProject = () => {
    acceptProjectMutation.mutate();
  };

  const handleDownload = () => {
    if (downloadLink) {
      window.open(downloadLink, '_blank');
    }
  };

  const handleClose = () => {
    setShowThankYou(false);
    onOpenChange(false);
  };

  if (showThankYou) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Project Accepted!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Thank you for accepting your video project "{project.title}". 
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Important Reminder:</strong> Please download your video within the next 30 days. 
                After this period, the download link will expire and you'll need to contact support 
                to request a new link.
              </p>
            </div>
            
            {downloadLink && (
              <Button 
                onClick={handleDownload}
                className="w-full"
                size="lg"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Your Video
              </Button>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Your Video</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div>
            <h3 className="font-semibold mb-2">Project: {project.title}</h3>
            <p className="text-sm text-muted-foreground">
              Your video is ready for review! Please download and watch it before accepting.
            </p>
          </div>
          
          {downloadLink && (
            <div className="space-y-3">
              <Button 
                onClick={handleDownload}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Download className="mr-2 h-4 w-4" />
                Download & Review Video
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Download link opens in a new tab
              </p>
            </div>
          )}
          
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">What would you like to do?</p>
            
            <div className="space-y-2">
              <Button 
                onClick={handleAcceptProject}
                disabled={acceptProjectMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {acceptProjectMutation.isPending ? (
                  "Accepting..."
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Accept Final Video
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                size="lg"
                onClick={() => {
                  // Navigate to subscription page with revision addon focus
                  window.location.href = '/subscribe#revision-addon';
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Request Paid Revision
              </Button>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Once you accept the video, the project will be marked as complete. 
              Revisions after acceptance may require additional charges.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}