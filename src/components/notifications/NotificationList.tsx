
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import NotificationItem from './NotificationItem';
import { Notification } from '@/types/notifications';

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

const NotificationList = ({ notifications, onMarkAsRead }: NotificationListProps) => {
  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground dark:text-gray-400">
        Você não tem notificações.
      </div>
    );
  }

  return (
    <div className="max-h-[300px] overflow-auto">
      {notifications.map((notification) => (
        <NotificationItem 
          key={notification.id} 
          notification={notification} 
          onMarkAsRead={onMarkAsRead} 
        />
      ))}
    </div>
  );
};

export default NotificationList;
