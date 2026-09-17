export type FiscalHealthState = 'neutral' | 'ready' | 'healthy' | 'attention' | 'error';

export type FiscalMetric = {
  count: number;
  value: number;
  full_xml: number;
  pending_xml: number;
  previous_count: number;
  previous_value: number;
  count_delta_percent: number | null;
  value_delta_percent: number | null;
  last_document_at: string | null;
};

export type FiscalSyncSnapshot = {
  status: string | null;
  label: string;
  last_started_at: string | null;
  last_completed_at: string | null;
  last_failed_at?: string | null;
  next_scheduled_at: string | null;
  last_error: string | null;
  error_scope: 'external' | 'internal' | null;
  failure_count: number;
  fresh: boolean;
  paused: boolean;
  last_status_code?: string | null;
  last_status_message?: string | null;
  latest_number?: number | null;
  cursor_number?: number | null;
  scanned_numbers?: number | null;
  found_documents?: number | null;
  history_start_month?: string | null;
  backfill_days?: number | null;
  reconciliation_total?: number | null;
  reconciliation_resolved?: number | null;
  reconciliation_pending?: number | null;
  xml_expected?: number | null;
  xml_saved?: number | null;
  xml_pending?: number | null;
  detail_expected?: number | null;
  detail_saved?: number | null;
  detail_pending?: number | null;
};

export type FiscalHealthTimelineItem = {
  at: string;
  kind: 'purchase' | 'sale' | 'watchdog' | 'recovery' | 'error';
  title: string;
  detail: string;
  status: 'ok' | 'attention' | 'error' | 'neutral';
};

export type FiscalHealthCompany = {
  office_company_id: string;
  fiscal_company_id: string | null;
  company_name: string;
  trade_name: string | null;
  cnpj: string | null;
  uf: string | null;
  state: FiscalHealthState;
  state_label: string;
  state_detail: string;
  reason_code: string;
  capture_enabled: boolean;
  can_start: boolean;
  certificate_status: 'missing' | 'valid' | 'expired';
  certificate_valid_until: string | null;
  has_state_credentials: boolean;
  last_checked_at: string | null;
  purchase: FiscalSyncSnapshot | null;
  sales: FiscalSyncSnapshot | null;
  metrics: {
    period_days: number;
    period_start: string;
    period_end: string;
    previous_start: string;
    purchases: FiscalMetric;
    sales: FiscalMetric;
  };
  technical_window: {
    purchases: string;
    sales: string;
  };
  timeline: FiscalHealthTimelineItem[];
};

export type FiscalHealthResponse = {
  ok: boolean;
  generated_at: string;
  period_days: number;
  summary: {
    total: number;
    monitored: number;
    healthy: number;
    ready: number;
    attention: number;
    error: number;
    neutral: number;
  };
  cadence: {
    purchases_minutes: number;
    sales_hours: number;
    watchdog_minutes: number;
    xml_backfill_minutes: number;
  };
  company_health: FiscalHealthCompany[];
};

export const FISCAL_HEALTH_STATES: Array<{ value: 'all' | FiscalHealthState; label: string }> = [
  { value: 'all', label: 'Todos os status' },
  { value: 'healthy', label: 'Saudáveis' },
  { value: 'ready', label: 'Prontas' },
  { value: 'attention', label: 'Atenção' },
  { value: 'error', label: 'Falhas' },
  { value: 'neutral', label: 'Sem captura' },
];

export const fiscalHealthTone = (state: FiscalHealthState) => {
  switch (state) {
    case 'healthy':
      return {
        dot: 'bg-emerald-500',
        soft: 'border-emerald-500/20 bg-emerald-500/[.07] text-emerald-700 dark:text-emerald-300',
        text: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'ready':
      return {
        dot: 'bg-sky-500',
        soft: 'border-sky-500/20 bg-sky-500/[.07] text-sky-700 dark:text-sky-300',
        text: 'text-sky-600 dark:text-sky-400',
      };
    case 'attention':
      return {
        dot: 'bg-amber-500',
        soft: 'border-amber-500/20 bg-amber-500/[.07] text-amber-700 dark:text-amber-300',
        text: 'text-amber-600 dark:text-amber-400',
      };
    case 'error':
      return {
        dot: 'bg-red-500',
        soft: 'border-red-500/20 bg-red-500/[.07] text-red-700 dark:text-red-300',
        text: 'text-red-600 dark:text-red-400',
      };
    default:
      return {
        dot: 'bg-slate-400',
        soft: 'border-border/70 bg-muted/30 text-muted-foreground',
        text: 'text-muted-foreground',
      };
  }
};

export const formatFiscalDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

export const formatFiscalMoney = (value?: number | null) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

export const fiscalHealthTooltipLines = (company: FiscalHealthCompany) => {
  const lines = [company.state_label];
  if (company.certificate_status === 'valid') {
    lines.push(`A1 válido${company.certificate_valid_until ? ` até ${new Date(`${company.certificate_valid_until}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}`);
  } else if (company.certificate_status === 'expired') {
    lines.push('Certificado A1 vencido');
  } else {
    lines.push('Captura fiscal não configurada');
  }
  if (company.purchase?.last_completed_at) lines.push(`Compras: ${formatFiscalDate(company.purchase.last_completed_at)}`);
  if (company.sales?.last_completed_at) lines.push(`Vendas: ${formatFiscalDate(company.sales.last_completed_at)}`);
  return lines;
};
