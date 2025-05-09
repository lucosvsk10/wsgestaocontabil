
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  PieChart, 
  Calculator, 
  Settings 
} from "lucide-react";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
  to: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon, 
  label, 
  active, 
  onClick, 
  to 
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
  
  // Estado para rastrear a aba ativa
  const [activeTab, setActiveTab] = useState("");
  
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
    
    // Extrair o tab do pathname ou searchParams
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get("tab");
    
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (path === "/admin" || path === "/admin/") {
      setActiveTab("users");
    }
  }, [location.pathname, location.search, isMobile, onClose, open]);

  const sidebarItems = [
    { 
      icon: <LayoutDashboard size={20} />, 
      label: "Dashboard", 
      active: activeTab === "users" || location.pathname === "/admin" || location.pathname === "/admin/",
      to: "/admin?tab=users"
    },
    { 
      icon: <Users size={20} />, 
      label: "Usuários", 
      active: activeTab === "users",
      to: "/admin?tab=users"
    },
    { 
      icon: <FileText size={20} />, 
      label: "Documentos", 
      active: activeTab === "documents",
      to: "/admin?tab=documents"
    },
    { 
      icon: <PieChart size={20} />, 
      label: "Enquetes", 
      active: activeTab === "polls",
      to: "/admin?tab=polls"
    },
    { 
      icon: <PieChart size={20} />, 
      label: "Resultados", 
      active: activeTab === "poll-results",
      to: "/admin?tab=poll-results"
    },
    { 
      icon: <Calculator size={20} />, 
      label: "Simulações IRPF", 
      active: activeTab === "tax-simulations",
      to: "/admin?tab=tax-simulations"
    },
    { 
      icon: <Settings size={20} />, 
      label: "Configurações", 
      active: activeTab === "settings",
      to: "/admin?tab=settings"
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
