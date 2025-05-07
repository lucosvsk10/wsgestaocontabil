
import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationDropdown from "./NotificationDropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);
  
  // Fechar dropdown ao clicar fora
  useOnClickOutside(ref, () => setIsOpen(false));
  
  // Fechar dropdown ao pressionar Esc
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="icon"
        className="relative rounded-full bg-transparent border-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificações"
      >
        <Bell size={isMobile ? 20 : 22} className="text-navy dark:text-gold" />
        
        {/* Indicador de notificações não lidas */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
      
      {/* Dropdown de notificações */}
      {isOpen && (
        <NotificationDropdown onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
};

export default NotificationBell;
