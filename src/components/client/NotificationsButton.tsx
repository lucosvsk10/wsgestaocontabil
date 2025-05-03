
import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NotificationsButtonProps {
  className?: string;
}

export const NotificationsButton: React.FC<NotificationsButtonProps> = ({ className }) => {
  const { supported, permissionStatus, requestPermission } = useNotifications();

  if (!supported) return null;

  const getButtonVariant = () => {
    switch (permissionStatus) {
      case 'granted': return 'outline';
      case 'denied': return 'secondary';
      default: return 'default';
    }
  };

  const getButtonText = () => {
    switch (permissionStatus) {
      case 'granted': return 'Notificações ativas';
      case 'denied': return 'Notificações bloqueadas';
      default: return 'Ativar notificações';
    }
  };
  
  const tooltipText = permissionStatus === 'denied' 
    ? 'As notificações estão bloqueadas. Altere nas configurações do navegador.'
    : permissionStatus === 'granted'
      ? 'Você receberá notificações de novos documentos'
      : 'Clique para ativar notificações de novos documentos';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant={getButtonVariant()} 
          size="sm" 
          onClick={requestPermission}
          disabled={permissionStatus === 'denied'}
          className={className}
        >
          <Bell className="h-4 w-4 mr-2" />
          {getButtonText()}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
};
