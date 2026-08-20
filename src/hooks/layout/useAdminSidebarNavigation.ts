
import { useLocation } from "react-router-dom";
import { LayoutDashboard, Users, PieChart, Calculator, Settings, Wrench, HardDrive, Megaphone, Calendar, Images, FileStack, LucideIcon } from "lucide-react";

interface SidebarItem {
  icon: LucideIcon;
  label: string;
  active: boolean;
  to: string;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export const useAdminSidebarNavigation = () => {
  const location = useLocation();

  const getIsActive = (path: string): boolean => {
    return location.pathname === path;
  };

  const sidebarSections: SidebarSection[] = [
    {
      title: "Visão geral",
      items: [
        {
          icon: LayoutDashboard,
          label: "Dashboard",
          active: getIsActive("/admin") || getIsActive("/admin/"),
          to: "/admin"
        }
      ]
    },
    {
      title: "Contabilidade",
      items: [
        {
          icon: FileStack,
          label: "Lançamentos",
          active: location.pathname.startsWith("/admin/lancamentos"),
          to: "/admin/lancamentos"
        },
        {
          icon: Calculator,
          label: "Simulações",
          active: getIsActive("/admin/simulations"),
          to: "/admin/simulations"
        },
        {
          icon: Calendar,
          label: "Agenda",
          active: getIsActive("/admin/agenda"),
          to: "/admin/agenda"
        }
      ]
    },
    {
      title: "Clientes",
      items: [
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
        }
      ]
    },
    {
      title: "Comunicação",
      items: [
        {
          icon: Megaphone,
          label: "Anúncios",
          active: getIsActive("/admin/announcements"),
          to: "/admin/announcements"
        },
        {
          icon: PieChart,
          label: "Enquetes",
          active: getIsActive("/admin/polls"),
          to: "/admin/polls"
        },
        {
          icon: Images,
          label: "Carrossel",
          active: getIsActive("/admin/carousel"),
          to: "/admin/carousel"
        }
      ]
    },
    {
      title: "Sistema",
      items: [
        {
          icon: Wrench,
          label: "Ferramentas",
          active: getIsActive("/admin/tools"),
          to: "/admin/tools"
        },
        {
          icon: Settings,
          label: "Configurações",
          active: getIsActive("/admin/settings"),
          to: "/admin/settings"
        }
      ]
    }
  ];

  const sidebarItems: SidebarItem[] = sidebarSections.flatMap(section => section.items);

  return {
    sidebarSections,
    sidebarItems,
    currentPath: location.pathname
  };
};
