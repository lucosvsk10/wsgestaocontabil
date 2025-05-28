
import React, { useState, useEffect } from 'react';
import AnnouncementPopup from './AnnouncementPopup';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { Announcement } from '@/types/announcements';

const AnnouncementsContainer: React.FC = () => {
  const { announcements, loading, checkIfViewed } = useAnnouncements();
  const [visibleAnnouncements, setVisibleAnnouncements] = useState<Announcement[]>([]);
  const [checkedAnnouncements, setCheckedAnnouncements] = useState<Set<string>>(new Set());

  useEffect(() => {
    const filterUnviewedAnnouncements = async () => {
      if (loading || announcements.length === 0) return;

      const unviewedAnnouncements: Announcement[] = [];
      
      for (const announcement of announcements) {
        if (!checkedAnnouncements.has(announcement.id)) {
          const isViewed = await checkIfViewed(announcement.id);
          if (!isViewed) {
            unviewedAnnouncements.push(announcement);
          }
          setCheckedAnnouncements(prev => new Set(prev).add(announcement.id));
        }
      }

      // Limit to maximum 2 simultaneous announcements for better UX
      const maxSimultaneous = 2;
      setVisibleAnnouncements(current => {
        const combined = [...current, ...unviewedAnnouncements];
        return combined.slice(0, maxSimultaneous);
      });
    };

    filterUnviewedAnnouncements();
  }, [announcements, loading, checkIfViewed, checkedAnnouncements]);

  const handleClose = (announcementId: string) => {
    setVisibleAnnouncements(current => 
      current.filter(announcement => announcement.id !== announcementId)
    );
  };

  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <>
      {visibleAnnouncements.map((announcement, index) => (
        <div
          key={announcement.id}
          style={{
            zIndex: 1000 - index,
            ...(announcement.position === 'bottom_right' && index > 0 && {
              transform: `translateY(-${(index * 80)}px)`
            })
          }}
        >
          <AnnouncementPopup
            announcement={announcement}
            onClose={() => handleClose(announcement.id)}
          />
        </div>
      ))}
    </>
  );
};

export default AnnouncementsContainer;
