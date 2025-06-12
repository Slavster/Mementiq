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
        description: "Thank you for your interest! We'll be in touch within 24 hours with your free quote.",
      });
      setEmail("");
    },
    onError: (error: any) => {
      const errorMessage = error.message.includes("409") 
        ? "This email is already registered" 
        : error.message.includes("400")
        ? "Please enter a valid email address"
        : "Something went wrong. Please try again.";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
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
    <section id="contact" className="py-20 bg-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Vision?</h2>
        <p className="text-xl text-blue-100 mb-8">
          Join over 500+ businesses that trust VideoForge for their video production needs. Get started with a free consultation and project quote.
        </p>
        
        <Card className="max-w-md mx-auto bg-white/10 border-white/20">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Input 
                  type="email" 
                  placeholder="Enter your business email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 bg-white text-charcoal placeholder-gray-400 border-white/20 focus:border-accent"
                  disabled={emailSignupMutation.isPending}
                />
                <Button 
                  type="submit" 
                  disabled={emailSignupMutation.isPending}
                  className="bg-accent text-white px-8 py-3 font-semibold hover:bg-green-600 transition-colors duration-200 whitespace-nowrap"
                >
                  {emailSignupMutation.isPending ? "Submitting..." : "Get Free Quote"}
                </Button>
              </div>
            </form>
            <p className="text-blue-200 text-sm mt-4">No spam, ever. Unsubscribe anytime.</p>
          </CardContent>
        </Card>

        <div className="flex justify-center items-center space-x-8 mt-12 text-blue-200">
          <div className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            <span className="text-sm">SSL Secured</span>
          </div>
          <div className="flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            <span className="text-sm">Privacy Protected</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            <span className="text-sm">24hr Response</span>
          </div>
        </div>
      </div>
    </section>
  );
}
