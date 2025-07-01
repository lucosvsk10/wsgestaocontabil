
import { useLocation } from "react-router-dom";
import { LayoutDashboard, Users, PieChart, Calculator, Settings, Wrench, HardDrive, Megaphone, Calendar, Images, Receipt, FileText, UserCheck, Building2, LucideIcon } from "lucide-react";

interface SidebarItem {
  icon: LucideIcon;
  label: string;
  active: boolean;
  to: string;
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
      icon: Calculator,
      label: "Simulações",
      active: getIsActive("/admin/simulations"),
      to: "/admin/simulations"
    },
    {
      icon: Receipt,
      label: "Dashboard Fiscal",
      active: getIsActive("/admin/fiscal-dashboard"),
      to: "/admin/fiscal-dashboard"
    },
    {
      icon: FileText,
      label: "Notas Fiscais",
      active: getIsActive("/admin/fiscal-notes"),
      to: "/admin/fiscal-notes"
    },
    {
      icon: UserCheck,
      label: "Área do Contador",
      active: getIsActive("/admin/accountant-area"),
      to: "/admin/accountant-area"
    },
    {
      icon: Building2,
      label: "Automação Fiscal",
      active: getIsActive("/admin/fiscal-automation"),
      to: "/admin/fiscal-automation"
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
