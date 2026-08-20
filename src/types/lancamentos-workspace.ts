export type LancamentoModuleKey = 'despesas' | 'compras' | 'faturamento' | 'folha';

export type LancamentoModuleStatus =
  | 'bloqueado'
  | 'nao_iniciado'
  | 'recebido'
  | 'processando'
  | 'revisar'
  | 'lancado'
  | 'sem_movimento'
  | 'erro';

export interface LancamentoModuleSummary {
  key: LancamentoModuleKey;
  documents: number;
  entries: number;
  pending: number;
  errors: number;
  total: number;
  status: LancamentoModuleStatus;
  lastActivity: string | null;
}

export interface LancamentosCompanyContext {
  id: string;
  name: string;
  email: string;
}

export interface LancamentosWorkspaceData {
  company: LancamentosCompanyContext | null;
  hasChartOfAccounts: boolean;
  chartOfAccountsCount: number;
  confirmedMappings: number;
  isMonthClosed: boolean;
  modules: Record<LancamentoModuleKey, LancamentoModuleSummary>;
  totals: {
    documents: number;
    entries: number;
    pending: number;
    errors: number;
    value: number;
  };
  progress: number;
  currentStep: number;
}

export const LANCAMENTO_MODULE_KEYS: LancamentoModuleKey[] = [
  'despesas',
  'compras',
  'faturamento',
  'folha',
];

export const isResolvedModule = (status: LancamentoModuleStatus) =>
  status === 'lancado' || status === 'sem_movimento';
