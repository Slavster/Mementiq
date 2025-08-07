import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
}

export default function FrameioTest() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [oauthUrl, setOauthUrl] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [accessToken, setAccessToken] = useState<string>('');

  const updateTestResult = (name: string, status: TestResult['status'], message: string, data?: any) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.name === name);
      const newResult = { name, status, message, data };
      if (existing) {
        return prev.map(r => r.name === name ? newResult : r);
      }
      return [...prev, newResult];
    });
  };

  const getOAuthUrl = async () => {
    try {
      setIsConnecting(true);
      updateTestResult('OAuth URL Generation', 'pending', 'Generating OAuth URL...');
      
      const response = await fetch('/api/frameio/oauth/url');
      const data = await response.json();
      
      if (data.success) {
        setOauthUrl(data.authUrl);
        updateTestResult('OAuth URL Generation', 'success', 'OAuth URL generated successfully', data);
      } else {
        updateTestResult('OAuth URL Generation', 'error', data.error || 'Failed to generate OAuth URL');
      }
    } catch (error) {
      updateTestResult('OAuth URL Generation', 'error', `Error: ${error}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const testFrameioConnection = async () => {
    try {
      updateTestResult('Frame.io Connection', 'pending', 'Testing connection...');
      
      const response = await fetch('/api/test-frameio-oauth', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        updateTestResult('Frame.io Connection', 'success', 'Connected successfully', data);
      } else {
        updateTestResult('Frame.io Connection', 'error', data.message || 'Connection failed');
      }
    } catch (error) {
      updateTestResult('Frame.io Connection', 'error', `Error: ${error}`);
    }
  };

  const testPhotoUpload = async () => {
    try {
      updateTestResult('Photo Upload', 'pending', 'Testing photo upload...');
      
      const response = await fetch('/api/test-frameio-photo', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        updateTestResult('Photo Upload', 'success', 'Photo upload working', data);
      } else {
        updateTestResult('Photo Upload', 'error', data.message || 'Photo upload failed');
      }
    } catch (error) {
      updateTestResult('Photo Upload', 'error', `Error: ${error}`);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    await getOAuthUrl();
    await testFrameioConnection();
    await testPhotoUpload();
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Frame.io OAuth & Integration Test</h1>
          <p className="text-muted-foreground">
            Test your Frame.io connection, project creation, and asset management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>OAuth Connection</CardTitle>
              <CardDescription>
                Connect to Frame.io using OAuth for full API access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button onClick={getOAuthUrl} disabled={isConnecting} className="w-full">
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Get OAuth URL
                    </>
                  )}
                </Button>
                
                {oauthUrl && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Click to authorize Frame.io access:
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <a href={oauthUrl} target="_blank" rel="noopener noreferrer">
                        Authorize Frame.io
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Tests</CardTitle>
              <CardDescription>
                Test various Frame.io API functionalities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={runAllTests} className="w-full">
                Run All Tests
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={testFrameioConnection} variant="outline" size="sm">
                  Test Connection
                </Button>
                <Button onClick={testPhotoUpload} variant="outline" size="sm">
                  Test Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Results from Frame.io integration tests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{result.name}</span>
                      <Badge variant="secondary" className={getStatusColor(result.status)}>
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer text-blue-600">
                          Show details
                        </summary>
                        <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>OAuth Flow Instructions:</strong>
            <ol className="mt-2 space-y-1 text-sm">
              <li>1. Click "Get OAuth URL" to generate the authorization link</li>
              <li>2. Click "Authorize Frame.io" - this will open Frame.io in a new tab</li>
              <li>3. Log in to Frame.io and authorize the application</li>
              <li>4. Copy the access token from the success page</li>
              <li>5. Add the token as FRAMEIO_API_TOKEN in Replit Secrets</li>
              <li>6. Run the API tests to verify full functionality</li>
            </ol>
            <p className="mt-2 text-sm font-medium">
              Redirect URL configured: <code className="text-xs bg-gray-100 px-1 rounded">
                /api/frameio/oauth/callback
              </code>
            </p>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}