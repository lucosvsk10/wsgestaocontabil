
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
      className={`flex items-center space-x-4 px-6 py-4 rounded-lg transition-all duration-300 ease-in-out group w-full ${
        active 
          ? "bg-[#efc349]/10 text-[#efc349] border-l-4 border-[#efc349]" 
          : "text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-[#efc349]/5 hover:text-[#020817] dark:hover:text-[#efc349]"
      }`} 
      onClick={onClick}
    >
      <div className={`transition-all duration-300 ${
        active 
          ? "text-[#efc349] scale-110" 
          : "text-gray-500 dark:text-white/70 group-hover:text-[#efc349] group-hover:scale-105"
      }`}>
        <Icon size={20} />
      </div>
      <span className="tracking-wide text-sm font-extralight">{label}</span>
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
          bg-white dark:bg-[#020817] 
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
            className="absolute top-4 right-4 z-10 text-gray-500 dark:text-white/70 hover:text-[#efc349]"
          >
            <X size={20} />
          </Button>
        )}

        {/* Logo area */}
        <div className="h-20 flex items-center justify-center px-6 border-b border-gray-100 dark:border-[#020817]">
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
        <nav className="flex-1 overflow-y-auto py-8 px-3 space-y-2">
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
                  className={`flex justify-center p-4 rounded-lg transition-all duration-300 hover:scale-110 ${
                    item.active 
                      ? "bg-[#efc349]/10 border-l-4 border-[#efc349]" 
                      : "hover:bg-gray-100 dark:hover:bg-[#efc349]/10"
                  }`} 
                  title={item.label}
                >
                  <button 
                    onClick={() => setActiveTab(item.id)}
                    className={`transition-colors duration-300 ${
                      item.active 
                        ? "text-[#efc349]" 
                        : "text-gray-500 dark:text-white/70 hover:text-[#efc349]"
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
