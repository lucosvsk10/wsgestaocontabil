
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Notification } from '@/types/notifications';

const NotificationHeader = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Set up realtime subscription
      const subscription = supabase
        .channel('notifications_changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) throw error;
      
      if (data) {
        const typedData = data as Notification[];
        setNotifications(typedData);
        // Count unread for badge
        const unread = typedData.filter(n => !n.read_at).length;
        setUnreadCount(unread);
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error.message);
    }
  };

  const formatNotificationDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM 'às' HH:mm", { locale: ptBR });
    } catch {
      return "";
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(n => 
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Error marking notification as read:', error.message);
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
      
      if (unreadIds.length === 0) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(n => ({
          ...n, 
          read_at: n.read_at || new Date().toISOString()
        }))
      );
      
      // Reset unread count
      setUnreadCount(0);
      
      toast({
        title: "Notificações",
        description: "Todas as notificações foram marcadas como lidas.",
      });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error.message);
      toast({
        title: "Erro",
        description: "Não foi possível marcar as notificações como lidas.",
        variant: "destructive",
      });
    }
  };

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
        <div className="flex items-center justify-between p-3">
          <DropdownMenuLabel className="text-navy dark:text-gold font-medium">Notificações</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="h-8 px-2 text-xs text-navy dark:text-gold hover:bg-gray-100 dark:hover:bg-navy-lighter"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="dark:bg-navy-lighter/30" />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground dark:text-gray-400">
            Você não tem notificações.
          </div>
        ) : (
          <div className="max-h-[300px] overflow-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.id}
                className={`p-3 focus:bg-gray-100 dark:focus:bg-navy-lighter cursor-default ${!notification.read_at ? 'bg-blue-50 dark:bg-navy-lighter/30' : ''}`}
                onSelect={() => markAsRead(notification.id)}
              >
                <div className="flex flex-col w-full">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-medium ${!notification.read_at ? 'text-navy dark:text-gold' : 'text-gray-700 dark:text-gray-300'}`}>
                      {notification.type === 'document' ? 'Documento' : 
                       notification.type === 'login' ? 'Login' : 
                       notification.type === 'system' ? 'Sistema' : 'Notificação'}
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
            ))}
          </div>
        )}
        
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
