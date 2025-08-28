import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Clock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function EmailCaptureSection() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const emailSignupMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", "/api/email-signup", { email });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description:
          "You're all set! We'll keep you updated with our latest news and special offers.",
      });
      setEmail("");
    },
    onError: (error: any) => {
      let errorMessage = "Something went wrong. Please try again.";
      let variant: "destructive" | "default" = "destructive";
      let title = "Error";

      if (error.message.includes("409")) {
        // Extract the actual message from the API response if available
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.message) {
            errorMessage = errorData.message;
            title = "Already Signed Up";
            variant = "default"; // Use default styling for "already signed up" message
          } else {
            errorMessage = "You're already signed up! Check your inbox for updates from us.";
            title = "Already Signed Up";
            variant = "default";
          }
        } catch {
          errorMessage = "You're already signed up! Check your inbox for updates from us.";
          title = "Already Signed Up";
          variant = "default";
        }
      } else if (error.message.includes("400")) {
        errorMessage = "Please enter a valid email address";
      }

      toast({
        title,
        description: errorMessage,
        variant,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    emailSignupMutation.mutate(email);
  };

  return (
    <section
      id="contact"
      className="py-20 bg-gradient-to-br from-primary via-purple-800 to-secondary relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-4xl font-bold text-white mb-4">
          Not Ready to Send Us a Video Yet?
        </h2>
        <p className="text-xl text-gray-300 mb-8">
          No worries! Join our mailing list for product updates, discounts, and
          highlights from our community.
        </p>

        <Card className="max-w-md mx-auto bg-dark-card/80 backdrop-blur-sm border border-gray-600">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 bg-gray-800 text-light placeholder-gray-400 border-gray-600 focus:border-accent"
                  disabled={emailSignupMutation.isPending}
                />
                <Button
                  type="submit"
                  disabled={emailSignupMutation.isPending}
                  className="bg-accent text-secondary px-8 py-3 font-semibold hover:bg-yellow-500 transition-colors duration-200 whitespace-nowrap"
                >
                  {emailSignupMutation.isPending
                    ? "Submitting..."
                    : "Join Mailing List"}
                </Button>
              </div>
            </form>
            <p className="text-gray-400 text-sm mt-4">
              No spam, ever. Unsubscribe anytime.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
