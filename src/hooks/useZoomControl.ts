import { useState, useEffect } from 'react';

export const useZoomControl = () => {
  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem('ws-zoom-level');
    return saved ? parseFloat(saved) : 1;
  });

  useEffect(() => {
    localStorage.setItem('ws-zoom-level', zoomLevel.toString());
    document.documentElement.style.setProperty('--zoom-scale', zoomLevel.toString());
  }, [zoomLevel]);

  useEffect(() => {
    // Apply initial zoom on mount
    document.documentElement.style.setProperty('--zoom-scale', zoomLevel.toString());
  }, []);

  const adjustZoom = (value: number) => {
    const newZoom = Math.min(Math.max(value, 0.8), 1.5); // Min 80%, Max 150%
    setZoomLevel(newZoom);
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  return {
    zoomLevel,
    adjustZoom,
    resetZoom,
    zoomPercentage: Math.round(zoomLevel * 100)
  };
};