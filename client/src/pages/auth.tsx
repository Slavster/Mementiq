import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface LoginData {
  email: string;
  password: string;
}

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  company?: string;
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loginData, setLoginData] = useState<LoginData>({
    email: "",
    password: ""
  });
  const [signupData, setSignupData] = useState<SignupData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    company: ""
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest('POST', '/api/auth/login', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Welcome back!",
          description: "You've been logged in successfully.",
        });
        setLocation('/dashboard');
      } else {
        toast({
          title: "Login failed",
          description: data.message || "Please check your credentials and try again.",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: "An error occurred during login. Please try again.",
        variant: "destructive"
      });
    }
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupData) => {
      console.log('Sending signup data:', data);
      const response = await apiRequest('POST', '/api/auth/register', data);
      const result = await response.json();
      console.log('Signup response:', result);
      return result;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account before logging in.",
        });
        // Switch to login tab
        const loginTab = document.querySelector('[data-value="login"]') as HTMLElement;
        loginTab?.click();
      } else {
        toast({
          title: "Signup failed",
          description: data.message || "Please try again.",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      console.error('Signup error:', error);
      toast({
        title: "Signup failed", 
        description: `An error occurred during signup: ${error.message || 'Please try again.'}`,
        variant: "destructive"
      });
    }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    signupMutation.mutate(signupData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-purple-900 to-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[#2abdee]">Mementiq</CardTitle>
          <CardDescription>
            Welcome! Please sign in to your account or create a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-accent text-secondary hover:bg-yellow-500 font-semibold"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-firstName">First Name</Label>
                  <Input
                    id="signup-firstName"
                    type="text"
                    placeholder="Enter your first name"
                    value={signupData.firstName}
                    onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-lastName">Last Name</Label>
                  <Input
                    id="signup-lastName"
                    type="text"
                    placeholder="Enter your last name"
                    value={signupData.lastName}
                    onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-company">Company (Optional)</Label>
                  <Input
                    id="signup-company"
                    type="text"
                    placeholder="Enter your company name"
                    value={signupData.company}
                    onChange={(e) => setSignupData({ ...signupData, company: e.target.value })}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-accent text-secondary hover:bg-yellow-500 font-semibold"
                  disabled={signupMutation.isPending}
                >
                  {signupMutation.isPending ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}