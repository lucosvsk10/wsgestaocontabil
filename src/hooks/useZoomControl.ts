import { useState, useEffect, useCallback, useRef } from 'react';

export const useZoomControl = () => {
  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem('ws-zoom-level');
    return saved ? parseFloat(saved) : 1;
  });
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Optimized zoom application with minimal blur
  const applyZoom = useCallback((value: number) => {
    setIsTransitioning(true);
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Apply zoom immediately with shorter transition
    document.documentElement.style.setProperty('--zoom-scale', value.toString());
    localStorage.setItem('ws-zoom-level', value.toString());
    
    // End transition state quickly
    timeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, []);

  useEffect(() => {
    // Apply initial zoom on mount
    document.documentElement.style.setProperty('--zoom-scale', zoomLevel.toString());
  }, []);

  const adjustZoom = useCallback((value: number) => {
    const newZoom = Math.min(Math.max(value, 0.8), 1.5); // Min 80%, Max 150%
    setZoomLevel(newZoom);
    applyZoom(newZoom);
  }, [applyZoom]);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    applyZoom(1);
  }, [applyZoom]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    zoomLevel,
    adjustZoom,
    resetZoom,
    isTransitioning,
    zoomPercentage: Math.round(zoomLevel * 100)
  };
};