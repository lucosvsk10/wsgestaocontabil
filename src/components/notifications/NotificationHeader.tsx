
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { useNotificationBell } from '@/hooks/notifications/useNotificationBell';
import NotificationActions from './NotificationActions';
import NotificationList from './NotificationList';

const NotificationHeader = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationBell();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full border border-gray-200 dark:border-navy-lighter/50 hover:bg-gray-100 dark:hover:bg-navy-medium">
          <Bell className="h-5 w-5 text-navy dark:text-gold" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-[10px] font-semibold text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 dark:bg-navy-medium border border-gray-200 dark:border-navy-lighter/30 shadow-lg rounded-xl">
        <NotificationActions 
          unreadCount={unreadCount} 
          onMarkAllAsRead={markAllAsRead} 
        />
        
        <NotificationList 
          notifications={notifications} 
          onMarkAsRead={markAsRead} 
        />
        
        <DropdownMenuSeparator className="dark:bg-navy-lighter/30" />
        <DropdownMenuItem 
          className="p-2 text-center text-sm text-navy dark:text-gold hover:bg-gray-100 dark:hover:bg-navy-lighter focus:bg-gray-100 dark:focus:bg-navy-lighter"
        >
          Ver todas as notificações
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationHeader;
