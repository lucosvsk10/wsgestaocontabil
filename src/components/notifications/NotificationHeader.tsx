
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Bell } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { Notification } from "@/types/notifications";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const NotificationHeader = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;
    
    // Fetch notifications on mount
    fetchNotifications();
    
    // Set up real-time listener
    const channel = supabase
      .channel('admin_notifications')
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
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) throw error;
      
      setNotifications(data || []);
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      toast({
        description: "Notificação removida com sucesso",
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        variant: "destructive",
        description: "Erro ao remover notificação",
      });
    }
  };

  const clearAllNotifications = async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setNotifications([]);
      setUnreadCount(0);
      
      toast({
        description: "Todas as notificações foram removidas",
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast({
        variant: "destructive",
        description: "Erro ao remover notificações",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-8 w-8 rounded-full"
        >
          <Bell className="h-5 w-5 text-navy-light dark:text-gold" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gold dark:bg-gold text-navy flex items-center justify-center p-0"
              aria-label={`${unreadCount} notificações não lidas`}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 dark:bg-navy-medium dark:border-navy-lighter/30 p-0 overflow-hidden"
      >
        <div className="px-4 py-3 border-b dark:border-navy-lighter/30 flex items-center justify-between">
          <h4 className="font-medium text-navy dark:text-gold">Notificações</h4>
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllNotifications}
              className="text-sm text-navy-light dark:text-gold hover:text-navy dark:hover:text-gold-light"
            >
              Limpar tudo
            </Button>
          )}
        </div>
        
        <div className={cn("max-h-[300px] overflow-auto", notifications.length === 0 && "py-8")}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-2 opacity-20" />
              <p className="text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.id} 
                className="px-4 py-3 cursor-default flex gap-3 items-start dark:hover:bg-navy-lighter focus:bg-gray-100 dark:focus:bg-navy-lighter"
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-navy-light/20", 
                  notification.type === "document" ? "text-blue-500" : "text-gold"
                )}>
                  <Bell size={14} />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-navy-dark dark:text-gold-light line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 rounded-full opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    markAsRead(notification.id);
                  }}
                >
                  &times;
                </Button>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationHeader;
