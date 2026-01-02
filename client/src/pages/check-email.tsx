import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { Mail, Loader2, Clock, AlertCircle, CheckCircle } from "lucide-react";

const INITIAL_COOLDOWN = 60; // Match Supabase default 60s cooldown
const MAX_COOLDOWN = 300;
const BACKOFF_MULTIPLIER = 2;
const STORAGE_KEY = "resend_verification_state";

interface ResendState {
  attempts: number;
  lastAttempt: number;
  currentCooldown: number;
}

function getStoredState(): ResendState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
  }
  return { attempts: 0, lastAttempt: 0, currentCooldown: INITIAL_COOLDOWN };
}

function saveState(state: ResendState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
  }
}

export default function CheckEmailPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  
  const searchParams = new URLSearchParams(searchString);
  const email = searchParams.get("email") || "";
  
  const [isLoading, setIsLoading] = useState(false);
  const [resendState, setResendState] = useState<ResendState>(getStoredState);
  const [countdown, setCountdown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  const calculateRemainingCooldown = useCallback(() => {
    const state = getStoredState();
    if (state.lastAttempt === 0) {
      return INITIAL_COOLDOWN;
    }
    const elapsed = Math.floor((Date.now() - state.lastAttempt) / 1000);
    const remaining = state.currentCooldown - elapsed;
    return remaining > 0 ? remaining : 0;
  }, []);

  useEffect(() => {
    const remaining = calculateRemainingCooldown();
    setCountdown(remaining);
  }, [calculateRemainingCooldown]);

  useEffect(() => {
    if (countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleResendEmail = async () => {
    if (countdown > 0 || isLoading) return;
    
    setIsLoading(true);
    setResendSuccess(false);
    
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.status === 429) {
        toast({
          title: "Too many requests",
          description: "Please wait before trying again.",
          variant: "destructive",
        });
        const serverCooldown = data.retryAfter || 60;
        setCountdown(serverCooldown);
        return;
      }

      setResendSuccess(true);
      toast({
        title: "Email sent",
        description: "If an account exists with this email, a new verification link has been sent.",
      });

      const newState: ResendState = {
        attempts: resendState.attempts + 1,
        lastAttempt: Date.now(),
        currentCooldown: Math.min(
          resendState.currentCooldown * BACKOFF_MULTIPLIER,
          MAX_COOLDOWN
        ),
      };
      setResendState(newState);
      saveState(newState);
      setCountdown(newState.currentCooldown);

    } catch (error: any) {
      toast({
        title: "Request failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-purple-900 to-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-cyan-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription className="mt-2">
            We've sent a verification link to{" "}
            {email ? (
              <span className="font-medium text-foreground">{email}</span>
            ) : (
              "your email address"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 mt-0.5 text-amber-500 flex-shrink-0" />
              <p>
                The verification link is valid for <strong className="text-foreground">1 hour</strong>. 
                Please verify your email within this time.
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="h-5 w-5 mt-0.5 text-cyan-500 flex-shrink-0" />
              <p>
                Don't see the email? Check your <strong className="text-foreground">spam folder</strong> or 
                promotions tab.
              </p>
            </div>
          </div>

          {resendSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">Verification email sent successfully!</p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleResendEmail}
              disabled={countdown > 0 || isLoading || !email}
              className="w-full"
              variant={countdown > 0 ? "outline" : "default"}
              data-testid="button-resend-email"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Resend available in {formatTime(countdown)}
                </>
              ) : (
                "Resend verification email"
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={() => setLocation("/auth")}
              className="w-full"
              data-testid="button-back-to-login"
            >
              Back to login
            </Button>
          </div>

          {!email && (
            <p className="text-xs text-center text-muted-foreground">
              Email address not provided. Please go back and try signing up again.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
