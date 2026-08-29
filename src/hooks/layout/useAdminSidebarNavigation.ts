import { useLocation } from "react-router-dom";
import { LayoutDashboard, Users, PieChart, Calculator, Settings, Wrench, HardDrive, Megaphone, Calendar, Images, FileStack, LucideIcon, Building2, ReceiptText, Send } from "lucide-react";

interface SidebarItem { icon: LucideIcon; label: string; active: boolean; to: string; }
export interface SidebarSection { title: string; items: SidebarItem[]; }

export const useAdminSidebarNavigation = () => {
  const location = useLocation();
  const getIsActive = (path: string): boolean => path === "/admin" ? (location.pathname === "/admin" || location.pathname === "/admin/") : location.pathname.startsWith(path);

  const sidebarSections: SidebarSection[] = [
    { title: "Operação contábil", items: [
      { icon: LayoutDashboard, label: "Dashboard", active: getIsActive("/admin"), to: "/admin" },
      { icon: FileStack, label: "Lançamentos", active: getIsActive("/admin/lancamentos"), to: "/admin/lancamentos" },
      { icon: Calendar, label: "Agenda", active: getIsActive("/admin/agenda"), to: "/admin/agenda" },
      { icon: Calculator, label: "Simulações", active: getIsActive("/admin/simulations"), to: "/admin/simulations" }
    ]},
    { title: "Fiscal", items: [
      { icon: ReceiptText, label: "Notas Fiscais", active: getIsActive("/admin/feature"), to: "/admin/feature" },
      { icon: Send, label: "Emissão fiscal", active: getIsActive("/admin/fiscal/emissao"), to: "/admin/fiscal/emissao" }
    ]},
    { title: "Clientes e comunicação", items: [
      { icon: Building2, label: "Empresas", active: getIsActive("/admin/empresas") || getIsActive("/admin/fiscal/empresas"), to: "/admin/empresas" },
      { icon: Users, label: "Usuários", active: getIsActive("/admin/users") || getIsActive("/admin/user-documents") || getIsActive("/admin/company-data"), to: "/admin/users" },
      { icon: HardDrive, label: "Armazenamento", active: getIsActive("/admin/storage"), to: "/admin/storage" },
      { icon: Megaphone, label: "Anúncios", active: getIsActive("/admin/announcements"), to: "/admin/announcements" },
      { icon: PieChart, label: "Enquetes", active: getIsActive("/admin/polls"), to: "/admin/polls" }
    ]},
    { title: "Administração", items: [
      { icon: Images, label: "Carrossel", active: getIsActive("/admin/carousel"), to: "/admin/carousel" },
      { icon: Wrench, label: "Ferramentas", active: getIsActive("/admin/tools"), to: "/admin/tools" },
      { icon: Settings, label: "Configurações", active: getIsActive("/admin/settings"), to: "/admin/settings" }
    ]}
  ];

  return { sidebarSections, sidebarItems: sidebarSections.flatMap(section => section.items), currentPath: location.pathname };
};