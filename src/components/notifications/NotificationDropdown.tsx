
import { useNotifications } from "@/hooks/useNotifications";
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
  
  console.log("Renderizando dropdown com", notifications.length, "notificações");
  
  // Função para determinar a classe de estilo baseada no tipo de notificação
  const getNotificationStyle = (type: string | null) => {
    switch (type) {
      case 'document':
        return 'bg-blue-50 dark:bg-navy hover:bg-blue-100 dark:hover:bg-navy-light';
      case 'login':
        return 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30';  
      case 'logout':
        return 'bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30';
      default:
        return 'hover:bg-gray-50 dark:hover:bg-navy-light/30';
    }
  };
  
  return (
    <div 
      className={`absolute right-0 mt-2 ${dropdownWidth} bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 rounded-md shadow-lg z-50 max-h-[80vh] overflow-hidden flex flex-col`}
      style={{ maxHeight: '80vh' }} // Garantir que não ultrapasse 80% da altura da viewport
    >
      <div className="p-3 flex items-center justify-between bg-orange-100 dark:bg-navy-light">
        <h3 className="font-semibold text-navy dark:text-gold">Notificações</h3>
        <span className="text-xs text-gray-500">{notifications.length} {notifications.length === 1 ? 'item' : 'itens'}</span>
      </div>
      
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh)' }}>
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin h-5 w-5 border-b-2 border-blue-500 rounded-full mx-auto mb-2"></div>
            Carregando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Nenhuma notificação.</div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification.id}
              className={`p-3 border-b border-gray-200 dark:border-navy-light ${getNotificationStyle(notification.type)}`}
            >
              <p className="text-sm text-gray-600 dark:text-gray-300">{notification.message}</p>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(notification.created_at)}</p>
                {notification.type && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-navy-light text-gray-600 dark:text-gray-300">
                    {notification.type}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="p-2 border-t border-gray-200 dark:border-navy-light mt-auto bg-white dark:bg-navy-dark">
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
