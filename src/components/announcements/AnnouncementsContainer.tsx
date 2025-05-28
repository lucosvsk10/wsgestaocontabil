
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { AnnouncementPopup } from './AnnouncementPopup';
import { Announcement } from '@/types/announcements';

export const AnnouncementsContainer = () => {
  const { user } = useAuth();
  const { activeAnnouncements, markAsViewed } = useAnnouncements();
  const [visibleAnnouncements, setVisibleAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!activeAnnouncements.length) return;

    const sessionId = sessionStorage.getItem('session-id') || Math.random().toString(36);
    sessionStorage.setItem('session-id', sessionId);

    // Filtrar anúncios baseado no público-alvo
    const filteredAnnouncements = activeAnnouncements.filter(announcement => {
      switch (announcement.target_type) {
        case 'all_users':
          return true;
        case 'logged_users':
          return !!user;
        case 'public_visitors':
          return !user;
        case 'specific_user':
          return user && announcement.target_user_id === user.id;
        default:
          return false;
      }
    });

    // Verificar quais anúncios já foram visualizados nesta sessão
    const viewedKey = user ? `viewed-announcements-${user.id}` : `viewed-announcements-${sessionId}`;
    const viewedAnnouncements = JSON.parse(localStorage.getItem(viewedKey) || '[]');

    // Filtrar anúncios não visualizados
    const unviewedAnnouncements = filteredAnnouncements.filter(
      announcement => !viewedAnnouncements.includes(announcement.id)
    );

    // Limitar a 2 anúncios simultâneos (principalmente para mobile)
    const announcementsToShow = unviewedAnnouncements.slice(0, 2);

    setVisibleAnnouncements(announcementsToShow);
  }, [activeAnnouncements, user]);

  const handleCloseAnnouncement = async (announcement: Announcement) => {
    // Marcar como visualizado no backend
    await markAsViewed(announcement.id);

    // Marcar como visualizado no localStorage
    const sessionId = sessionStorage.getItem('session-id') || Math.random().toString(36);
    const viewedKey = user ? `viewed-announcements-${user.id}` : `viewed-announcements-${sessionId}`;
    const viewedAnnouncements = JSON.parse(localStorage.getItem(viewedKey) || '[]');
    
    if (!viewedAnnouncements.includes(announcement.id)) {
      viewedAnnouncements.push(announcement.id);
      localStorage.setItem(viewedKey, JSON.stringify(viewedAnnouncements));
    }

    // Remover da lista de anúncios visíveis
    setVisibleAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
  };

  // Separar anúncios por posição
  const bottomRightAnnouncements = visibleAnnouncements.filter(a => a.position === 'bottom_right');
  const topFixedAnnouncements = visibleAnnouncements.filter(a => a.position === 'top_fixed');

  return (
    <>
      {/* Anúncios do topo */}
      {topFixedAnnouncements.map(announcement => (
        <AnnouncementPopup
          key={announcement.id}
          announcement={announcement}
          onClose={() => handleCloseAnnouncement(announcement)}
        />
      ))}

      {/* Anúncios do canto inferior direito - empilhados */}
      {bottomRightAnnouncements.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 space-y-3">
          {bottomRightAnnouncements.map((announcement, index) => (
            <div
              key={announcement.id}
              style={{
                transform: `translateY(${index * -10}px)`,
                zIndex: 50 - index
              }}
            >
              <AnnouncementPopup
                announcement={announcement}
                onClose={() => handleCloseAnnouncement(announcement)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
};
