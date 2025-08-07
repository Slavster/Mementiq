import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface FrameioOAuthButtonProps {
  onSuccess?: (tokenData: any) => void;
  onError?: (error: string) => void;
}

export function FrameioOAuthButton({ onSuccess, onError }: FrameioOAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuth = async () => {
    try {
      setIsLoading(true);
      
      // Get OAuth URL from server
      const response = await fetch('/api/frameio/oauth/url');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get OAuth URL');
      }
      
      // Open OAuth URL in new window
      const oauthWindow = window.open(
        data.authUrl,
        'frameio-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );
      
      if (!oauthWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }
      
      // Monitor for window close or successful OAuth
      const checkClosed = setInterval(() => {
        if (oauthWindow.closed) {
          clearInterval(checkClosed);
          setIsLoading(false);
          onError?.('OAuth window was closed before completion');
        }
      }, 1000);
      
      // Listen for success message from OAuth window
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'frameio-oauth-success') {
          clearInterval(checkClosed);
          oauthWindow.close();
          setIsLoading(false);
          onSuccess?.(event.data.tokenData);
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'frameio-oauth-error') {
          clearInterval(checkClosed);
          oauthWindow.close();
          setIsLoading(false);
          onError?.(event.data.error);
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
    } catch (error) {
      setIsLoading(false);
      onError?.(error instanceof Error ? error.message : 'OAuth failed');
    }
  };

  return (
    <Button 
      onClick={handleOAuth} 
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      <ExternalLink size={16} />
      {isLoading ? 'Connecting...' : 'Connect Frame.io'}
    </Button>
  );
}