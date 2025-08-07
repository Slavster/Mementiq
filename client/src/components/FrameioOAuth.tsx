import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Key, CheckCircle, AlertCircle } from 'lucide-react';

export function FrameioOAuth() {
  const [loading, setLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleGenerateAuthUrl = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/frameio/oauth/url');
      const data = await response.json();
      
      if (data.success) {
        setAuthUrl(data.authUrl);
      } else {
        setError(data.error || 'Failed to generate OAuth URL');
      }
    } catch (err) {
      setError('Network error generating OAuth URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Frame.io OAuth Setup
        </CardTitle>
        <CardDescription>
          Authorize Frame.io access to create real projects and folders instead of virtual placeholders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-yellow-800 dark:text-yellow-200">
              Current Limitation
            </span>
          </div>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            The current Frame.io API token has limited permissions and cannot create real projects. 
            OAuth authorization is required for full project management capabilities.
          </p>
        </div>

        {/* OAuth Steps */}
        <div className="space-y-3">
          <h4 className="font-medium">Required Steps:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-xs">1</Badge>
              <span>Generate Frame.io OAuth authorization URL</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-xs">2</Badge>
              <span>Authorize the application in Frame.io</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-xs">3</Badge>
              <span>Copy the new access token to Replit Secrets</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-xs">4</Badge>
              <span>Restart the application to use the new token</span>
            </div>
          </div>
        </div>

        {/* Generate Auth URL Button */}
        <div className="space-y-3">
          <Button 
            onClick={handleGenerateAuthUrl} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Generating...' : 'Generate OAuth URL'}
          </Button>

          {/* Show Auth URL */}
          {authUrl && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">
                  Authorization URL Generated
                </span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                Click the link below to authorize Frame.io access:
              </p>
              <a
                href={authUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Authorize Frame.io
              </a>
            </div>
          )}

          {/* Show Error */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800 dark:text-red-200">Error</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* Required Scopes */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Required Permissions:</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">account.read</Badge>
            <Badge variant="secondary">asset.create</Badge>
            <Badge variant="secondary">asset.read</Badge>
            <Badge variant="secondary">project.create</Badge>
            <Badge variant="secondary">project.read</Badge>
            <Badge variant="secondary">offline</Badge>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            These permissions allow creating real Frame.io projects and managing assets
          </p>
        </div>
      </CardContent>
    </Card>
  );
}