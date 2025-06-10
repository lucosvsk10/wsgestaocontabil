
import { useState, useEffect } from 'react';
import { X, FileText, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationPopupData } from '@/types/notifications';
import { useNavigate } from 'react-router-dom';

interface NotificationPopupProps {
  notification: NotificationPopupData;
  onClose: () => void;
}

export const NotificationPopup = ({ notification, onClose }: NotificationPopupProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  // Animação de entrada
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    console.log('Fechando popup:', notification.id);
    setIsVisible(false);
    setTimeout(onClose, 300); // Aguarda a animação de saída
  };

  const handleActionClick = () => {
    console.log('Clicando em ação do popup:', notification.actionUrl);
    navigate(notification.actionUrl);
    handleClose();
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'novo_documento':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'agenda_fiscal':
        return <Calendar className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getThemeClasses = () => {
    switch (notification.type) {
      case 'novo_documento':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600';
      case 'agenda_fiscal':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-600';
      default:
        return 'bg-[#f8f4ef] dark:bg-[#0b0f1c] border-[#efc349]';
    }
  };

  // Auto-close após 10 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Auto-fechando popup após 10 segundos:', notification.id);
      handleClose();
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`transition-all duration-300 ease-in-out transform ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'
      }`}
    >
      <div className="max-w-[380px] min-w-[320px]">
        <div className={`p-4 rounded-lg border backdrop-blur-sm shadow-lg ${getThemeClasses()}`}>
          <div className="flex justify-between items-start gap-3">
            <div className="flex-shrink-0 pt-0.5">
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-[#1a1a1a] dark:text-[#f4f4f4] font-extralight mb-1">
                {notification.title}
              </h4>
              <p className="text-xs text-[#1a1a1a] dark:text-[#f4f4f4] font-extralight leading-relaxed mb-3">
                {notification.message}
              </p>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleActionClick}
                  size="sm"
                  className="text-xs bg-[#efc349] hover:bg-[#efc349]/80 text-black font-extralight px-3 py-1 h-auto"
                >
                  {notification.actionText}
                </Button>
                <Button
                  onClick={handleClose}
                  variant="ghost"
                  size="sm"
                  className="text-xs font-extralight px-2 py-1 h-auto text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Depois
                </Button>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 -m-1 rounded"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
