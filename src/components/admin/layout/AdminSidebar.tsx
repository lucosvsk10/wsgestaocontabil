
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  LayoutDashboard, 
  Users, 
  PieChart,
  Calculator, 
  Settings,
  Wrench
} from "lucide-react";

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
      className={`flex items-center space-x-2 px-4 py-3 rounded-md transition-colors ${
        active 
          ? "bg-gold/10 text-navy dark:text-gold" 
          : "hover:bg-gray-100 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-gray-300"
      }`}
      onClick={onClick}
    >
      <div className={active ? "text-navy dark:text-gold" : "text-gray-500 dark:text-gray-400"}>
        {icon}
      </div>
      <span className="font-medium">{label}</span>
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
  
  // Fecha a barra lateral quando clica fora em dispositivos móveis
  useEffect(() => {
    if (isMobile) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-sidebar="true"]') && open) {
          onClose();
        }
      };
      
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isMobile, onClose, open]);
  
  // Lidar com mudanças de rota
  useEffect(() => {
    if (isMobile && open) {
      onClose();
    }
  }, [location.pathname, isMobile, onClose, open]);
  
  // Determine which route is active
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
      icon: <PieChart size={20} />, 
      label: "Enquetes", 
      active: getIsActive("/admin/polls"),
      to: "/admin/polls"
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
    <aside 
      data-sidebar="true"
      className={`w-64 bg-white dark:bg-[#1E1E1E] border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out ${
        open 
          ? "translate-x-0" 
          : "-translate-x-full md:translate-x-0 md:w-16"
      } ${isMobile ? "fixed inset-y-0 z-40 shadow-xl" : ""}`}
    >
      {/* Logo area */}
      <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-center">
        <h1 className={`font-bold text-navy dark:text-gold text-lg ${!open && !isMobile ? "hidden" : ""}`}>
          WS Gestão
        </h1>
        {!open && !isMobile && (
          <span className="font-bold text-navy dark:text-gold text-lg">WS</span>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {sidebarItems.map((item) => (
            <li key={item.label}>
              {open || isMobile ? (
                <SidebarItem
                  icon={item.icon}
                  label={item.label}
                  active={item.active}
                  to={item.to}
                />
              ) : (
                <div 
                  className={`flex justify-center p-3 rounded-md transition-colors ${
                    item.active 
                      ? "bg-gold/10" 
                      : "hover:bg-gray-100 dark:hover:bg-[#2a2a2a]"
                  }`}
                  title={item.label}
                >
                  <Link to={item.to} className={item.active ? "text-navy dark:text-gold" : "text-gray-500 dark:text-gray-400"}>
                    {item.icon}
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        {open || isMobile ? (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            WS Gestão Contábil © {new Date().getFullYear()}
          </div>
        ) : null}
      </div>
    </aside>
  );
};

export default AdminSidebar;
