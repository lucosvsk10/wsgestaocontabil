import { useState, useEffect, useCallback, useRef } from 'react';

export const useZoomControl = () => {
  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem('ws-zoom-level');
    return saved ? parseFloat(saved) : 1;
  });
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced zoom application with blur effect
  const applyZoom = useCallback((value: number) => {
    setIsTransitioning(true);
    
    // Add blur effect to main content
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.filter = 'blur(2px)';
      mainContent.style.transition = 'filter 0.2s ease-in-out, transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Apply zoom after short delay for smooth transition
    timeoutRef.current = setTimeout(() => {
      document.documentElement.style.setProperty('--zoom-scale', value.toString());
      localStorage.setItem('ws-zoom-level', value.toString());
      
      // Remove blur effect
      setTimeout(() => {
        if (mainContent) {
          mainContent.style.filter = 'none';
        }
        setIsTransitioning(false);
      }, 150);
    }, 100);
  }, []);

  useEffect(() => {
    // Apply initial zoom on mount
    document.documentElement.style.setProperty('--zoom-scale', zoomLevel.toString());
    
    // Initialize main content with smooth transitions
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s ease-in-out';
    }
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