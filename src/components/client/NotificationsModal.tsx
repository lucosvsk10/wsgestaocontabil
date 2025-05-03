
import React from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Notification } from '@/hooks/useNotifications';
import { formatDate } from '@/utils/documentUtils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotificationsModalProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  unreadCount,
  isLoading,
  markAllAsRead,
  markAsRead
}) => {
  const handleOpenChange = (open: boolean) => {
    if (open && unreadCount > 0) {
      markAllAsRead();
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative"
        >
          {unreadCount > 0 ? (
            <>
              <Bell className="h-4 w-4 mr-2" />
              <span>Notificações</span>
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {unreadCount}
              </span>
            </>
          ) : (
            <>
              <BellOff className="h-4 w-4 mr-2" />
              <span>Notificações</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Notificações</span>
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="py-6 text-center">Carregando notificações...</div>
          ) : notifications.length === 0 ? (
            <div className="py-6 text-center">Não há notificações.</div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-md border ${
                    !notification.is_read
                      ? 'bg-primary/10 border-primary/20'
                      : 'bg-background border-border'
                  }`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-medium">{notification.title}</h4>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="flex justify-end mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={markAllAsRead} 
            disabled={unreadCount === 0}
          >
            Marcar todas como lidas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
