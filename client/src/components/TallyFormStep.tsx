import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface TallyFormStepProps {
  projectId: number;
  userId: string;
  onFormComplete?: () => void;
}

interface TallySubmission {
  id: number;
  projectId: number;
  userId: string;
  tallySubmissionId: string;
  submissionData: string;
  submittedAt: string;
  verifiedAt: string | null;
}

const TallyFormStep: React.FC<TallyFormStepProps> = ({
  projectId,
  userId,
  onFormComplete,
}) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [submissionReceived, setSubmissionReceived] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if form has already been submitted
  const { data: submissionData, isLoading } = useQuery({
    queryKey: ["projects", projectId, "tally-submission"],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}/tally-submission`),
  });

  const hasExistingSubmission = submissionData?.hasSubmission;
  const existingSubmission = submissionData?.submission;

  // Mutation to record form submission
  const recordSubmissionMutation = useMutation({
    mutationFn: async (data: {
      tallySubmissionId: string;
      submissionData: any;
    }) => {
      return apiRequest("POST", `/api/projects/${projectId}/tally-submission`, data);
    },
    onSuccess: () => {
      setSubmissionReceived(true);
      toast({
        title: "Form Submitted Successfully",
        description: "Your project request has been submitted and is now being reviewed.",
      });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      queryClient.invalidateQueries({ 
        queryKey: ["projects", projectId, "tally-submission"] 
      });
      if (onFormComplete) {
        onFormComplete();
      }
    },
    onError: (error: any) => {
      console.error("Form submission error:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "Failed to record form submission",
      });
    },
  });

  // Listen for messages from Tally iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from Tally
      if (!event.origin.includes('tally.so')) {
        return;
      }

      const data = event.data;
      
      // Handle Tally form submission
      if (data.type === 'tally_form_submission') {
        console.log('Tally form submission received:', data);
        
        // Record the submission in our database
        recordSubmissionMutation.mutate({
          tallySubmissionId: data.submissionId || `tally_${Date.now()}`,
          submissionData: data.submission || {}
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [recordSubmissionMutation]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <AlertCircle className="h-4 w-4 animate-spin mr-2" />
            Loading form status...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasExistingSubmission) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Project Request Submitted
          </CardTitle>
          <CardDescription>
            Your project request form has been completed and submitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Form submitted on {new Date(existingSubmission?.submittedAt).toLocaleDateString()}
              {existingSubmission?.verifiedAt && (
                <> and verified on {new Date(existingSubmission.verifiedAt).toLocaleDateString()}</>
              )}
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-gray-600">
            <p><strong>Status:</strong> Submitted</p>
            <p><strong>Submission ID:</strong> {existingSubmission?.tallySubmissionId}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (submissionReceived) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Form Submitted Successfully
          </CardTitle>
          <CardDescription>
            Your project request has been submitted for review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Thank you! Your project details have been recorded and you'll be contacted soon.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Project Request Form
        </CardTitle>
        <CardDescription>
          Complete this form to submit your video editing request. This form is required to proceed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isFormVisible ? (
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Please fill out the project details form to complete your request.
            </p>
            <Button
              onClick={() => setIsFormVisible(true)}
              className="w-full"
              size="lg"
            >
              <FileText className="h-4 w-4 mr-2" />
              Open Project Request Form
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please complete the form below. The form will automatically save when you submit it.
              </AlertDescription>
            </Alert>
            
            {/* Tally Form Embed - Placeholder until you provide the embed code */}
            <div className="border rounded-lg p-4 bg-gray-50 min-h-[400px] flex items-center justify-center">
              <div className="text-center space-y-2">
                <FileText className="h-12 w-12 mx-auto text-gray-400" />
                <p className="text-gray-600">
                  Tally form will be embedded here
                </p>
                <p className="text-sm text-gray-500">
                  Please provide the Tally embed code to display the form
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsFormVisible(false)}
                className="flex-1"
              >
                Close Form
              </Button>
              <Button
                disabled={recordSubmissionMutation.isPending}
                className="flex-1"
                onClick={() => {
                  // This will be triggered by the Tally form submission
                  toast({
                    title: "Submit the form",
                    description: "Please complete and submit the form above.",
                  });
                }}
              >
                {recordSubmissionMutation.isPending ? (
                  <>
                    <AlertCircle className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  "Form will auto-submit"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TallyFormStep;