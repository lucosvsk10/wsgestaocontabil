
import { useState } from 'react';
import { AnnouncementsContainer } from './components/AnnouncementsContainer';
import { SendAnnouncementModal } from '../modals/SendAnnouncementModal';
import { Button } from '@/components/ui/button';
import { Megaphone } from 'lucide-react';

export const AnnouncementsView = () => {
  const [showSendModal, setShowSendModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extralight text-[#020817] dark:text-[#efc349]">
          Anúncios e Comunicados
        </h1>
        <Button
          onClick={() => setShowSendModal(true)}
          className="font-extralight bg-[#efc349] text-[#020817] hover:bg-[#efc349]/90"
        >
          <Megaphone className="w-4 h-4 mr-2" />
          Comunicado
        </Button>
      </div>

      <AnnouncementsContainer />
      
      <SendAnnouncementModal 
        open={showSendModal} 
        onOpenChange={setShowSendModal} 
      />
    </div>
  );
};
