import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

interface OAuthStatus {
  success: boolean;
  oauthConfigured: boolean;
  authenticated: boolean;
  authUrl: string | null;
}

export function FrameioOAuthButton() {
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: oauthStatus, isLoading } = useQuery<OAuthStatus>({
    queryKey: ['/api/frameio/oauth-status'],
    refetchInterval: 5000, // Check status every 5 seconds
  });

  const handleConnect = async () => {
    if (!oauthStatus?.authUrl) return;

    try {
      setIsConnecting(true);
      const response = await fetch('/api/auth/frameio');
      const data = await response.json();
      
      if (data.authUrl) {
        console.log('Redirecting to Frame.io OAuth:', data.authUrl);
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('OAuth initiation failed:', error);
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return <Button disabled>Checking Frame.io status...</Button>;
  }

  if (!oauthStatus?.oauthConfigured) {
    return (
      <Button disabled variant="outline">
        Frame.io OAuth not configured
      </Button>
    );
  }

  if (oauthStatus.authenticated) {
    return (
      <Button disabled variant="default" className="bg-green-600 hover:bg-green-700">
        ✓ Frame.io Connected
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleConnect} 
      disabled={isConnecting}
      variant="default"
      className="bg-cyan-600 hover:bg-cyan-700"
    >
      {isConnecting ? 'Connecting to Frame.io...' : 'Connect Frame.io V4'}
    </Button>
  );
}