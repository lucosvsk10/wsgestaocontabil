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
  ReceiptText,
  Send,
  UsersRound,
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
      title: 'Administrativo',
      items: [
        { icon: LayoutDashboard, label: 'Visão geral', active: active('/admin/administrativo'), to: '/admin/administrativo' },
        { icon: Calendar, label: 'Agenda', active: active('/admin/agenda'), to: '/admin/agenda' },
        { icon: Calculator, label: 'Histórico de simulações', active: active('/admin/simulations'), to: '/admin/simulations' },
        {
          icon: Building2,
          label: 'Clientes',
          active: active('/admin/clientes') || active('/admin/assinantes') || active('/admin/fiscal/empresas'),
          to: '/admin/clientes',
        },
        { icon: HardDrive, label: 'Armazenamento', active: active('/admin/storage'), to: '/admin/storage' },
        { icon: Megaphone, label: 'Anúncios', active: active('/admin/announcements'), to: '/admin/announcements' },
        { icon: PieChart, label: 'Enquetes', active: active('/admin/polls'), to: '/admin/polls' },
        { icon: Images, label: 'Carrossel', active: active('/admin/carousel'), to: '/admin/carousel' },
        { icon: Wrench, label: 'Ferramentas', active: active('/admin/tools'), to: '/admin/tools' },
        { icon: Settings, label: 'Configurações', active: active('/admin/settings'), to: '/admin/settings' },
      ],
    },
  ];

  const accountingSections: SidebarSection[] = [
    {
      title: 'Contábil',
      items: [
        { icon: LayoutDashboard, label: 'Visão geral', active: active('/admin/contabil'), to: '/admin/contabil' },
        { icon: FileStack, label: 'Lançamentos', active: active('/admin/lancamentos'), to: '/admin/lancamentos' },
        {
          icon: FileText,
          label: 'Documentos do cliente',
          active: active('/admin/documentos') || active('/admin/user-documents'),
          to: '/admin/documentos',
        },
      ],
    },
  ];

  const fiscalSections: SidebarSection[] = [
    {
      title: 'Fiscal',
      items: [
        { icon: LayoutDashboard, label: 'Visão geral', active: active('/admin/fiscal'), to: '/admin/fiscal' },
        { icon: Send, label: 'Emissor Fiscal', active: false, to: '/app?source=admin-fiscal' },
        { icon: ReceiptText, label: 'Extrator Fiscal', active: false, to: '/extrator?source=admin-fiscal' },
      ],
    },
  ];

  const personalSections: SidebarSection[] = [
    {
      title: 'Pessoal',
      items: [
        { icon: UsersRound, label: 'Visão geral', active: active('/admin/pessoal'), to: '/admin/pessoal' },
      ],
    },
  ];

  const sidebarSections =
    environment === 'contabil'
      ? accountingSections
      : environment === 'fiscal'
        ? fiscalSections
        : environment === 'pessoal'
          ? personalSections
          : administrativeSections;

  return {
    sidebarSections,
    sidebarItems: sidebarSections.flatMap(section => section.items),
    currentPath: location.pathname,
    environment,
  };
};