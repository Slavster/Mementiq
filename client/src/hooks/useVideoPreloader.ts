import { useEffect, useRef, useState } from 'react';

interface VideoPreloadState {
  [url: string]: {
    status: 'idle' | 'loading' | 'ready' | 'error';
    preloadLevel: 'none' | 'metadata' | 'auto';
    lastActivity: number;
  };
}

export function useVideoPreloader() {
  const [preloadState, setPreloadState] = useState<VideoPreloadState>({});
  const videoElements = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  // Preload video metadata (duration, dimensions - very lightweight)
  const preloadMetadata = (videoUrl: string) => {
    if (!videoElements.current.has(videoUrl)) {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.preload = 'metadata';
      video.muted = true;
      
      video.addEventListener('loadedmetadata', () => {
        setPreloadState(prev => ({
          ...prev,
          [videoUrl]: {
            status: 'ready',
            preloadLevel: 'metadata',
            lastActivity: Date.now()
          }
        }));
      });
      
      video.addEventListener('error', () => {
        setPreloadState(prev => ({
          ...prev,
          [videoUrl]: {
            status: 'error',
            preloadLevel: 'none',
            lastActivity: Date.now()
          }
        }));
      });
      
      videoElements.current.set(videoUrl, video);
      
      setPreloadState(prev => ({
        ...prev,
        [videoUrl]: {
          status: 'loading',
          preloadLevel: 'metadata',
          lastActivity: Date.now()
        }
      }));
    }
  };
  
  // Aggressively preload video content (start buffering)
  const preloadContent = (videoUrl: string) => {
    const video = videoElements.current.get(videoUrl);
    if (video && video.preload !== 'auto') {
      video.preload = 'auto';
      
      // Also create a blob URL for instant playback
      fetch(videoUrl)
        .then(response => response.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          video.src = blobUrl;
          
          setPreloadState(prev => ({
            ...prev,
            [videoUrl]: {
              status: 'ready',
              preloadLevel: 'auto',
              lastActivity: Date.now()
            }
          }));
        })
        .catch(error => {
          console.error('Failed to preload video content:', error);
        });
      
      setPreloadState(prev => ({
        ...prev,
        [videoUrl]: {
          status: 'loading',
          preloadLevel: 'auto',
          lastActivity: Date.now()
        }
      }));
    }
  };
  
  // Clean up old preloaded videos to prevent memory issues
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const maxAge = 60000; // 1 minute
      
      videoElements.current.forEach((video, url) => {
        const state = preloadState[url];
        if (state && now - state.lastActivity > maxAge) {
          video.src = '';
          video.load();
          videoElements.current.delete(url);
          setPreloadState(prev => {
            const newState = { ...prev };
            delete newState[url];
            return newState;
          });
        }
      });
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(cleanup);
  }, [preloadState]);
  
  // Get preloaded video element for instant playback
  const getPreloadedVideo = (videoUrl: string): HTMLVideoElement | null => {
    return videoElements.current.get(videoUrl) || null;
  };
  
  return {
    preloadMetadata,
    preloadContent,
    getPreloadedVideo,
    preloadState
  };
}