import React from 'react';
import { Search, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useZoomControl } from '@/hooks/useZoomControl';

const ZoomControl: React.FC = () => {
  const { zoomLevel, adjustZoom, resetZoom, zoomPercentage } = useZoomControl();

  return (
    <div className="fixed right-6 bottom-20 z-50 bg-white/90 dark:bg-[#020817]/90 backdrop-blur-sm border border-[#e6e6e6] dark:border-[#efc349] rounded-xl p-4 shadow-lg">
      <div className="flex flex-col items-center space-y-3">
        {/* Icon */}
        <div className="text-[#020817] dark:text-[#efc349]">
          <Search size={20} />
        </div>
        
        {/* Zoom percentage display */}
        <div className="text-xs font-light text-[#020817] dark:text-white min-w-[40px] text-center">
          {zoomPercentage}%
        </div>
        
        {/* Vertical slider */}
        <div className="relative h-24 w-6 flex items-center justify-center">
          <input
            type="range"
            min="0.8"
            max="1.5"
            step="0.05"
            value={zoomLevel}
            onChange={(e) => adjustZoom(parseFloat(e.target.value))}
            className="h-20 w-1 bg-[#e6e6e6] dark:bg-[#efc349]/30 rounded-full appearance-none cursor-pointer slider-vertical"
            style={{
              WebkitAppearance: 'slider-vertical',
              transform: 'rotate(-90deg)',
            }}
            aria-label="Controle de zoom"
          />
        </div>
        
        {/* Zoom controls */}
        <div className="flex flex-col space-y-1">
          <button
            onClick={() => adjustZoom(zoomLevel + 0.1)}
            className="p-1 text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 rounded transition-colors"
            aria-label="Aumentar zoom"
          >
            <ZoomIn size={16} />
          </button>
          
          <button
            onClick={resetZoom}
            className="p-1 text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 rounded transition-colors"
            aria-label="Resetar zoom"
          >
            <RotateCcw size={16} />
          </button>
          
          <button
            onClick={() => adjustZoom(zoomLevel - 0.1)}
            className="p-1 text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 rounded transition-colors"
            aria-label="Diminuir zoom"
          >
            <ZoomOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ZoomControl;