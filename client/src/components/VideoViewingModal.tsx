import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VideoViewingStep } from "./VideoViewingStep";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface VideoViewingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: number;
    title: string;
    status: string;
    mediaFolderId?: string;
  };
}

export function VideoViewingModal({
  open,
  onOpenChange,
  project,
}: VideoViewingModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleVideoAccepted = () => {
    queryClient.invalidateQueries({
      queryKey: ["/api/projects"],
    });
    toast({
      title: "Video Accepted!",
      description: "Thank you for your feedback. The project is now complete.",
    });
    onOpenChange(false);
  };

  const handleRevisionRequested = () => {
    queryClient.invalidateQueries({
      queryKey: ["/api/projects"],
    });
    // Close this modal - the user will need to click "Describe Your Revisions" 
    // from the dashboard to start the revision flow
    onOpenChange(false);
    toast({
      title: "Ready for Revision",
      description: "Click 'Describe Your Revisions' on your project card to continue.",
    });
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] bg-gradient-to-br from-secondary via-purple-900 to-primary overflow-y-auto">
        <VideoViewingStep
          project={project}
          onBack={() => onOpenChange(false)}
          onVideoAccepted={handleVideoAccepted}
          onRevisionRequested={handleRevisionRequested}
        />
      </DialogContent>
    </Dialog>
  );
}