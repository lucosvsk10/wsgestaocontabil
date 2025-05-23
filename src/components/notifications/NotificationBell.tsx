
import { useState, useRef } from "react";
import { Bell } from "lucide-react";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationDropdown from "./NotificationDropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { hasNewNotifications } = useNotifications();
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);
  
  console.log("Estado atual do indicador de novas notificações:", hasNewNotifications);
  
  // Close dropdown when clicking outside
  useOnClickOutside(ref, () => setIsOpen(false));

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
        
        {/* Indicador de novas notificações - bolinha azul conforme solicitado */}
        {hasNewNotifications && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] w-3 h-3 flex items-center justify-center rounded-full">
          </span>
        )}
      </Button>
      
      {/* Dropdown de notificações - exibido apenas quando isOpen é true */}
      {isOpen && (
        <NotificationDropdown onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
};

export default NotificationBell;
