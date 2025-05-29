
import { Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Announcement } from '@/types/announcements';

interface AnnouncementActionsProps {
  announcement: Announcement;
  onToggleStatus: (announcement: Announcement) => void;
  onEdit: (announcement: Announcement) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export const AnnouncementActions = ({
  announcement,
  onToggleStatus,
  onEdit,
  onDelete,
  isDeleting
}: AnnouncementActionsProps) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onToggleStatus(announcement)}
        className="text-gray-600 dark:text-gray-300 hover:text-[#efc349]"
      >
        {announcement.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(announcement)}
        className="text-gray-600 dark:text-gray-300 hover:text-[#efc349]"
      >
        <Edit className="w-4 h-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white font-extralight">
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              Tem certeza que deseja excluir este anúncio? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-extralight">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(announcement.id)}
              className="bg-red-600 hover:bg-red-700 text-white font-extralight"
              disabled={isDeleting}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
