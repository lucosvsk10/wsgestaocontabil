
import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationsSystem, Notification } from '@/hooks/useNotificationsSystem';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotificationsSystem();
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    setOpen(false);
  };

  // Format relative time
  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { 
        addSuffix: true,
        locale: ptBR
      });
    } catch (e) {
      return 'Data desconhecida';
    }
  };

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) return null;

  return (
    <div ref={dropdownRef} className={className}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            className="relative"
          >
            <Bell className="h-[1.2rem] w-[1.2rem]" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 px-1.5 bg-red-500 text-white"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
            <span className="sr-only">Notificações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex justify-between items-center">
            <span>Notificações</span>
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => markAllAsRead()}
                className="h-auto py-1 text-xs"
              >
                Marcar todas como lidas
              </Button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold"></div>
            </div>
          ) : notifications.length > 0 ? (
            <>
              <ScrollArea className="h-[300px]">
                {notifications.map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id}
                    className={`p-3 cursor-pointer flex flex-col items-start ${!notification.is_read ? 'bg-orange-100 dark:bg-navy-light/10' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex w-full justify-between">
                      <span className={`font-medium ${!notification.is_read ? 'text-gold-dark dark:text-gold' : ''}`}>
                        {notification.title}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    {notification.document_category && (
                      <span className="text-xs mt-1 bg-gold/20 text-gold-dark dark:text-gold px-2 py-0.5 rounded-full">
                        {notification.document_category}
                      </span>
                    )}
                    {notification.document_id && (
                      <Link 
                        to="/client" 
                        className="text-xs text-blue-500 hover:text-blue-700 mt-1"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Ver documento
                      </Link>
                    )}
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center" asChild>
                <Link to="/client" onClick={() => setOpen(false)}>
                  Ver todos os documentos
                </Link>
              </DropdownMenuItem>
            </>
          ) : (
            <div className="p-4 text-center text-gray-500">
              Não há notificações
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
