
import { useState } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Notification } from '@/types/notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem = ({ notification, onMarkAsRead }: NotificationItemProps) => {
  const formatNotificationDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM 'às' HH:mm", { locale: ptBR });
    } catch {
      return "";
    }
  };

  const getNotificationType = (type: string | null) => {
    if (!type) return 'Notificação';
    
    switch (type) {
      case 'document': return 'Documento';
      case 'login': return 'Login';
      case 'system': return 'Sistema';
      default: return type;
    }
  };

  return (
    <DropdownMenuItem 
      key={notification.id}
      className={`p-3 focus:bg-gray-100 dark:focus:bg-navy-lighter cursor-default ${!notification.read_at ? 'bg-blue-50 dark:bg-navy-lighter/30' : ''}`}
      onSelect={() => onMarkAsRead(notification.id)}
    >
      <div className="flex flex-col w-full">
        <div className="flex justify-between items-start mb-1">
          <span className={`text-sm font-medium ${!notification.read_at ? 'text-navy dark:text-gold' : 'text-gray-700 dark:text-gray-300'}`}>
            {getNotificationType(notification.type)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatNotificationDate(notification.created_at)}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {notification.message}
        </p>
      </div>
    </DropdownMenuItem>
  );
};

export default NotificationItem;
