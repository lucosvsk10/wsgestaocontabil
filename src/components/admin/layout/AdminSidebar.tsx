import { useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Megaphone,
  Settings,
  HardDrive,
  Cog,
  Users,
  Images,
  Calculator
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { checkIsAdmin } from "@/utils/auth/userChecks";

interface SidebarProps {
  className?: string;
}

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData } = useAuth();
  const isAdmin = checkIsAdmin(userData, user?.email);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const activeTab = new URLSearchParams(location.search).get('tab') || '';

  const isCurrentPath = (path: string) => {
    return location.pathname === path;
  };

  const menuItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      current: isCurrentPath("/admin")
    },
    {
      name: "Usuários",
      href: "/admin?tab=users", 
      icon: Users,
      current: activeTab === "users"
    },
    {
      name: "Documentos",
      href: "/admin?tab=documents",
      icon: FileText,
      current: activeTab === "documents"
    },
    {
      name: "Enquetes",
      href: "/admin?tab=polls",
      icon: BarChart3,
      current: activeTab === "polls"
    },
    {
      name: "Anúncios",
      href: "/admin?tab=announcements",
      icon: Megaphone,
      current: activeTab === "announcements"
    },
    {
      name: "Carrossel",
      href: "/admin/carousel",
      icon: Images,
      current: isCurrentPath("/admin/carousel")
    },
    {
      name: "Simulações",
      href: "/admin?tab=simulations",
      icon: Calculator,
      current: activeTab === "simulations"
    },
    {
      name: "Ferramentas",
      href: "/admin?tab=tools",
      icon: Settings,
      current: activeTab === "tools"
    },
    {
      name: "Storage",
      href: "/admin?tab=storage",
      icon: HardDrive,
      current: activeTab === "storage"
    },
    {
      name: "Configurações",
      href: "/admin?tab=settings",
      icon: Cog,
      current: activeTab === "settings"
    }
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-r-[#efc349]/20 bg-white/95 px-3 py-4 pb-10 dark:bg-[#020817]/95 backdrop-blur-sm lg:block">
      {/* Brand */}
      <a href="/admin" className="mb-6 flex items-center space-x-3 self-center">
        <img
          src="/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png"
          className="h-8"
          alt="WS Gestão Contábil"
        />
      </a>

      {/* Menu */}
      <div className="flex flex-col gap-0.5">
        {menuItems.map((item) => (
          <Button
            key={item.name}
            variant="ghost"
            className={cn(
              "flex w-full items-center gap-2 px-2.5 py-2 font-medium transition-colors hover:text-black dark:hover:text-white",
              item.current
                ? "bg-[#efc349]/10 text-[#020817] dark:text-[#efc349]"
                : "text-gray-600 dark:text-gray-400"
            )}
            onClick={() => {
              navigate(item.href);
              closeMobileMenu();
            }}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.name}</span>
          </Button>
        ))}
      </div>

      {/* Profile */}
      <div className="mt-auto">
        <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
          <a href="#" className="group flex items-center space-x-3">
            <div className="h-9 w-9 overflow-hidden rounded-full bg-gray-50">
              <Avatar>
                <AvatarImage src={user?.photoURL || ""} />
                <AvatarFallback>{user?.email?.[0].toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1">
              <div className="truncate text-sm font-semibold text-[#020817] dark:text-white">
                {userData?.name || user?.displayName || "Usuário"}
              </div>
              <div className="truncate text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-900">
                {isAdmin ? "Administrador" : "Cliente"}
              </div>
            </div>
          </a>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
