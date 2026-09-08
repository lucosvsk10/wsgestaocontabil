
import { useSidebarHandlers } from "@/hooks/layout/useSidebarHandlers";
import { useClientSidebarNavigation } from "@/hooks/layout/useClientSidebarNavigation";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  active,
  onClick
}) => {
  return (
    <button 
      className={`client-portal-nav-item group ${
        active 
          ? "is-active"
          : ""
      }`} 
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <div className="client-portal-nav-icon">
        <Icon size={20} />
      </div>
      <span>{label}</span>
    </button>
  );
};

interface ClientSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ClientSidebar: React.FC<ClientSidebarProps> = ({ activeTab, setActiveTab, open, onOpenChange }) => {
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const { sidebarItems, handleItemClick } = useClientSidebarNavigation({ 
    activeTab, 
    setActiveTab, 
    isMobile, 
    onOpenChange 
  });

  // Use the custom hook for sidebar handlers
  useSidebarHandlers({ 
    isMobile, 
    open, 
    onClose: () => onOpenChange(false) 
  });

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => onOpenChange(false)}
        />
      )}
      
      <aside 
        data-sidebar="true" 
        className={`
          ${isMobile ? 'fixed' : 'relative'} 
          inset-y-0 left-0 z-50 
          w-72 flex flex-col 
          transition-transform duration-300 ease-in-out 
          client-portal-sidebar ${!open && !isMobile ? 'is-collapsed' : ''}
          ${isMobile 
            ? open 
              ? 'translate-x-0 shadow-2xl' 
              : '-translate-x-full'
            : open 
              ? 'translate-x-0' 
              : '-translate-x-0 md:translate-x-0 md:w-20'
          }
        `}
      >
        {/* Mobile close button */}
        {isMobile && open && (
            <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="client-portal-sidebar-close"
          >
            <X size={20} />
          </Button>
        )}

        {/* Logo area */}
        <div className="client-portal-brand">
          <Link to="/" className="flex items-center justify-center transition-all duration-300 hover:scale-105">
            {(open || isMobile) ? (
              <img 
                src={theme === 'light' 
                  ? "/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png" 
                  : "/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png"
                } 
                alt="WS Gestão Contábil" 
                className="h-8" 
              />
            ) : (
              <img 
                src={theme === 'light' 
                  ? "/lovable-uploads/83322e23-9ed8-4622-8631-8022a1d10c19.png" 
                  : "/lovable-uploads/ed055b1a-ba3e-4890-b78d-1d83e85b592b.png"
                } 
                alt="WS Gestão Contábil" 
                className="h-10" 
              />
            )}
          </Link>
        </div>
        
        {/* Navigation */}
        <nav className="client-portal-nav" aria-label="Navegação do portal">
          {sidebarItems.map(item => (
            <div key={item.label}>
              {(open || isMobile) ? (
                <SidebarItem 
                  icon={item.icon} 
                  label={item.label} 
                  active={item.active} 
                  onClick={() => handleItemClick(item.id)}
                />
              ) : (
                <div 
                  className={`client-portal-nav-collapsed ${
                    item.active 
                      ? "is-active"
                      : ""
                  }`} 
                  title={item.label}
                >
                  <button 
                    onClick={() => setActiveTab(item.id)}
                    className={`client-portal-nav-collapsed-button ${
                      item.active 
                        ? "is-active"
                        : ""
                    }`}
                  >
                    <item.icon size={20} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default ClientSidebar;
