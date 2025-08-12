// React hook to fetch Frame.io streaming URLs
import { useEffect, useState } from "react";

type StreamState = {
  url: string;
  kind: "hls" | "mp4" | string;
  loading: boolean;
  error?: string;
};

export function useFrameStreamUrl(fileId: string, prefer: "proxy" | "original" = "proxy") {
  const [state, setState] = useState<StreamState>({ url: "", kind: "mp4", loading: true });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: undefined }));

    fetch(`/api/files/${fileId}/stream?prefer=${prefer}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        setState({ url: json.url || "", kind: json.kind || "mp4", loading: false });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({ url: "", kind: "mp4", loading: false, error: String(e.message || e) });
      });

    return () => { cancelled = true; };
  }, [fileId, prefer]);

  return state;
}