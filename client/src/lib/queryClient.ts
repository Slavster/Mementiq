import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from './supabase';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let message;
    
    // Check content type to determine how to parse
    const contentType = res.headers.get('content-type');
    
    try {
      if (contentType && contentType.includes('application/json')) {
        // Parse as JSON
        const errorData = await res.json();
        message = errorData.message || errorData.error || JSON.stringify(errorData);
      } else {
        // Parse as text
        message = await res.text() || res.statusText;
      }
    } catch (e) {
      // If parsing fails entirely, use status text
      console.error("Error parsing response:", e);
      message = res.statusText || `HTTP ${res.status} Error`;
    }
    
    throw new Error(`${res.status}: ${message}`);
  }
}

// Overloaded apiRequest function to handle both old and new signatures
export async function apiRequest(
  urlOrMethod: string,
  urlOrOptions?: string | { method?: string; body?: unknown },
  data?: unknown | undefined,
): Promise<any> {
  let url: string;
  let method: string;
  let body: unknown;

  // Handle new signature: apiRequest(url, options)
  if (typeof urlOrOptions === 'object' && urlOrOptions !== null) {
    url = urlOrMethod;
    method = urlOrOptions.method || 'GET';
    body = urlOrOptions.body;
  }
  // Handle old signature: apiRequest(method, url, data)
  else if (typeof urlOrOptions === 'string') {
    method = urlOrMethod;
    url = urlOrOptions;
    body = data;
  }
  // Handle simple signature: apiRequest(url)
  else {
    url = urlOrMethod;
    method = 'GET';
    body = undefined;
  }

  // Get current Supabase session token
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers: Record<string, string> = {};
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  await throwIfResNotOk(res);
  
  // Only parse JSON if response has content
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }
  
  // Return empty object for successful non-JSON responses
  return {};
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get current Supabase session token
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Only parse JSON if response has content
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    
    // Return empty object for successful non-JSON responses
    return {};
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
