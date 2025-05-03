
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useNotifications = () => {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'default'>('default');
  const [supported, setSupported] = useState(false);
  const { toast } = useToast();

  // Check if the browser supports notifications
  useEffect(() => {
    if ('Notification' in window) {
      setSupported(true);
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Function to request permission
  const requestPermission = async () => {
    if (!supported) {
      toast({
        title: "Notificações não suportadas",
        description: "Seu navegador não suporta notificações.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        toast({
          title: "Notificações ativadas",
          description: "Você receberá notificações quando novos documentos estiverem disponíveis.",
        });
        return true;
      } else {
        toast({
          title: "Notificações bloqueadas",
          description: "Você não receberá notificações. Você pode alterar isso nas configurações do navegador.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Erro ao solicitar permissão:", error);
      return false;
    }
  };

  // Function to send notification
  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (!supported || permissionStatus !== 'granted') return false;

    try {
      const notification = new Notification(title, options);
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      return true;
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
      return false;
    }
  };

  return {
    supported,
    permissionStatus,
    requestPermission,
    sendNotification
  };
};
