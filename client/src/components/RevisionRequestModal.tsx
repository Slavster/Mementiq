import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, ExternalLink } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface RevisionRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Project {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function RevisionRequestModal({ open, onOpenChange }: RevisionRequestModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's completed projects
  const { data: projectsData } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated && open,
  });

  const projects: Project[] = (projectsData as any)?.projects || [];
  const completedProjects = projects.filter(p => 
    ['delivered', 'complete'].includes(p.status.toLowerCase())
  );

  const revisionRequestMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${selectedProjectId}/request-revision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          revisionNotes: revisionNotes.trim()
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to request revision');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setShowThankYou(true);
    },
    onError: (error: any) => {
      toast({
        title: "Request failed",
        description: error.message || "Failed to submit revision request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitRevision = () => {
    if (!selectedProjectId) {
      toast({
        title: "Select a project",
        description: "Please select a project for revision.",
        variant: "destructive",
      });
      return;
    }

    revisionRequestMutation.mutate();
  };

  const handleClose = () => {
    setShowThankYou(false);
    setSelectedProjectId("");
    setRevisionNotes("");
    onOpenChange(false);
  };

  if (showThankYou) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Revision Requested!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Your revision request has been submitted successfully. Our team will review your requirements and get back to you within 24 hours.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>What's next:</strong>
                <br />
                • Our team will contact you about payment ($5 revision fee)
                <br />
                • Once payment is confirmed, editing will begin
                <br />
                • Revised video will be delivered within 48 hours
              </p>
            </div>
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
          <DialogTitle>Request Video Revision</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="h-4 w-4 text-orange-600" />
              <span className="font-semibold text-orange-800">Revision Add-on - $5</span>
            </div>
            <p className="text-sm text-orange-800">
              Minor tweaks and adjustments to your completed video with 48-hour turnaround.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="project-select">Select Project to Revise</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a completed project" />
                </SelectTrigger>
                <SelectContent>
                  {completedProjects.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No completed projects available for revision
                    </div>
                  ) : (
                    completedProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{project.title}</span>
                          <span className="text-xs text-muted-foreground">
                            Status: {project.status} • Completed: {new Date(project.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="revision-notes">Revision Details</Label>
              <Textarea
                id="revision-notes"
                placeholder="Please describe the changes you'd like us to make to your video. Be as specific as possible to ensure we get it right the first time."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional: The more details you provide, the better we can fulfill your request.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Payment Note:</strong> Our team will contact you via email to process the $5 revision fee before beginning work. You'll receive your revised video within 48 hours of payment confirmation.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitRevision}
              disabled={revisionRequestMutation.isPending || !selectedProjectId}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {revisionRequestMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}