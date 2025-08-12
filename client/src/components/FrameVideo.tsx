import { useEffect, useRef } from "react";
import { useFrameStreamUrl } from "../hooks/useFrameStreamUrl";

interface FrameVideoProps {
  fileId: string;
  prefer?: "proxy" | "original";
  className?: string;
}

export function FrameVideo({ fileId, prefer = "proxy", className = "" }: FrameVideoProps) {
  const { url, kind, loading, error } = useFrameStreamUrl(fileId, prefer);
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
        <div className="text-gray-500 dark:text-gray-400">Loading video…</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl">
        <div className="text-red-600 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-100 dark:bg-gray-800 rounded-2xl">
        <div className="text-gray-500 dark:text-gray-400">No video URL available</div>
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