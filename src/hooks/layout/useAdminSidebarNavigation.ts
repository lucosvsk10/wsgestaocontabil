import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PieChart,
  Calculator,
  Settings,
  Wrench,
  HardDrive,
  Megaphone,
  Calendar,
  Images,
  FileStack,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import { resolveAdminEnvironment, type AdminEnvironmentId } from '@/config/adminEnvironments';

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
  const environment: AdminEnvironmentId = resolveAdminEnvironment(location.pathname);
  const active = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const administrativeSections: SidebarSection[] = [
    {
      title: 'Ambiente Administrativo',
      items: [
        {
          icon: LayoutDashboard,
          label: 'Dashboard',
          active: active('/admin/administrativo'),
          to: '/admin/administrativo',
        },
        { icon: Calendar, label: 'Agenda', active: active('/admin/agenda'), to: '/admin/agenda' },
        {
          icon: Calculator,
          label: 'Histórico de simulações',
          active: active('/admin/simulations'),
          to: '/admin/simulations',
        },
        {
          icon: Building2,
          label: 'Clientes',
          active:
            active('/admin/clientes') ||
            active('/admin/assinantes') ||
            active('/admin/fiscal/empresas'),
          to: '/admin/clientes',
        },
        { icon: HardDrive, label: 'Armazenamento', active: active('/admin/storage'), to: '/admin/storage' },
        {
          icon: Megaphone,
          label: 'Anúncios',
          active: active('/admin/announcements'),
          to: '/admin/announcements',
        },
        { icon: PieChart, label: 'Enquetes', active: active('/admin/polls'), to: '/admin/polls' },
        { icon: Images, label: 'Carrossel', active: active('/admin/carousel'), to: '/admin/carousel' },
        { icon: Wrench, label: 'Ferramentas', active: active('/admin/tools'), to: '/admin/tools' },
        {
          icon: Settings,
          label: 'Configurações',
          active: active('/admin/settings'),
          to: '/admin/settings',
        },
      ],
    },
  ];

  const accountingSections: SidebarSection[] = [
    {
      title: 'Ambiente Contábil',
      items: [
        {
          icon: FileStack,
          label: 'Lançamentos',
          active: active('/admin/lancamentos'),
          to: '/admin/lancamentos',
        },
        {
          icon: FileText,
          label: 'Documentos do cliente',
          active: active('/admin/documentos') || active('/admin/user-documents'),
          to: '/admin/documentos',
        },
      ],
    },
  ];

  const sidebarSections =
    environment === 'contabil'
      ? accountingSections
      : environment === 'administrativo'
        ? administrativeSections
        : [];

  return {
    sidebarSections,
    sidebarItems: sidebarSections.flatMap(section => section.items),
    currentPath: location.pathname,
    environment,
  };
};
