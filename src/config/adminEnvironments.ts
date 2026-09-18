import {
  Building2,
  Calculator,
  ReceiptText,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export type AdminEnvironmentId = 'administrativo' | 'contabil' | 'fiscal' | 'pessoal';

export type AdminEnvironmentDefinition = {
  id: AdminEnvironmentId;
  title: string;
  shortLabel: string;
  description: string;
  route: string;
  icon: LucideIcon;
  summary: string;
  accent: string;
  soft: string;
};

export const adminEnvironments: AdminEnvironmentDefinition[] = [
  {
    id: 'administrativo',
    title: 'Ambiente Administrativo',
    shortLabel: 'Administrativo',
    description: 'Gestão do escritório, clientes, agenda, comunicação e configurações.',
    route: '/admin/administrativo',
    icon: Building2,
    summary: '10 ferramentas',
    accent: '#64748b',
    soft: 'rgba(100,116,139,.08)',
  },
  {
    id: 'contabil',
    title: 'Ambiente Contábil',
    shortLabel: 'Contábil',
    description: 'Visão mensal, lançamentos e documentos enviados pelos clientes.',
    route: '/admin/contabil',
    icon: Calculator,
    summary: '3 áreas',
    accent: '#627da3',
    soft: 'rgba(98,125,163,.09)',
  },
  {
    id: 'fiscal',
    title: 'Ambiente Fiscal',
    shortLabel: 'Fiscal',
    description: 'Centro fiscal interno com Emissor e Extrator em uma única conta WS.',
    route: '/admin/fiscal',
    icon: ReceiptText,
    summary: '2 produtos',
    accent: '#527d72',
    soft: 'rgba(82,125,114,.09)',
  },
  {
    id: 'pessoal',
    title: 'Ambiente Pessoal',
    shortLabel: 'Pessoal',
    description: 'Base do Departamento Pessoal e RH, preparada para as próximas rotinas.',
    route: '/admin/pessoal',
    icon: UsersRound,
    summary: 'Em estrutura',
    accent: '#766987',
    soft: 'rgba(118,105,135,.09)',
  },
];

export const resolveAdminEnvironment = (pathname: string): AdminEnvironmentId => {
  if (
    pathname.startsWith('/admin/contabil') ||
    pathname.startsWith('/admin/lancamentos') ||
    pathname.startsWith('/admin/documentos') ||
    pathname.startsWith('/admin/user-documents') ||
    pathname.startsWith('/admin/company-data')
  ) {
    return 'contabil';
  }
  if (pathname.startsWith('/admin/fiscal')) return 'fiscal';
  if (pathname.startsWith('/admin/pessoal')) return 'pessoal';
  return 'administrativo';
};

export const getAdminEnvironment = (id: AdminEnvironmentId) =>
  adminEnvironments.find(environment => environment.id === id) || adminEnvironments[0];
