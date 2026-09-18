import { Building2, Calculator, ReceiptText, UsersRound, type LucideIcon } from 'lucide-react';

export type AdminEnvironmentId = 'administrativo' | 'contabil' | 'fiscal' | 'pessoal';

export type AdminEnvironmentDefinition = {
  id: AdminEnvironmentId;
  title: string;
  shortLabel: string;
  description: string;
  route: string;
  icon: LucideIcon;
  status?: string;
};

export const adminEnvironments: AdminEnvironmentDefinition[] = [
  {
    id: 'administrativo',
    title: 'Ambiente Administrativo',
    shortLabel: 'Administrativo',
    description: 'Gestão do escritório, clientes, agenda, comunicação e configurações.',
    route: '/admin/administrativo',
    icon: Building2,
  },
  {
    id: 'contabil',
    title: 'Ambiente Contábil',
    shortLabel: 'Contábil',
    description: 'Lançamentos contábeis e documentos enviados pelos clientes.',
    route: '/admin/lancamentos',
    icon: Calculator,
  },
  {
    id: 'fiscal',
    title: 'Ambiente Fiscal',
    shortLabel: 'Fiscal',
    description: 'Acesso interno ao Emissor Fiscal e ao Extrator Fiscal.',
    route: '/admin/ambientes/fiscal',
    icon: ReceiptText,
  },
  {
    id: 'pessoal',
    title: 'Ambiente Pessoal',
    shortLabel: 'Pessoal',
    description: 'Estrutura reservada para Departamento Pessoal e RH.',
    route: '/admin/pessoal',
    icon: UsersRound,
    status: 'Em breve',
  },
];

export const resolveAdminEnvironment = (pathname: string): AdminEnvironmentId => {
  if (
    pathname.startsWith('/admin/lancamentos') ||
    pathname.startsWith('/admin/documentos') ||
    pathname.startsWith('/admin/user-documents') ||
    pathname.startsWith('/admin/company-data')
  ) {
    return 'contabil';
  }
  if (pathname.startsWith('/admin/ambientes/fiscal')) return 'fiscal';
  if (pathname.startsWith('/admin/pessoal')) return 'pessoal';
  return 'administrativo';
};

export const getAdminEnvironment = (id: AdminEnvironmentId) =>
  adminEnvironments.find(environment => environment.id === id) || adminEnvironments[0];
