
import React, { useState } from 'react';
import { Search, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useZoomControl } from '@/hooks/useZoomControl';
import { useIsMobile } from '@/hooks/use-mobile';

const ZoomControl: React.FC = () => {
  const { zoomLevel, adjustZoom, resetZoom, zoomPercentage, isTransitioning } = useZoomControl();
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();

  // Não renderizar em dispositivos móveis
  if (isMobile) {
    return null;
  }

  return (
    <div 
      className="fixed right-4 top-24 z-50 bg-white/95 dark:bg-[#020817]/95 backdrop-blur-md border border-[#e6e6e6] dark:border-[#efc349] rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: isHovered ? 'auto' : '48px',
        height: isHovered ? 'auto' : '48px',
        padding: isHovered ? '12px' : '12px'
      }}
    >
      <div className="flex flex-col items-center space-y-2">
        {/* Icon - always visible */}
        <div className="text-[#020817] dark:text-[#efc349] transition-colors duration-200">
          <Search size={18} />
        </div>
        
        {/* Expandable content */}
        <div 
          className={`overflow-hidden transition-all duration-300 ${
            isHovered ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {/* Zoom percentage display */}
          <div className="text-xs font-medium text-[#020817] dark:text-white min-w-[35px] text-center px-2 py-1 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-lg transition-colors duration-200 mb-2">
            {zoomPercentage}%
          </div>
          
          {/* Vertical slider */}
          <div className="relative h-20 w-5 flex items-center justify-center mb-2">
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.05"
              value={zoomLevel}
              onChange={(e) => adjustZoom(parseFloat(e.target.value))}
              className="zoom-slider"
              aria-label="Controle de zoom"
              disabled={isTransitioning}
            />
          </div>
          
          {/* Zoom controls */}
          <div className="flex flex-col space-y-1">
            <button
              onClick={() => adjustZoom(zoomLevel + 0.1)}
              className="p-1.5 text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/20 rounded-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
              aria-label="Aumentar zoom"
              disabled={isTransitioning || zoomLevel >= 1.5}
            >
              <ZoomIn size={14} />
            </button>
            
            <button
              onClick={resetZoom}
              className="p-1.5 text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/20 rounded-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
              aria-label="Resetar zoom"
              disabled={isTransitioning}
            >
              <RotateCcw size={14} />
            </button>
            
            <button
              onClick={() => adjustZoom(zoomLevel - 0.1)}
              className="p-1.5 text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/20 rounded-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
              aria-label="Diminuir zoom"
              disabled={isTransitioning || zoomLevel <= 0.8}
            >
              <ZoomOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoomControl;
