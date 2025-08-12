// React hook to fetch Frame.io streaming URLs
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

type StreamState = {
  url: string;
  kind: "hls" | "mp4" | "mov" | string;
  loading: boolean;
  error?: string;
  available?: boolean;
  reason?: string;
};

export function useFrameStreamUrl(fileId: string, prefer: "proxy" | "original" = "proxy") {
  const [state, setState] = useState<StreamState>({ url: "", kind: "mp4", loading: true });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: undefined }));

    // Use apiRequest to ensure proper authentication
    apiRequest(`/api/files/${fileId}/stream?prefer=${prefer}`)
      .then((json) => {
        if (cancelled) return;
        
        if (json && json.url) {
          // Successful streaming URL
          setState({ 
            url: json.url, 
            kind: json.kind || "mp4", 
            loading: false,
            available: true
          });
        } else if (json && json.available === false) {
          // Frame.io V4 limitation - no direct streaming
          setState({ 
            url: "", 
            kind: "mp4", 
            loading: false,
            available: false,
            reason: json.reason || "Direct streaming not available"
          });
        } else {
          // Other error cases
          setState({ 
            url: "", 
            kind: "mp4", 
            loading: false,
            available: false,
            error: "No streaming URL available"
          });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setState({ 
          url: "", 
          kind: "mp4", 
          loading: false, 
          available: false,
          error: String(e.message || e) 
        });
      });

    return () => { cancelled = true; };
  }, [fileId, prefer]);

  return state;
}