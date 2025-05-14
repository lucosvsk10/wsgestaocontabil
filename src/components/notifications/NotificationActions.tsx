
import { Button } from '@/components/ui/button';
import { DropdownMenuLabel, DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface NotificationActionsProps {
  unreadCount: number;
  onMarkAllAsRead: () => void;
}

const NotificationActions = ({ unreadCount, onMarkAllAsRead }: NotificationActionsProps) => {
  return (
    <>
      <div className="flex items-center justify-between p-3">
        <DropdownMenuLabel className="text-navy dark:text-gold font-medium">Notificações</DropdownMenuLabel>
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onMarkAllAsRead}
            className="h-8 px-2 text-xs text-navy dark:text-gold hover:bg-gray-100 dark:hover:bg-navy-lighter"
          >
            Marcar todas como lidas
          </Button>
        )}
      </div>
      
      <DropdownMenuSeparator className="dark:bg-navy-lighter/30" />
    </>
  );
};

export default NotificationActions;
