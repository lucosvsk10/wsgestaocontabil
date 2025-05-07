import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BellOff, Check, ExternalLink } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { formatDate } from "@/utils/documentUtils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDocumentActions } from "@/hooks/document/useDocumentActions";
import { supabase } from "@/integrations/supabase/client";

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationItem = ({ notification, onView }: { notification: Notification; onView: () => void }) => {
  const isRead = notification.is_read;
  
  return (
    <div 
      className={`p-3 border-b last:border-b-0 ${
        isRead 
          ? 'bg-white dark:bg-navy-dark' 
          : 'bg-orange-50 dark:bg-navy-light/10'
      } hover:bg-orange-100 dark:hover:bg-navy-light/20 cursor-pointer transition-colors`}
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-2">
        <h5 className="text-sm font-medium text-navy dark:text-gold">
          {notification.title}
        </h5>
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {formatDate(notification.created_at).split(" às")[0]}
        </span>
      </div>
      <p className="text-xs mt-1 text-navy/80 dark:text-gold/80">{notification.message}</p>
      
      <div className="mt-2 flex items-center justify-between">
        <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-orange-200/60 dark:bg-navy-light/30 border-gold/20 text-navy dark:text-gold">
          <ExternalLink size={10} className="mr-1" />
          Ver documento
        </span>
        
        {!isRead && (
          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
        )}
      </div>
    </div>
  );
};

const NotificationDropdown = ({ onClose }: NotificationDropdownProps) => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const { handleDownload } = useDocumentActions();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Recarregar notificações ao abrir o dropdown
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);
  
  // Função para visualizar o documento de uma notificação
  const handleViewDocument = async (notification: Notification) => {
    // Marcar como lida
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Se tiver document_id, encontrar o documento nas categorias
    if (notification.document_id) {
      try {
        // Buscar documento específico
        const { data: document } = await supabase
          .from('documents')
          .select('*')
          .eq('id', notification.document_id)
          .single();
          
        if (document) {
          // Fazer download do documento
          await handleDownload(document);
        }
      } catch (error) {
        console.error('Erro ao buscar documento da notificação:', error);
      }
    }
    
    // Fechar dropdown
    onClose();
  };

  return (
    <div className={`absolute z-50 mt-2 ${isMobile ? 'right-0 w-80' : 'right-0 w-96'} bg-white dark:bg-navy-dark shadow-lg border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden`}>
      {/* Cabeçalho */}
      <div className="p-3 bg-orange-50 dark:bg-navy-light/10 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h4 className="font-medium text-navy dark:text-gold">Notificações</h4>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead} 
              className="text-xs h-8 px-2 text-navy/80 dark:text-gold/80 hover:text-navy hover:dark:text-gold"
            >
              <Check size={14} className="mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>
      
      {/* Lista de notificações */}
      <ScrollArea className="h-[350px]">
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold"></div>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map(notification => (
            <NotificationItem 
              key={notification.id} 
              notification={notification} 
              onView={() => handleViewDocument(notification)} 
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <BellOff size={32} className="text-gray-400 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">Você não tem notificações</p>
          </div>
        )}
      </ScrollArea>
      
      {/* Rodapé */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-orange-50 dark:bg-navy-light/10 text-center">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            onClose();
            navigate("/client");
          }}
          className="text-xs text-navy/80 dark:text-gold/80 hover:text-navy hover:dark:text-gold w-full"
        >
          Ver todos os documentos
        </Button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
