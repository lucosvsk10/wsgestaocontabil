
import { useLocation } from "react-router-dom";
import { LayoutDashboard, Users, PieChart, Calculator, Settings, Wrench, HardDrive, Megaphone, Calendar, Images, Building, LucideIcon } from "lucide-react";

interface SidebarItem {
  icon: LucideIcon;
  label: string;
  active: boolean;
  to: string;
  badge?: string;
}

export const useAdminSidebarNavigation = () => {
  const location = useLocation();

  const getIsActive = (path: string): boolean => {
    return location.pathname === path;
  };

  const sidebarItems: SidebarItem[] = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      active: getIsActive("/admin") || getIsActive("/admin/"),
      to: "/admin"
    },
    {
      icon: Users,
      label: "Usuários",
      active: getIsActive("/admin/users"),
      to: "/admin/users"
    },
    {
      icon: HardDrive,
      label: "Armazenamento",
      active: getIsActive("/admin/storage"),
      to: "/admin/storage"
    },
    {
      icon: Calendar,
      label: "Agenda",
      active: getIsActive("/admin/agenda"),
      to: "/admin/agenda"
    },
    {
      icon: Images,
      label: "Carrossel",
      active: getIsActive("/admin/carousel"),
      to: "/admin/carousel"
    },
    {
      icon: PieChart,
      label: "Enquetes",
      active: getIsActive("/admin/polls"),
      to: "/admin/polls"
    },
    {
      icon: Wrench,
      label: "Ferramentas",
      active: getIsActive("/admin/tools"),
      to: "/admin/tools"
    },
    {
      icon: Building,
      label: "Gestor Fiscal",
      active: getIsActive("/admin/fiscal-manager"),
      to: "/admin/fiscal-manager",
      badge: "BETA"
    },
    {
      icon: Calculator,
      label: "Simulações",
      active: getIsActive("/admin/simulations"),
      to: "/admin/simulations"
    },
    {
      icon: Megaphone,
      label: "Anúncios",
      active: getIsActive("/admin/announcements"),
      to: "/admin/announcements"
    },
    {
      icon: Settings,
      label: "Configurações",
      active: getIsActive("/admin/settings"),
      to: "/admin/settings"
    }
  ];

  return {
    sidebarItems,
    currentPath: location.pathname
  };
};
