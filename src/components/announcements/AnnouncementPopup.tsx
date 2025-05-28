
import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Announcement } from '@/types/announcements';

interface AnnouncementPopupProps {
  announcement: Announcement;
  onClose: () => void;
}

export const AnnouncementPopup = ({ announcement, onClose }: AnnouncementPopupProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Aguarda a animação de saída
  };

  const handleActionClick = () => {
    if (announcement.action_button_url) {
      window.open(announcement.action_button_url, '_blank');
    }
  };

  const positionClasses = {
    bottom_right: 'fixed bottom-6 right-6 z-50',
    top_fixed: 'fixed top-0 left-0 right-0 z-50'
  };

  const themeClasses = announcement.theme === 'urgent'
    ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-600'
    : 'bg-[#f8f4ef] dark:bg-[#0b0f1c] border-[#efc349]';

  const containerClasses = announcement.position === 'top_fixed'
    ? 'w-full p-4'
    : 'max-w-[300px]';

  return (
    <div className={`${positionClasses[announcement.position]} transition-all duration-300 ease-in-out ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
    }`}>
      <div className={`${containerClasses}`}>
        <div className={`p-4 rounded-lg border backdrop-blur-sm shadow-lg ${themeClasses} ${
          announcement.position === 'top_fixed' ? 'mx-auto max-w-4xl' : ''
        }`}>
          <div className="flex justify-between items-start gap-3">
            {announcement.theme === 'urgent' && (
              <div className="flex-shrink-0 pt-0.5">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-[#1a1a1a] dark:text-[#f4f4f4] font-extralight mb-1">
                {announcement.title}
              </h4>
              <p className="text-xs text-[#1a1a1a] dark:text-[#f4f4f4] font-extralight leading-relaxed">
                {announcement.message}
              </p>
              
              {announcement.action_button_text && announcement.action_button_url && (
                <div className="mt-3">
                  <Button
                    onClick={handleActionClick}
                    size="sm"
                    className="text-xs bg-[#efc349] hover:bg-[#efc349]/80 text-black font-extralight px-3 py-1 h-auto"
                  >
                    {announcement.action_button_text}
                  </Button>
                </div>
              )}
            </div>
            
            <button
              onClick={handleClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 -m-1 rounded"
              aria-label="Fechar anúncio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
