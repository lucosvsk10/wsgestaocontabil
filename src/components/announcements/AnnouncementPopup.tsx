
import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Announcement } from '@/types/announcements';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useNavigate } from 'react-router-dom';

interface AnnouncementPopupProps {
  announcement: Announcement;
  onClose: () => void;
}

const AnnouncementPopup: React.FC<AnnouncementPopupProps> = ({ announcement, onClose }) => {
  const navigate = useNavigate();
  const { markAsViewed } = useAnnouncements();

  useEffect(() => {
    markAsViewed(announcement.id);
  }, [announcement.id, markAsViewed]);

  const handleActionClick = () => {
    if (announcement.action_button_url) {
      if (announcement.action_button_url.startsWith('http')) {
        window.open(announcement.action_button_url, '_blank');
      } else {
        navigate(announcement.action_button_url);
      }
    }
    onClose();
  };

  const positionClasses = {
    bottom_right: 'fixed bottom-6 right-6 z-50',
    top_fixed: 'fixed top-0 left-0 right-0 z-50'
  };

  const containerClasses = announcement.position === 'top_fixed' 
    ? 'w-full bg-white dark:bg-[#020817] border-b border-[#efc349]/30 p-4'
    : 'max-w-sm bg-white/95 dark:bg-[#020817]/95 backdrop-blur-sm border border-[#efc349]/30 rounded-lg shadow-lg p-4';

  return (
    <div className={positionClasses[announcement.position]}>
      <div className={containerClasses}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {announcement.theme === 'urgent' && (
              <AlertCircle size={18} className="text-red-500 dark:text-red-400 flex-shrink-0" />
            )}
            <h3 className="font-extralight text-[#020817] dark:text-[#efc349] text-lg">
              {announcement.title}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0"
          >
            <X size={16} />
          </Button>
        </div>
        
        <p className="text-[#020817] dark:text-white font-extralight text-sm mb-4 leading-relaxed">
          {announcement.message}
        </p>
        
        {announcement.action_button_text && (
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleActionClick}
              className="font-extralight text-sm"
            >
              {announcement.action_button_text}
              {announcement.action_button_url?.startsWith('http') && (
                <ExternalLink size={14} className="ml-1" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementPopup;
