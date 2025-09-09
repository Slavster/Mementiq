import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>(
  options: UseIntersectionObserverOptions = {}
) {
  const { threshold = 0.5, rootMargin = '100px', enabled = true } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef<T>(null);
  
  useEffect(() => {
    if (!enabled || !targetRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        setIsIntersecting(intersecting);
        
        // Track if it has ever intersected (for one-time preloading)
        if (intersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold,
        rootMargin
      }
    );
    
    const element = targetRef.current;
    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [enabled, threshold, rootMargin, hasIntersected]);
  
  return {
    ref: targetRef,
    isIntersecting,
    hasIntersected
  };
}