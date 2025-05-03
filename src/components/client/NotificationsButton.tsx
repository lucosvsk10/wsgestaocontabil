
import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationsModal } from './NotificationsModal';

export const NotificationsButton: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  return (
    <NotificationsModal
      notifications={notifications}
      unreadCount={unreadCount}
      isLoading={isLoading}
      markAsRead={markAsRead}
      markAllAsRead={markAllAsRead}
    />
  );
};
