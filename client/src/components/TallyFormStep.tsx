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
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/projects/${projectId}/tally-submission`);
      return await response.json();
    },
  });

  const hasExistingSubmission = submissionData?.success && submissionData.submission;
  const existingSubmission = submissionData?.success ? submissionData.submission : null;
  
  // Debug logging
  console.log('Submission data:', submissionData);
  console.log('Has existing submission:', hasExistingSubmission);
  console.log('Existing submission:', existingSubmission);

  // Mutation to record form submission
  const recordSubmissionMutation = useMutation({
    mutationFn: async (data: {
      tallySubmissionId: string;
      submissionData: any;
    }) => {
      return apiRequest(
        "POST",
        `/api/projects/${projectId}/tally-submission`,
        data,
      );
    },
    onSuccess: () => {
      setSubmissionReceived(true);
      toast({
        title: "Form Submitted Successfully",
        description:
          "Your project request has been submitted and is now being reviewed.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "tally-submission"],
      });
      
      // Call onFormComplete to automatically close dialog and move to next step
      if (onFormComplete) {
        setTimeout(() => {
          onFormComplete();
        }, 1500); // Brief delay to show success message
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

  // Load Tally script and listen for form submissions
  useEffect(() => {
    // Load Tally embed script
    const script = document.createElement("script");
    script.innerHTML = `
      var d=document,w="https://tally.so/widgets/embed.js",v=function(){"undefined"!=typeof Tally?Tally.loadEmbeds():d.querySelectorAll("iframe[data-tally-src]:not([src])").forEach((function(e){e.src=e.dataset.tallySrc}))};if("undefined"!=typeof Tally)v();else if(d.querySelector('script[src="'+w+'"]')==null){var s=d.createElement("script");s.src=w,s.onload=v,s.onerror=v,d.body.appendChild(s);}
    `;
    document.body.appendChild(script);

    // Listen for messages from Tally iframe
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from Tally
      if (!event.origin.includes("tally.so")) {
        return;
      }

      const data = event.data;
      console.log("Message received from Tally:", data);

      // Handle Tally form submission - check for various possible event types
      if (
        data.type === "tally_form_submission" ||
        data.type === "form_submission" ||
        (data.payload && data.payload.type === "form_submission")
      ) {
        console.log("Tally form submission detected:", data);

        const submissionData = data.payload || data.submission || data;

        // Record the submission in our database
        recordSubmissionMutation.mutate({
          tallySubmissionId:
            submissionData.submissionId ||
            submissionData.responseId ||
            `tally_${Date.now()}_${projectId}`,
          submissionData: submissionData,
        });
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
      // Clean up script
      const scripts = document.querySelectorAll("script");
      scripts.forEach((s) => {
        if (s.innerHTML.includes("tally.so/widgets/embed.js")) {
          s.remove();
        }
      });
    };
  }, [recordSubmissionMutation, userId, projectId]);

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

  if (hasExistingSubmission && !isFormVisible) {
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
              Form submitted on{" "}
              {new Date(existingSubmission?.submittedAt).toLocaleDateString()}
              {existingSubmission?.verifiedAt && (
                <>
                  {" "}
                  and verified on{" "}
                  {new Date(existingSubmission.verifiedAt).toLocaleDateString()}
                </>
              )}
            </AlertDescription>
          </Alert>

          <div className="text-sm text-gray-600">
            <p>
              <strong>Status:</strong> Submitted
            </p>
            <p>
              <strong>Submission ID:</strong>{" "}
              {existingSubmission?.tallySubmissionId}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setIsFormVisible(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Edit Form Responses
            </Button>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Click "Edit Form Responses" to modify your previous submission.
          </p>
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
              Thank you! Your project details have been recorded and you'll be
              contacted soon.
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
          Describe your Dream Edit
        </CardTitle>
        <CardDescription>
          Complete a short form and we'll make it a reality.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isFormVisible ? (
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Please fill in the details and we'll start on your request.
            </p>
            <Button
              onClick={() => setIsFormVisible(true)}
              className="w-full"
              size="lg"
            >
              <FileText className="h-4 w-4 mr-2" />
              Open Request Form
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tally Form Embed */}
            <div className="border rounded-lg overflow-hidden">
              {/* Debug URL generation */}
              <div className="p-2 bg-gray-100 text-xs">
                <p><strong>Has Existing:</strong> {hasExistingSubmission ? 'Yes' : 'No'}</p>
                <p><strong>Submission ID:</strong> {existingSubmission?.tallySubmissionId || 'None'}</p>
                <p><strong>Full Data:</strong> {JSON.stringify(submissionData)}</p>
                <p><strong>URL:</strong> {`https://tally.so/embed/wv854l?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1&userId=${userId}&projectId=${projectId}${hasExistingSubmission && existingSubmission?.tallySubmissionId ? `&tallySubmissionId=${existingSubmission.tallySubmissionId}` : ''}`}</p>
              </div>
              <iframe
                data-tally-src={`https://tally.so/embed/wv854l?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1&userId=${userId}&projectId=${projectId}${hasExistingSubmission && existingSubmission?.tallySubmissionId ? `&tallySubmissionId=${existingSubmission.tallySubmissionId}` : ''}`}
                loading="lazy"
                width="100%"
                height="2072"
                frameBorder="0"
                marginHeight={0}
                marginWidth={0}
                title="Video Project Request Form"
                className="w-full"
              />
            </div>

            {/* Form will automatically submit and close dialog when completed */}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TallyFormStep;
