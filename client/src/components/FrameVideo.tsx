import { useEffect, useRef } from "react";
import { useFrameStreamUrl } from "../hooks/useFrameStreamUrl";

interface FrameVideoProps {
  fileId: string;
  prefer?: "proxy" | "original";
  className?: string;
}

export function FrameVideo({ fileId, prefer = "proxy", className = "" }: FrameVideoProps) {
  const { url, kind, loading, error, available, reason } = useFrameStreamUrl(fileId, prefer);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!url) return;

    // If HLS: use hls.js except on Safari (native HLS)
    const isHls = kind === "hls" || url.endsWith(".m3u8");
    if (!isHls) return;

    const el = videoRef.current;
    if (!el) return;

    const canPlayNatively = el.canPlayType("application/vnd.apple.mpegURL") !== "";
    let hls: any;

    (async () => {
      if (canPlayNatively) {
        console.log('Using native HLS support (Safari)');
        el.src = url;
      } else {
        try {
          const { default: Hls } = await import("hls.js");
          if (Hls.isSupported()) {
            console.log('Using hls.js for HLS playback');
            hls = new Hls({ 
              maxBufferLength: 30,
              enableWorker: false,
              lowLatencyMode: true 
            });
            hls.loadSource(url);
            hls.attachMedia(el);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              console.log('HLS manifest parsed successfully');
            });
            
            hls.on(Hls.Events.ERROR, (event: any, data: any) => {
              console.error('HLS error:', data);
              if (data.fatal) {
                console.log('Fatal HLS error, trying direct assignment');
                el.src = url;
              }
            });
          } else {
            console.log('HLS.js not supported, trying direct assignment');
            el.src = url;
          }
        } catch (hlsError) {
          console.error('Failed to load hls.js:', hlsError);
          el.src = url;
        }
      }
    })();

    return () => { 
      if (hls) {
        console.log('Destroying HLS instance');
        hls.destroy(); 
      }
    };
  }, [url, kind]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-100 dark:bg-gray-800 rounded-2xl">
        <div className="text-center space-y-2">
          <div className="animate-spin w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto"></div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">Loading Frame.io video…</div>
        </div>
      </div>
    );
  }
  
  // Handle Frame.io V4 streaming limitations gracefully
  if (available === false || (!url && !error)) {
    return (
      <div className="flex items-center justify-center p-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl">
        <div className="text-center space-y-3">
          <div className="text-yellow-600 dark:text-yellow-400 font-medium">
            Direct streaming not available
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {reason || "Frame.io V4 requires web interface for video playback"}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl">
        <div className="text-center space-y-2">
          <div className="text-red-600 dark:text-red-400 font-medium">Streaming Error</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  // Handle different video formats: HLS, MP4, MOV
  const baseClassName = `w-full rounded-2xl shadow ${className}`;
  
  return (
    <video
      ref={videoRef}
      controls
      playsInline
      className={baseClassName}
      {...(kind !== "hls" ? { src: url } : {})}
    >
      {kind !== "hls" && <source src={url} type={`video/${kind}`} />}
      Your browser does not support the video tag.
    </video>
  );
}