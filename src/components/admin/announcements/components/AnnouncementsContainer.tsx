
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { CreateAnnouncementDialog } from '../CreateAnnouncementDialog';
import { EditAnnouncementDialog } from '../EditAnnouncementDialog';
import { Announcement } from '@/types/announcements';
import { AnnouncementsHeader } from './AnnouncementsHeader';
import { AnnouncementCard } from './AnnouncementCard';

export const AnnouncementsContainer = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  
  const {
    announcements,
    deleteAnnouncement,
    updateAnnouncement,
    isLoading,
    isDeleting
  } = useAnnouncements();

  const toggleAnnouncementStatus = (announcement: Announcement) => {
    updateAnnouncement({
      id: announcement.id,
      data: { 
        title: announcement.title,
        message: announcement.message,
        target_type: announcement.target_type,
        target_user_id: announcement.target_user_id,
        theme: announcement.theme,
        position: announcement.position,
        action_button_text: announcement.action_button_text,
        action_button_url: announcement.action_button_url,
        is_active: !announcement.is_active,
        expires_at: announcement.expires_at ? new Date(announcement.expires_at) : null
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnnouncementsHeader onCreateClick={() => setShowCreateDialog(true)} />

      <div className="grid gap-4">
        {announcements.length === 0 ? (
          <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
            <CardContent className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 font-extralight">
                Nenhum anúncio criado ainda.
              </p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onToggleStatus={toggleAnnouncementStatus}
              onEdit={setEditingAnnouncement}
              onDelete={deleteAnnouncement}
              isDeleting={isDeleting}
            />
          ))
        )}
      </div>

      <CreateAnnouncementDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog} 
      />
      
      {editingAnnouncement && (
        <EditAnnouncementDialog 
          announcement={editingAnnouncement}
          open={!!editingAnnouncement} 
          onOpenChange={(open) => !open && setEditingAnnouncement(null)} 
        />
      )}
    </div>
  );
};
