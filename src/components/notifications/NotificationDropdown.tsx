
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { formatDate } from "@/utils/documentUtils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Trash2 } from "lucide-react";

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationDropdown = ({ onClose }: NotificationDropdownProps) => {
  const { 
    notifications, 
    isLoading, 
    clearNotifications 
  } = useNotifications();
  const isMobile = useIsMobile();
  
  const dropdownWidth = isMobile ? 'w-[90vw]' : 'w-80';
  
  return (
    <div className={`absolute right-0 mt-2 ${dropdownWidth} bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 rounded-md shadow-lg z-50 max-h-[80vh] overflow-hidden flex flex-col`}>
      <div className="p-3 flex items-center justify-between bg-orange-100 dark:bg-navy-light">
        <h3 className="font-semibold text-navy dark:text-gold">Notificações</h3>
      </div>
      
      <div className="overflow-y-auto max-h-[60vh]">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Carregando...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Nenhuma notificação.</div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification.id}
              className={`p-3 border-b border-gray-200 dark:border-navy-light
                ${notification.type === 'document' 
                  ? 'bg-blue-50 dark:bg-navy hover:bg-blue-100 dark:hover:bg-navy-light' 
                  : 'hover:bg-gray-50 dark:hover:bg-navy-light/30'}`}
            >
              <p className="text-sm text-gray-600 dark:text-gray-300">{notification.message}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(notification.created_at)}</p>
            </div>
          ))
        )}
      </div>
      
      <div className="p-2 border-t border-gray-200 dark:border-navy-light mt-auto">
        <div className="flex space-x-2">
          {notifications.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearNotifications}
              className="flex items-center space-x-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              <Trash2 size={16} />
              <span>Limpar histórico</span>
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            className="flex-grow"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationDropdown;
