
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  PieChart, 
  Settings, 
  Calculator 
} from "lucide-react";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
  to?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon, 
  label, 
  active, 
  onClick, 
  to = "#" 
}) => {
  return (
    <Link
      to={to}
      className={`flex items-center space-x-2 px-4 py-3 rounded-md transition-colors ${
        active 
          ? "bg-gold/10 text-navy dark:text-gold" 
          : "hover:bg-gray-100 dark:hover:bg-[#2a2a2a]"
      }`}
      onClick={onClick}
    >
      <div className="text-navy dark:text-gold">
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
  
  // Close sidebar when clicking outside on mobile
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
  
  // Handle route changes
  useEffect(() => {
    if (isMobile && open) {
      onClose();
    }
  }, [location.pathname, isMobile, onClose, open]);

  const sidebarItems = [
    { 
      icon: <LayoutDashboard size={20} />, 
      label: "Dashboard", 
      active: location.pathname === "/admin" || location.pathname === "/admin-dashboard",
      to: "/admin-dashboard"
    },
    { 
      icon: <Users size={20} />, 
      label: "Usuários", 
      active: location.pathname.includes("users"),
      to: "/admin-dashboard?tab=users"
    },
    { 
      icon: <FileText size={20} />, 
      label: "Documentos", 
      active: location.pathname.includes("documents"),
      to: "/admin-dashboard?tab=documents" 
    },
    { 
      icon: <PieChart size={20} />, 
      label: "Enquetes", 
      active: location.pathname.includes("polls"),
      to: "/admin-dashboard?tab=polls"
    },
    { 
      icon: <Calculator size={20} />, 
      label: "Ferramentas", 
      active: location.pathname.includes("tools"),
      to: "/admin-dashboard?tab=tax-simulations"
    },
    { 
      icon: <Settings size={20} />, 
      label: "Configurações", 
      active: location.pathname.includes("settings"),
      to: "#"
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
                  <Link to={item.to} className="text-navy dark:text-gold">
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
