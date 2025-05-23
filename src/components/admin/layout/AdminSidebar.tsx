
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { LayoutDashboard, Users, PieChart, Calculator, Settings, Wrench, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

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
  return <Link to={to} className={`flex items-center space-x-2 px-4 py-3 rounded-md transition-colors ${active 
    ? "bg-blue-50 text-blue-700 dark:bg-gold/10 dark:text-gold" 
    : "hover:bg-gray-100 dark:hover:bg-gold/10 text-gray-700 dark:text-[#d9d9d9]"}`} onClick={onClick}>
      <div className={active ? "text-blue-700 dark:text-gold" : "text-gray-500 dark:text-[#d9d9d9]"}>
        {icon}
      </div>
      <span className="font-medium">{label}</span>
    </Link>;
};

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  open,
  onClose
}) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { theme } = useTheme();

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
  
  const sidebarItems = [{
    icon: <LayoutDashboard size={20} />,
    label: "Dashboard",
    active: getIsActive("/admin") || getIsActive("/admin/"),
    to: "/admin"
  }, {
    icon: <Users size={20} />,
    label: "Usuários",
    active: getIsActive("/admin/users"),
    to: "/admin/users"
  }, {
    icon: <PieChart size={20} />,
    label: "Enquetes",
    active: getIsActive("/admin/polls"),
    to: "/admin/polls"
  }, {
    icon: <Wrench size={20} />,
    label: "Ferramentas",
    active: getIsActive("/admin/tools"),
    to: "/admin/tools"
  }, {
    icon: <Calculator size={20} />,
    label: "Simulações IRPF",
    active: getIsActive("/admin/tax-simulations"),
    to: "/admin/tax-simulations"
  }, {
    icon: <Settings size={20} />,
    label: "Configurações",
    active: getIsActive("/admin/settings"),
    to: "/admin/settings"
  }];
  
  return <aside data-sidebar="true" className={`w-64 shadow-md dark:bg-deepNavy border-r border-gray-200 dark:border-gold dark:border-opacity-20 flex flex-col transition-all duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-0 md:translate-x-0 md:w-16"} ${isMobile ? "fixed inset-y-0 z-40 shadow-xl" : ""}`}>
      {/* Logo area */}
      <div className="h-16 border-b border-gray-200 dark:border-gold dark:border-opacity-20 flex items-center justify-between px-4 bg-white dark:bg-deepNavy">
        <Link to="/" className="flex items-center justify-center">
          {open ? 
            <img src={theme === 'light' 
            ? "/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png" 
            : "/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png"} 
            alt="WS Gestão Contábil" 
            className="h-8" /> 
            : 
            <img 
              src={theme === 'light'
              ? "/lovable-uploads/83322e23-9ed8-4622-8631-8022a1d10c19.png"
              : "/lovable-uploads/ed055b1a-ba3e-4890-b78d-1d83e85b592b.png"} 
              alt="WS Gestão Contábil" 
              className="h-8 mx-auto" 
            />
          }
        </Link>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 dark:bg-deepNavy">
        <ul className="space-y-1">
          {sidebarItems.map(item => <li key={item.label}>
              {open || isMobile ? <SidebarItem icon={item.icon} label={item.label} active={item.active} to={item.to} /> : <div className={`flex justify-center p-3 rounded-md transition-colors ${item.active ? "bg-blue-50 dark:bg-gold/10" : "hover:bg-gray-100 dark:hover:bg-gold/10"}`} title={item.label}>
                  <Link to={item.to} className={item.active ? "text-blue-700 dark:text-gold" : "text-gray-500 dark:text-[#d9d9d9]"}>
                    {item.icon}
                  </Link>
                </div>}
            </li>)}
        </ul>
      </nav>
    </aside>;
};

export default AdminSidebar;
