
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnnouncementsHeaderProps {
  onCreateClick: () => void;
}

export const AnnouncementsHeader = ({ onCreateClick }: AnnouncementsHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-extralight text-gray-900 dark:text-white">
          Gerenciar Anúncios
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Crie e gerencie pop-ups informativos para usuários e visitantes
        </p>
      </div>
      <Button 
        onClick={onCreateClick}
        className="bg-[#efc349] hover:bg-[#efc349]/80 text-black font-extralight"
      >
        <Plus className="w-4 h-4 mr-2" />
        Novo Anúncio
      </Button>
    </div>
  );
};
