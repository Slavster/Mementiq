import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, RefreshCw, ExternalLink, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TokenStatus {
  status: 'connected' | 'expiring_soon' | 'expired' | 'disconnected';
  hasToken: boolean;
  hasRefreshToken: boolean;
  expiresAt: string | null;
  lastRefreshed: string | null;
  daysRemaining: number | null;
}

interface FrameioStatusResponse {
  success: boolean;
  frameio: TokenStatus;
  notificationEmail: string;
}

interface AdminCheckResponse {
  success: boolean;
  isAdmin: boolean;
}

function StatusBadge({ status }: { status: TokenStatus['status'] }) {
  const config = {
    connected: {
      icon: CheckCircle,
      label: 'Connected',
      className: 'bg-green-500/20 text-green-400 border-green-500/30',
    },
    expiring_soon: {
      icon: AlertTriangle,
      label: 'Expiring Soon',
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    },
    expired: {
      icon: XCircle,
      label: 'Expired',
      className: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
    disconnected: {
      icon: XCircle,
      label: 'Disconnected',
      className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${className}`}>
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isReconnecting, setIsReconnecting] = useState(false);

  const { data: adminCheck, isLoading: isCheckingAdmin, error: adminError, isError } = useQuery<AdminCheckResponse>({
    queryKey: ["/api/admin/check"],
    retry: false,
  });

  const { data: statusData, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery<FrameioStatusResponse>({
    queryKey: ["/api/admin/frameio/status"],
    enabled: adminCheck?.isAdmin === true,
    refetchInterval: 60000,
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("/api/admin/frameio/refresh", { method: "POST" }),
    onSuccess: () => {
      toast({
        title: "Token Refreshed",
        description: "The Frame.io token has been refreshed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/frameio/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Refresh Failed",
        description: error?.message || "Token refresh failed. You may need to reconnect.",
        variant: "destructive",
      });
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: () => apiRequest("/api/admin/frameio/reconnect"),
    onSuccess: (data: any) => {
      if (data?.authUrl) {
        setIsReconnecting(true);
        window.location.href = data.authUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Reconnect Failed",
        description: error?.message || "Failed to generate reconnection URL.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (adminError || isError) {
      setLocation("/auth");
      return;
    }
    if (adminCheck && !adminCheck.isAdmin && !isCheckingAdmin) {
      setLocation("/dashboard");
    }
  }, [adminCheck, isCheckingAdmin, adminError, isError, setLocation]);

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-charcoal">Checking access...</div>
      </div>
    );
  }

  if (!adminCheck?.isAdmin) {
    return null;
  }

  const frameioStatus = statusData?.frameio;

  return (
    <div className="min-h-screen bg-dark text-light">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-8">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="mr-4 text-charcoal hover:text-light"
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-accent mr-3" />
            <h1 className="text-3xl font-bold text-light">Admin Settings</h1>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-dark-lighter border border-charcoal/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-light">Frame.io Integration</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchStatus()}
                className="text-charcoal hover:text-light"
                data-testid="button-refresh-status"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {isLoadingStatus ? (
              <div className="text-charcoal">Loading status...</div>
            ) : frameioStatus ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-charcoal mb-1">Status</p>
                    <StatusBadge status={frameioStatus.status} />
                  </div>
                  
                  <div>
                    <p className="text-sm text-charcoal mb-1">Days Remaining</p>
                    <p className="text-lg font-medium text-light" data-testid="text-days-remaining">
                      {frameioStatus.daysRemaining !== null 
                        ? `${frameioStatus.daysRemaining} days`
                        : 'Unknown'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-charcoal mb-1">Token Expires</p>
                    <p className="text-light" data-testid="text-expires-at">
                      {frameioStatus.expiresAt 
                        ? new Date(frameioStatus.expiresAt).toLocaleString()
                        : 'Unknown'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-charcoal mb-1">Has Refresh Token</p>
                    <p className="text-light">
                      {frameioStatus.hasRefreshToken ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-charcoal/30 pt-6">
                  <div className="flex flex-wrap gap-3">
                    {frameioStatus.hasRefreshToken && frameioStatus.status !== 'disconnected' && (
                      <Button
                        onClick={() => refreshMutation.mutate()}
                        disabled={refreshMutation.isPending}
                        className="bg-accent hover:bg-accent/80 text-black font-semibold"
                        data-testid="button-refresh-token"
                      >
                        {refreshMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Token
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => reconnectMutation.mutate()}
                      disabled={reconnectMutation.isPending || isReconnecting}
                      variant={frameioStatus.status === 'disconnected' || frameioStatus.status === 'expired' ? 'default' : 'outline'}
                      className={frameioStatus.status === 'disconnected' || frameioStatus.status === 'expired' 
                        ? 'bg-accent hover:bg-accent/80 text-black font-semibold' 
                        : 'border-charcoal/50 text-charcoal hover:text-light'}
                      data-testid="button-reconnect"
                    >
                      {reconnectMutation.isPending || isReconnecting ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {frameioStatus.status === 'disconnected' || frameioStatus.status === 'expired' 
                            ? 'Connect Frame.io' 
                            : 'Reconnect Frame.io'}
                        </>
                      )}
                    </Button>
                  </div>

                  {(frameioStatus.status === 'expired' || frameioStatus.status === 'disconnected') && (
                    <p className="mt-4 text-sm text-yellow-400">
                      File uploads are currently unavailable. Please reconnect Frame.io to restore functionality.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-charcoal">Unable to load status</div>
            )}
          </div>

          <div className="bg-dark-lighter border border-charcoal/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-light mb-4">Notifications</h2>
            <div>
              <p className="text-sm text-charcoal mb-1">Alert Email</p>
              <p className="text-light" data-testid="text-notification-email">
                {statusData?.notificationEmail || 'Not configured'}
              </p>
              <p className="text-xs text-charcoal mt-2">
                You will receive email alerts when the Frame.io token is about to expire or needs attention.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
