
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { LayoutDashboard, Users, PieChart, Calculator, Settings, Wrench, X, HardDrive } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  to: string;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  active,
  to,
  onClick
}) => {
  return (
    <Link 
      to={to} 
      className={`flex items-center space-x-4 px-6 py-4 rounded-lg transition-all duration-300 ease-in-out group ${
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
        {icon}
      </div>
      <span className="tracking-wide text-sm font-extralight">{label}</span>
    </Link>
  );
};

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ open, onClose }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { theme } = useTheme();

  // Close sidebar on outside click for mobile
  useEffect(() => {
    if (isMobile && open) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-sidebar="true"]') && !target.closest('[data-sidebar-toggle="true"]')) {
          onClose();
        }
      };
      
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isMobile, onClose, open]);

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (isMobile && open) {
      onClose();
    }
  }, [location.pathname, isMobile, onClose, open]);

  const getIsActive = (path: string): boolean => {
    return location.pathname === path;
  };

  const sidebarItems = [
    {
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
      active: getIsActive("/admin") || getIsActive("/admin/"),
      to: "/admin"
    },
    {
      icon: <Users size={20} />,
      label: "Usuários",
      active: getIsActive("/admin/users"),
      to: "/admin/users"
    },
    {
      icon: <HardDrive size={20} />,
      label: "Armazenamento",
      active: getIsActive("/admin/storage"),
      to: "/admin/storage"
    },
    {
      icon: <PieChart size={20} />,
      label: "Enquetes",
      active: getIsActive("/admin/polls"),
      to: "/admin/polls"
    },
    {
      icon: <Wrench size={20} />,
      label: "Ferramentas",
      active: getIsActive("/admin/tools"),
      to: "/admin/tools"
    },
    {
      icon: <Calculator size={20} />,
      label: "Simulações IRPF",
      active: getIsActive("/admin/tax-simulations"),
      to: "/admin/tax-simulations"
    },
    {
      icon: <Settings size={20} />,
      label: "Configurações",
      active: getIsActive("/admin/settings"),
      to: "/admin/settings"
    }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
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
            onClick={onClose}
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
                  to={item.to} 
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
                  <Link 
                    to={item.to} 
                    className={`transition-colors duration-300 ${
                      item.active 
                        ? "text-[#efc349]" 
                        : "text-gray-500 dark:text-white/70 hover:text-[#efc349]"
                    }`}
                  >
                    {item.icon}
                  </Link>
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default AdminSidebar;
