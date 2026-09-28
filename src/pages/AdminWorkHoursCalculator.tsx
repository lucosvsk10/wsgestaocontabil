import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  History,
  Upload,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import {
  AdminEmptyState,
  AdminLoadingState,
  AdminPage,
  AdminPageHeader,
  AdminSection,
} from '@/components/admin/ui/AdminPage';
import WeeklyScheduleEditor from '@/components/admin/hr/WeeklyScheduleEditor';
import MonthlyCalculationsTable from '@/components/admin/hr/MonthlyCalculationsTable';
import PointMirrorImportPanel from '@/components/admin/hr/PointMirrorImportPanel';
import type { PointMirrorEmployee } from '@/lib/hr/pointMirrorImport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateWorkHours,
  emptyWeeklySchedule,
  emptyWorkHoursForm,
  formatCurrency,
  formatMinutes,
  NATIONAL_MINIMUM_WAGE_2026,
  resolveMoneyAdjustment,
  weeklyScheduleMinutes,
  type EmploymentType,
  type MoneyAdjustment,
  type WeeklyDaySchedule,
  type WorkHoursForm,
} from '@/lib/hr/workHours';

type EmployeeRow = {
  id: string;
  company_id?: string | null;
  name: string;
  cpf: string | null;
  employment_type: EmploymentType;
  base_salary: number;
  hourly_rate: number;
  monthly_hours: number;
  daily_hours: number;
  absence_day_divisor: number;
  overtime_50_percent: number;
  overtime_100_percent: number;
  night_percent: number;
  holiday_percent: number;
  weekly_schedule?: WeeklyDaySchedule[] | null;
  active: boolean;
  registration?: string | null;
  pis?: string | null;
  admission_date?: string | null;
  role_title?: string | null;
  department?: string | null;
  employer_name?: string | null;
  employer_cnpj?: string | null;
  bank_hours_start_date?: string | null;
  schedule_label?: string | null;
  source_metadata?: any;
  created_at?: string;
  updated_at?: string;
};

type CalculationRow = {
  id: string;
  company_id?: string | null;
  employee_id: string;
  competence: string;
  status: 'draft' | 'finalized';
  employee_name_snapshot: string;
  form_data: WorkHoursForm;
  result_data: any;
  created_at?: string;
  updated_at?: string;
  finalized_at?: string | null;
  source_type?: string | null;
  source_metadata?: any;
  imported_punches?: any[];
};

type PageView = 'schedule' | 'events' | 'summary' | 'history' | 'import';

const currentCompetence = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const competenceDate = (value: string) => `${value}-01`;

const formatCompetence = (value: string) => {
  const [year, month] = String(value || '').slice(0, 7).split('-');
  if (!year || !month) return value;
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const numberValue = (value: unknown) => {
  const next = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(next) ? next : 0;
};

const localKey = (kind: string, userId: string) => `ws:hr:global:${kind}:${userId}`;
const draftKey = (userId: string, employeeId: string, competence: string) =>
  `ws:hr:global:hours:draft:${userId}:${employeeId}:${competence}`;
const lastKey = (userId: string) => `ws:hr:global:hours:last:${userId}`;

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best effort fallback while the database storage is unavailable.
  }
}

function migrateLegacyLocalHrData(userId: string) {
  try {
    const employeePrefix = `ws:hr:employees:${userId}:`;
    const calculationPrefix = `ws:hr:calculations:${userId}:`;
    const employeesById = new Map<string, EmployeeRow>();
    const calculationsByKey = new Map<string, CalculationRow>();

    const currentEmployees = readLocal<EmployeeRow[]>(localKey('employees', userId), []);
    currentEmployees.forEach(item => employeesById.set(item.id, item));
    const currentCalculations = readLocal<CalculationRow[]>(localKey('calculations', userId), []);
    currentCalculations.forEach(item =>
      calculationsByKey.set(`${item.employee_id}:${item.competence}`, item),
    );

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index) || '';
      if (key.startsWith(employeePrefix)) {
        readLocal<EmployeeRow[]>(key, []).forEach(item => employeesById.set(item.id, item));
      }
      if (key.startsWith(calculationPrefix)) {
        readLocal<CalculationRow[]>(key, []).forEach(item =>
          calculationsByKey.set(`${item.employee_id}:${item.competence}`, item),
        );
      }
    }

    if (employeesById.size) writeLocal(localKey('employees', userId), [...employeesById.values()]);
    if (calculationsByKey.size) {
      writeLocal(localKey('calculations', userId), [...calculationsByKey.values()]);
    }
  } catch {
    // Migration is best effort and never blocks the calculator.
  }
}

function isMissingHrStorage(error: any) {
  const text = String(error?.message || error?.details || '').toLowerCase();
  return (
    error?.code === '42P01' ||
    text.includes('hr_employees') ||
    text.includes('hr_work_hour_calculations') ||
    text.includes('weekly_schedule') ||
    text.includes('imported_punches') ||
    text.includes('source_type') ||
    (text.includes('company_id') && text.includes('null'))
  );
}

function normalizeWeeklySchedule(value?: WeeklyDaySchedule[] | null) {
  const fallback = emptyWeeklySchedule();
  if (!Array.isArray(value) || !value.length) return fallback;
  return fallback.map(defaultDay => {
    const saved = value.find(day => day?.key === defaultDay.key);
    return saved ? { ...defaultDay, ...saved } : defaultDay;
  });
}

function employeeDefaults(employee: EmployeeRow): WorkHoursForm {
  return {
    ...emptyWorkHoursForm(),
    employmentType: employee.employment_type,
    baseSalary: Number(employee.base_salary || NATIONAL_MINIMUM_WAGE_2026),
    hourlyRate: Number(employee.hourly_rate || 0),
    monthlyHours: Number(employee.monthly_hours || 220),
    dailyHours: Number(employee.daily_hours || 8),
    absenceDayDivisor: Number(employee.absence_day_divisor || 30),
    overtime50Percent: Number(employee.overtime_50_percent || 50),
    overtime100Percent: Number(employee.overtime_100_percent || 100),
    nightPercent: Number(employee.night_percent || 20),
    holidayPercent: Number(employee.holiday_percent || 100),
    weeklySchedule: normalizeWeeklySchedule(employee.weekly_schedule),
  };
}

function restoreForm(value?: Partial<WorkHoursForm> | null): WorkHoursForm {
  const base = emptyWorkHoursForm();
  return {
    ...base,
    ...(value || {}),
    weeklySchedule: normalizeWeeklySchedule(value?.weeklySchedule),
    otherAdditions: Array.isArray(value?.otherAdditions) ? value!.otherAdditions! : [],
    otherDeductions: Array.isArray(value?.otherDeductions) ? value!.otherDeductions! : [],
  };
}

function TimeInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-foreground">{label}</span>
      <Input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="00:00"
        inputMode="decimal"
        className="mt-1.5 h-10"
      />
      {hint && <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{hint}</span>}
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = '0.01',
  min = 0,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
  min?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-foreground">{label}</span>
      <div className="relative mt-1.5">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={event => onChange(numberValue(event.target.value))}
          className={`h-10 ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{hint}</span>}
    </label>
  );
}

const ADDITION_OPTIONS = [
  ['commission', 'Comissão'],
  ['gratification', 'Gratificação'],
  ['bonus', 'Bonificação'],
  ['prize', 'Prêmio'],
  ['function_allowance', 'Adicional de função'],
  ['production', 'Produção'],
  ['cost_allowance', 'Ajuda de custo'],
  ['other', 'Outro'],
] as const;

const DEDUCTION_OPTIONS = [
  ['salary_advance', 'Adiantamento salarial'],
  ['transport', 'Vale-transporte'],
  ['alimony', 'Pensão alimentícia'],
  ['health_plan', 'Plano de saúde'],
  ['loan', 'Empréstimo / consignado'],
  ['contribution', 'Contribuição'],
  ['authorized', 'Desconto autorizado'],
  ['other', 'Outro'],
] as const;

function AdjustmentRows({
  rows,
  onChange,
  onAdd,
  onRemove,
  kind,
  basePay,
}: {
  rows: MoneyAdjustment[];
  onChange: (rows: MoneyAdjustment[]) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  kind: 'addition' | 'deduction';
  basePay: number;
}) {
  const options = kind === 'addition' ? ADDITION_OPTIONS : DEDUCTION_OPTIONS;
  const knownCategories = new Set(options.map(([value]) => value));

  const patchRow = (id: string, patch: Partial<MoneyAdjustment>) => {
    onChange(rows.map(item => (item.id === id ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-3">
      {rows.map(row => {
        const category = row.category && knownCategories.has(row.category as any) ? row.category : 'other';
        const mode = row.mode === 'percent' ? 'percent' : 'fixed';
        const resolved = resolveMoneyAdjustment(row, basePay);

        return (
          <div key={row.id} className="rounded-lg border border-transparent p-3">
            <div className="grid gap-2 md:grid-cols-[minmax(180px,1.25fr)_120px_140px_110px_40px] md:items-end">
              <label className="block">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-[.06em] text-muted-foreground">
                  Tipo
                </span>
                <select
                  value={category}
                  onChange={event => {
                    const nextCategory = event.target.value;
                    const selected = options.find(([value]) => value === nextCategory);
                    patchRow(row.id, {
                      category: nextCategory,
                      label: nextCategory === 'other' ? '' : selected?.[1] || row.label,
                    });
                  }}
                  className="h-10 w-full rounded-md border border-transparent bg-muted/20 px-3 text-sm"
                >
                  {options.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-[.06em] text-muted-foreground">
                  Forma
                </span>
                <select
                  value={mode}
                  onChange={event =>
                    patchRow(row.id, { mode: event.target.value === 'percent' ? 'percent' : 'fixed' })
                  }
                  className="h-10 w-full rounded-md border border-transparent bg-muted/20 px-3 text-sm"
                >
                  <option value="fixed">R$ fixo</option>
                  <option value="percent">% da base</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-[.06em] text-muted-foreground">
                  {mode === 'percent' ? 'Percentual' : 'Valor'}
                </span>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.amount}
                    onChange={event => patchRow(row.id, { amount: numberValue(event.target.value) })}
                    className={`h-10 ${mode === 'percent' ? 'pr-8' : 'pl-9'}`}
                  />
                  <span
                    className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground ${
                      mode === 'percent' ? 'right-3' : 'left-3'
                    }`}
                  >
                    {mode === 'percent' ? '%' : 'R$'}
                  </span>
                </div>
              </label>

              <div className="min-w-0">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-[.06em] text-muted-foreground">
                  Calculado
                </span>
                <div className="flex h-10 items-center rounded-md bg-muted/25 px-3 text-sm font-semibold tabular-nums">
                  {kind === 'deduction' ? '-' : '+'}{formatCurrency(resolved)}
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-0 h-10 w-10"
                onClick={() => onRemove(row.id)}
                aria-label="Remover lançamento"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {category === 'other' && (
              <label className="mt-2 block">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-[.06em] text-muted-foreground">
                  Descrição
                </span>
                <Input
                  value={row.label}
                  onChange={event => patchRow(row.id, { label: event.target.value })}
                  placeholder={kind === 'addition' ? 'Ex.: bônus especial' : 'Ex.: desconto acordado'}
                  className="h-9"
                />
              </label>
            )}

            {mode === 'percent' && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                {row.amount || 0}% calculado sobre {formatCurrency(basePay)} de salário/base nesta competência.
              </p>
            )}
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {kind === 'addition' ? 'Adicionar acréscimo' : 'Adicionar desconto'}
      </Button>
    </div>
  );
}

type PrimaryArea = 'manual' | 'history' | 'import';
type ManualStep = 'schedule' | 'events' | 'summary';

function PrimaryNavigation({
  value,
  onChange,
}: {
  value: PrimaryArea;
  onChange: (value: PrimaryArea) => void;
}) {
  const items: Array<{
    key: PrimaryArea;
    label: string;
    description: string;
    icon: typeof Clock3;
  }> = [
    {
      key: 'manual',
      label: 'Cálculo manual',
      description: 'Jornada, ocorrências e fechamento',
      icon: Clock3,
    },
    {
      key: 'history',
      label: 'Controle',
      description: 'Rascunhos e cálculos de todos',
      icon: History,
    },
    {
      key: 'import',
      label: 'Importar ponto',
      description: 'Ler PDF e criar cadastros',
      icon: Upload,
    },
  ];

  return (
    <div className="grid gap-2 rounded-2xl bg-muted/15 p-2 md:grid-cols-3">
      {items.map(item => {
        const Icon = item.icon;
        const active = value === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`flex min-w-0 items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition-colors ${
              active
                ? 'bg-muted/55 text-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              active ? 'bg-background/60 text-foreground' : 'bg-muted/25'
            }`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <b className="block text-sm font-semibold">{item.label}</b>
              <span className="mt-0.5 block truncate text-[11px] font-normal opacity-75">
                {item.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ManualStepTabs({
  value,
  onChange,
}: {
  value: ManualStep;
  onChange: (value: ManualStep) => void;
}) {
  const tabs: Array<{ key: ManualStep; label: string; number: number }> = [
    { key: 'schedule', label: 'Jornada', number: 1 },
    { key: 'events', label: 'Ocorrências', number: 2 },
    { key: 'summary', label: 'Resumo', number: 3 },
  ];

  return (
    <div className="flex flex-wrap gap-2 bg-muted/10 p-3">
      {tabs.map(tab => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-2 rounded-lg border border-transparent px-3.5 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-muted/55 text-foreground'
                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
              active ? 'bg-foreground text-background' : 'bg-muted/40'
            }`}>
              {tab.number}
            </span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AdminWorkHoursCalculator() {
  const { user } = useAuth();
  const [view, setView] = useState<PageView>('schedule');
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [history, setHistory] = useState<CalculationRow[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [competence, setCompetence] = useState(currentCompetence);
  const [form, setForm] = useState<WorkHoursForm>(emptyWorkHoursForm);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [recordStatus, setRecordStatus] = useState<'draft' | 'finalized'>('draft');
  const [storageMode, setStorageMode] = useState<'database' | 'local'>('database');
  const [loading, setLoading] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    cpf: '',
    employmentType: 'monthly' as EmploymentType,
    baseSalary: NATIONAL_MINIMUM_WAGE_2026,
    hourlyRate: 0,
    monthlyHours: 220,
    dailyHours: 8,
  });

  const currentEmployee = useMemo(
    () => employees.find(employee => employee.id === employeeId) || null,
    [employees, employeeId],
  );
  const result = useMemo(() => calculateWorkHours(form), [form]);
  const currentCalculation = useMemo(
    () =>
      history.find(
        row =>
          row.employee_id === employeeId &&
          row.competence.slice(0, 7) === competence,
      ) || null,
    [history, employeeId, competence],
  );
  const weeklyMinutes = useMemo(
    () => weeklyScheduleMinutes(form.weeklySchedule || []),
    [form.weeklySchedule],
  );
  const primaryArea: PrimaryArea =
    view === 'history' ? 'history' : view === 'import' ? 'import' : 'manual';
  const manualStep: ManualStep =
    view === 'events' ? 'events' : view === 'summary' ? 'summary' : 'schedule';


  const loadHistory = useCallback(
    async (mode = storageMode) => {
      if (mode === 'local') {
        setHistory(
          readLocal<CalculationRow[]>(localKey('calculations', user?.id || 'unknown'), []),
        );
        return;
      }
      const { data, error } = await (supabase as any)
        .from('hr_work_hour_calculations')
        .select('*')
.order('competence', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(240);
      if (error) {
        if (isMissingHrStorage(error)) {
          setStorageMode('local');
          setHistory(
            readLocal<CalculationRow[]>(
              localKey('calculations', user?.id || 'unknown'),
              [],
            ),
          );
          return;
        }
        setMessage(error.message || 'Não foi possível carregar o histórico.');
        return;
      }
      setHistory((data || []) as CalculationRow[]);
    },
    [storageMode, user?.id],
  );

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setMessage('');
    const { data, error } = await (supabase as any)
      .from('hr_employees')
      .select('*')
.eq('active', true)
      .order('name');

    if (error) {
      if (isMissingHrStorage(error)) {
        setStorageMode('local');
        setEmployees(
          readLocal<EmployeeRow[]>(localKey('employees', user?.id || 'unknown'), []),
        );
        await loadHistory('local');
      } else {
        setMessage(error.message || 'Não foi possível carregar os funcionários.');
      }
      setLoading(false);
      return;
    }

    setStorageMode('database');
    setEmployees((data || []) as EmployeeRow[]);
    await loadHistory('database');
    setLoading(false);
  }, [loadHistory, user?.id]);

  useEffect(() => {
    setEmployees([]);
    setHistory([]);
    setCurrentRecordId(null);
    setRecordStatus('draft');
    setForm(emptyWorkHoursForm());
    setMessage('');
    setDirty(false);
    setView('schedule');

    if (!user?.id) {
      setEmployeeId('');
      return;
    }

    migrateLegacyLocalHrData(user.id);

    const last = readLocal<{ employeeId?: string; competence?: string }>(
      lastKey(user.id),
      {},
    );
    setEmployeeId(last.employeeId || '');
    setCompetence(last.competence || currentCompetence());
    void loadEmployees();
  }, [user?.id, loadEmployees]);

  useEffect(() => {
    if (!user?.id) return;
    writeLocal(lastKey(user.id), { employeeId, competence });
  }, [user?.id, employeeId, competence]);

  useEffect(() => {
    if (!employeeId || !currentEmployee || !user?.id) {
      setCurrentRecordId(null);
      setRecordStatus('draft');
      if (!employeeId) setForm(emptyWorkHoursForm());
      return;
    }

    let active = true;
    setLoadingRecord(true);
    setMessage('');

    const restore = async () => {
      let saved: CalculationRow | null = null;

      if (storageMode === 'local') {
        saved =
          readLocal<CalculationRow[]>(
            localKey('calculations', user.id),
            [],
          ).find(
            row => row.employee_id === employeeId && row.competence.slice(0, 7) === competence,
          ) || null;
      } else {
        const { data, error } = await (supabase as any)
          .from('hr_work_hour_calculations')
          .select('*')
.eq('employee_id', employeeId)
          .eq('competence', competenceDate(competence))
          .maybeSingle();

        if (error && isMissingHrStorage(error)) {
          setStorageMode('local');
          saved =
            readLocal<CalculationRow[]>(
              localKey('calculations', user.id),
              [],
            ).find(
              row => row.employee_id === employeeId && row.competence.slice(0, 7) === competence,
            ) || null;
        } else if (error) {
          setMessage(error.message || 'Não foi possível abrir este cálculo.');
        } else {
          saved = data as CalculationRow | null;
        }
      }

      if (!active) return;

      const browserDraft = readLocal<WorkHoursForm | null>(
        draftKey(user.id, employeeId, competence),
        null,
      );

      if (saved) {
        setCurrentRecordId(saved.id);
        setRecordStatus(saved.status);
        setForm(browserDraft ? restoreForm(browserDraft) : restoreForm(saved.form_data));
        setDirty(Boolean(browserDraft));
      } else {
        setCurrentRecordId(null);
        setRecordStatus('draft');
        setForm(browserDraft ? restoreForm(browserDraft) : employeeDefaults(currentEmployee));
        setDirty(Boolean(browserDraft));
      }
      setLoadingRecord(false);
    };

    void restore();
    return () => {
      active = false;
    };
  }, [employeeId, competence, currentEmployee?.id, user?.id, storageMode]);

  useEffect(() => {
    if (!dirty || !user?.id || !employeeId) return;
    writeLocal(draftKey(user.id, employeeId, competence), form);
  }, [dirty, user?.id, employeeId, competence, form]);

  const updateForm = <K extends keyof WorkHoursForm>(key: K, value: WorkHoursForm[K]) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setDirty(true);
    setMessage('');
  };

  const createEmployee = async () => {
    if (!user?.id || !newEmployee.name.trim()) {
      setMessage('Informe o nome do funcionário.');
      return;
    }

    setSaving(true);
    setMessage('');
    const row: EmployeeRow = {
      id: crypto.randomUUID(),
      company_id: null,
      name: newEmployee.name.trim(),
      cpf: newEmployee.cpf.replace(/\D/g, '') || null,
      employment_type: newEmployee.employmentType,
      base_salary: Math.max(0, newEmployee.baseSalary),
      hourly_rate: Math.max(0, newEmployee.hourlyRate),
      monthly_hours: Math.max(0.01, newEmployee.monthlyHours || 220),
      daily_hours: Math.max(0, newEmployee.dailyHours || 8),
      absence_day_divisor: 30,
      overtime_50_percent: 50,
      overtime_100_percent: 100,
      night_percent: 20,
      holiday_percent: 100,
      weekly_schedule: emptyWeeklySchedule(),
      active: true,
    };

    if (storageMode === 'local') {
      const next = [...employees, row].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      setEmployees(next);
      writeLocal(localKey('employees', user.id), next);
      setEmployeeId(row.id);
    } else {
      const { data, error } = await (supabase as any)
        .from('hr_employees')
        .insert({
          ...row,
          id: undefined,
          created_by: user.id,
          updated_by: user.id,
        })
        .select('*')
        .single();

      if (error) {
        if (isMissingHrStorage(error)) {
          setStorageMode('local');
          const next = [...employees, row].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
          setEmployees(next);
          writeLocal(localKey('employees', user.id), next);
          setEmployeeId(row.id);
        } else {
          setMessage(error.message || 'Não foi possível cadastrar o funcionário.');
          setSaving(false);
          return;
        }
      } else {
        const created = data as EmployeeRow;
        setEmployees(previous =>
          [...previous, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        );
        setEmployeeId(created.id);
      }
    }

    setShowNewEmployee(false);
    setNewEmployee({
      name: '',
      cpf: '',
      employmentType: 'monthly',
      baseSalary: NATIONAL_MINIMUM_WAGE_2026,
      hourlyRate: 0,
      monthlyHours: 220,
      dailyHours: 8,
    });
    setSaving(false);
  };

  const persistEmployeeDefaults = async () => {
    if (!currentEmployee || !user?.id) return;

    const patch = {
      employment_type: form.employmentType,
      base_salary: form.baseSalary,
      hourly_rate: form.hourlyRate,
      monthly_hours: form.monthlyHours,
      daily_hours: form.dailyHours,
      absence_day_divisor: form.absenceDayDivisor,
      overtime_50_percent: form.overtime50Percent,
      overtime_100_percent: form.overtime100Percent,
      night_percent: form.nightPercent,
      holiday_percent: form.holidayPercent,
      weekly_schedule: form.weeklySchedule,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (storageMode === 'local') {
      const next = employees.map(employee =>
        employee.id === currentEmployee.id ? { ...employee, ...patch } : employee,
      );
      setEmployees(next);
      writeLocal(localKey('employees', user.id), next);
      return;
    }

    const { error } = await (supabase as any)
      .from('hr_employees')
      .update(patch)
      .eq('id', currentEmployee.id);

    if (!error) {
      setEmployees(previous =>
        previous.map(employee =>
          employee.id === currentEmployee.id ? { ...employee, ...patch } : employee,
        ),
      );
    }
  };

  const saveCalculation = async (status: 'draft' | 'finalized') => {
    if (!user?.id || !employeeId || !currentEmployee) {
      setMessage('Selecione um funcionário antes de salvar.');
      return;
    }

    setSaving(true);
    setMessage('');
    const now = new Date().toISOString();
    const payload: CalculationRow = {
      id: currentRecordId || crypto.randomUUID(),
      company_id: null,
      employee_id: employeeId,
      competence: competenceDate(competence),
      status,
      employee_name_snapshot: currentEmployee.name,
      form_data: form,
      result_data: result,
      updated_at: now,
      finalized_at: status === 'finalized' ? now : null,
    };

    let savedLocally = storageMode === 'local';
    const persistLocalCalculation = () => {
      const rows = readLocal<CalculationRow[]>(
        localKey('calculations', user.id),
        [],
      );
      const existingIndex = rows.findIndex(
        row => row.employee_id === employeeId && row.competence.slice(0, 7) === competence,
      );
      const persisted = {
        ...payload,
        created_at: existingIndex >= 0 ? rows[existingIndex].created_at : now,
      };
      if (existingIndex >= 0) rows[existingIndex] = persisted;
      else rows.unshift(persisted);
      writeLocal(localKey('calculations', user.id), rows);
      setHistory(rows);
      setCurrentRecordId(persisted.id);
    };

    if (storageMode === 'local') {
      persistLocalCalculation();
    } else {
      const dbPayload = {
        company_id: null,
        employee_id: employeeId,
        competence: competenceDate(competence),
        status,
        employee_name_snapshot: currentEmployee.name,
        form_data: form,
        result_data: result,
        updated_by: user.id,
        finalized_at: status === 'finalized' ? now : null,
        ...(currentRecordId ? {} : { created_by: user.id }),
      };
      const { data, error } = await (supabase as any)
        .from('hr_work_hour_calculations')
        .upsert(dbPayload, { onConflict: 'employee_id,competence' })
        .select('*')
        .single();

      if (error) {
        if (isMissingHrStorage(error)) {
          setStorageMode('local');
          savedLocally = true;
          persistLocalCalculation();
        } else {
          setMessage(error.message || 'Não foi possível salvar o cálculo.');
          setSaving(false);
          return;
        }
      } else {
        setCurrentRecordId(data.id);
        await loadHistory('database');
      }
    }

    await persistEmployeeDefaults();
    localStorage.removeItem(draftKey(user.id, employeeId, competence));
    setRecordStatus(status);
    setDirty(false);
    setSaving(false);
    setMessage(
      savedLocally
        ? 'Cálculo salvo neste navegador. A estrutura do banco do Departamento Pessoal ainda precisa ser ativada.'
        : status === 'finalized'
          ? 'Cálculo finalizado e salvo.'
          : 'Rascunho salvo.',
    );
  };

  const importPointMirrorEmployees = async (
    imported: PointMirrorEmployee[],
    fileName: string,
  ) => {
    if (!user?.id || !imported.length) return;

    const now = new Date().toISOString();
    let workingEmployees = [...employees];
    let workingHistory = [...history];
    let forceLocal = storageMode === 'local';

    const persistLocal = () => {
      writeLocal(localKey('employees', user.id), workingEmployees);
      writeLocal(localKey('calculations', user.id), workingHistory);
      setEmployees([...workingEmployees].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      setHistory(
        [...workingHistory].sort(
          (a, b) =>
            b.competence.localeCompare(a.competence) ||
            a.employee_name_snapshot.localeCompare(b.employee_name_snapshot, 'pt-BR'),
        ),
      );
    };

    for (const item of imported) {
      const normalizedCpf = item.cpf.replace(/\D/g, '');
      let employee =
        workingEmployees.find(
          row => normalizedCpf && String(row.cpf || '').replace(/\D/g, '') === normalizedCpf,
        ) ||
        workingEmployees.find(
          row => row.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
        ) ||
        null;

      const metadata = {
        source: 'point_mirror_pdf',
        source_file: fileName,
        source_page: item.sourcePage,
        imported_at: now,
        employer_name: item.employerName,
        employer_cnpj: item.employerCnpj,
        period_start: item.periodStart,
        period_end: item.periodEnd,
      };

      if (!employee) {
        const localEmployee: EmployeeRow = {
          id: crypto.randomUUID(),
          company_id: null,
          name: item.name,
          cpf: normalizedCpf || null,
          employment_type: 'monthly',
          base_salary: NATIONAL_MINIMUM_WAGE_2026,
          hourly_rate: 0,
          monthly_hours: 220,
          daily_hours: 8,
          absence_day_divisor: 30,
          overtime_50_percent: 50,
          overtime_100_percent: 100,
          night_percent: 20,
          holiday_percent: 100,
          weekly_schedule: item.suggestedWeeklySchedule,
          active: true,
          registration: item.registration || null,
          pis: item.pis || null,
          admission_date: item.admissionDate || null,
          role_title: item.role || null,
          department: item.department || null,
          employer_name: item.employerName || null,
          employer_cnpj: item.employerCnpj || null,
          bank_hours_start_date: item.bankHoursStartDate || null,
          schedule_label: item.scheduleLabel || null,
          source_metadata: metadata,
          created_at: now,
          updated_at: now,
        };

        if (!forceLocal) {
          const { data, error } = await (supabase as any)
            .from('hr_employees')
            .insert({
              company_id: null,
              name: localEmployee.name,
              cpf: localEmployee.cpf,
              employment_type: localEmployee.employment_type,
              base_salary: localEmployee.base_salary,
              hourly_rate: localEmployee.hourly_rate,
              monthly_hours: localEmployee.monthly_hours,
              daily_hours: localEmployee.daily_hours,
              absence_day_divisor: localEmployee.absence_day_divisor,
              overtime_50_percent: localEmployee.overtime_50_percent,
              overtime_100_percent: localEmployee.overtime_100_percent,
              night_percent: localEmployee.night_percent,
              holiday_percent: localEmployee.holiday_percent,
              weekly_schedule: localEmployee.weekly_schedule,
              active: true,
              registration: localEmployee.registration,
              pis: localEmployee.pis,
              admission_date: localEmployee.admission_date,
              role_title: localEmployee.role_title,
              department: localEmployee.department,
              employer_name: localEmployee.employer_name,
              employer_cnpj: localEmployee.employer_cnpj,
              bank_hours_start_date: localEmployee.bank_hours_start_date,
              schedule_label: localEmployee.schedule_label,
              source_metadata: metadata,
              created_by: user.id,
              updated_by: user.id,
            })
            .select('*')
            .single();

          if (error) {
            if (isMissingHrStorage(error)) {
              forceLocal = true;
              setStorageMode('local');
              employee = localEmployee;
            } else {
              throw error;
            }
          } else {
            employee = data as EmployeeRow;
          }
        } else {
          employee = localEmployee;
        }

        workingEmployees.push(employee);
      } else {
        const currentSchedule = normalizeWeeklySchedule(employee.weekly_schedule);
        const hasConfiguredSchedule = currentSchedule.some(
          day => day.active && (day.entry1 || day.exit1 || day.entry2 || day.exit2),
        );
        const patch = {
          name: item.name || employee.name,
          cpf: normalizedCpf || employee.cpf,
          registration: item.registration || employee.registration || null,
          pis: item.pis || employee.pis || null,
          admission_date: item.admissionDate || employee.admission_date || null,
          role_title: item.role || employee.role_title || null,
          department: item.department || employee.department || null,
          employer_name: item.employerName || employee.employer_name || null,
          employer_cnpj: item.employerCnpj || employee.employer_cnpj || null,
          bank_hours_start_date: item.bankHoursStartDate || employee.bank_hours_start_date || null,
          schedule_label: item.scheduleLabel || employee.schedule_label || null,
          weekly_schedule: hasConfiguredSchedule
            ? employee.weekly_schedule
            : item.suggestedWeeklySchedule,
          source_metadata: metadata,
          updated_at: now,
        };

        if (!forceLocal) {
          const { data, error } = await (supabase as any)
            .from('hr_employees')
            .update({ ...patch, updated_by: user.id })
            .eq('id', employee.id)
            .select('*')
            .single();

          if (error) {
            if (isMissingHrStorage(error)) {
              forceLocal = true;
              setStorageMode('local');
              employee = { ...employee, ...patch };
            } else {
              throw error;
            }
          } else {
            employee = data as EmployeeRow;
          }
        } else {
          employee = { ...employee, ...patch };
        }

        workingEmployees = workingEmployees.map(row => (row.id === employee!.id ? employee! : row));
      }

      const competenceValue = (item.periodStart || currentCompetence()).slice(0, 7);
      const importedForm = employeeDefaults(employee);
      importedForm.weeklySchedule = normalizeWeeklySchedule(
        employee.weekly_schedule || item.suggestedWeeklySchedule,
      );
      const importedResult = calculateWorkHours(importedForm);

      const existingCalculation = workingHistory.find(
        row =>
          row.employee_id === employee!.id &&
          row.competence.slice(0, 7) === competenceValue,
      );

      const localCalculation: CalculationRow = {
        id: existingCalculation?.id || crypto.randomUUID(),
        company_id: null,
        employee_id: employee.id,
        competence: competenceDate(competenceValue),
        status: 'draft',
        employee_name_snapshot: employee.name,
        form_data: existingCalculation?.form_data || importedForm,
        result_data: existingCalculation?.result_data || importedResult,
        source_type: 'point_mirror_pdf',
        source_metadata: metadata,
        imported_punches: item.punches,
        created_at: existingCalculation?.created_at || now,
        updated_at: now,
        finalized_at: existingCalculation?.finalized_at || null,
      };

      if (!forceLocal) {
        const { data, error } = await (supabase as any)
          .from('hr_work_hour_calculations')
          .upsert(
            {
              company_id: null,
              employee_id: employee.id,
              competence: competenceDate(competenceValue),
              status: existingCalculation?.status || 'draft',
              employee_name_snapshot: employee.name,
              form_data: existingCalculation?.form_data || importedForm,
              result_data: existingCalculation?.result_data || importedResult,
              source_type: 'point_mirror_pdf',
              source_metadata: metadata,
              imported_punches: item.punches,
              updated_by: user.id,
              ...(existingCalculation ? {} : { created_by: user.id }),
            },
            { onConflict: 'employee_id,competence' },
          )
          .select('*')
          .single();

        if (error) {
          if (isMissingHrStorage(error)) {
            forceLocal = true;
            setStorageMode('local');
          } else {
            throw error;
          }
        } else {
          Object.assign(localCalculation, data);
        }
      }

      const calcIndex = workingHistory.findIndex(
        row =>
          row.employee_id === employee!.id &&
          row.competence.slice(0, 7) === competenceValue,
      );
      if (calcIndex >= 0) workingHistory[calcIndex] = localCalculation;
      else workingHistory.push(localCalculation);
    }

    persistLocal();

    if (!forceLocal) {
      await loadEmployees();
    }

    setView('history');
    setMessage(
      imported.length +
        ' funcionário' +
        (imported.length === 1 ? '' : 's') +
        ' importado' +
        (imported.length === 1 ? '' : 's') +
        ' e adicionado' +
        (imported.length === 1 ? '' : 's') +
        ' ao Controle como rascunho.',
    );
  };

  const duplicatePrevious = () => {
    if (!employeeId) {
      setMessage('Selecione um funcionário.');
      return;
    }
    const target = competenceDate(competence);
    const previous = history
      .filter(row => row.employee_id === employeeId && row.competence < target)
      .sort((a, b) => b.competence.localeCompare(a.competence))[0];

    if (!previous) {
      setMessage('Não existe cálculo anterior deste funcionário para duplicar.');
      return;
    }

    setCurrentRecordId(null);
    setRecordStatus('draft');
    setForm(restoreForm(previous.form_data));
    setDirty(true);
    setView('schedule');
    setMessage(
      `Dados de ${formatCompetence(previous.competence)} copiados para ${formatCompetence(target)}.`,
    );
  };

  const addAdjustment = (kind: 'otherAdditions' | 'otherDeductions') => {
    updateForm(kind, [
      ...form[kind],
      { id: crypto.randomUUID(), label: '', amount: 0, category: 'other', mode: 'fixed' },
    ] as WorkHoursForm[typeof kind]);
  };

  const removeAdjustment = (
    kind: 'otherAdditions' | 'otherDeductions',
    id: string,
  ) => {
    updateForm(
      kind,
      form[kind].filter(item => item.id !== id) as WorkHoursForm[typeof kind],
    );
  };

  const openHistoryRow = (row: CalculationRow) => {
    setEmployeeId(row.employee_id);
    setCompetence(row.competence.slice(0, 7));
    setView('summary');
  };

  const statusLabel = dirty
    ? 'Alterações não salvas'
    : recordStatus === 'finalized'
      ? 'Finalizado'
      : 'Rascunho';

  const summaryRows = [
    ['Salário / base', result.basePay],
    [`HE ${form.overtime50Percent}%`, result.additions.overtime50],
    [`HE ${form.overtime100Percent}%`, result.additions.overtime100],
    ['Adicional noturno', result.additions.nightPremium],
    ['Domingo / feriado', result.additions.holidayPremium],
    ['Banco positivo', result.additions.bankPositive],
    ['Outros acréscimos', result.additions.other],
  ] as const;

  const deductionRows = [
    ['Faltas em dias', result.deductions.absenceDays],
    ['Faltas em horas', result.deductions.absenceHours],
    ['Atrasos / saídas', result.deductions.lateHours],
    ['Banco negativo', result.deductions.bankNegative],
    ['Outros descontos', result.deductions.other],
  ] as const;

  return (
    <AdminLayout showCompanySelector={false}>
      <AdminPage className="space-y-5">
        <AdminPageHeader
          eyebrow="Departamento Pessoal"
          title="Calculadora de horas"
          description="Área independente do seletor de empresas do ADM. Cadastre funcionários, importe espelhos de ponto, calcule e acompanhe todos os rascunhos em um único controle."
        />

        <PrimaryNavigation
          value={primaryArea}
          onChange={area => {
            if (area === 'manual') {
              setView(manualStep);
            } else {
              setView(area);
              setShowNewEmployee(false);
            }
          }}
        />

        {message && (
          <div className="rounded-lg border border-transparent bg-muted/20 px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <AdminSection>
            <AdminLoadingState label="Carregando Departamento Pessoal..." />
          </AdminSection>
        ) : (
          <>
            {primaryArea === 'manual' && (
            <div className="rounded-xl border border-transparent bg-muted/10 px-4 py-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_190px_auto_auto] lg:items-end">
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">
                    Funcionário
                  </span>
                  <select
                    value={employeeId}
                    onChange={event => {
                      setEmployeeId(event.target.value);
                      setView('schedule');
                    }}
                    className="mt-1.5 h-10 w-full rounded-md border border-transparent bg-muted/20 px-3 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">
                    Competência
                  </span>
                  <Input
                    type="month"
                    value={competence}
                    onChange={event => setCompetence(event.target.value)}
                    className="mt-1.5 h-10"
                  />
                </label>

                <Button
                  variant="outline"
                  onClick={duplicatePrevious}
                  disabled={!employeeId}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Mês anterior
                </Button>

                <Button onClick={() => setShowNewEmployee(value => !value)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Novo funcionário
                </Button>
              </div>

              {employeeId && currentEmployee && (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
<span className="capitalize">{formatCompetence(competenceDate(competence))}</span>
                  <span>•</span>
                  <span>{statusLabel}</span>
                  {currentEmployee.employer_name && (
                    <>
                      <span>•</span>
                      <span>{currentEmployee.employer_name}</span>
                    </>
                  )}
                  {weeklyMinutes > 0 && (
                    <>
                      <span>•</span>
                      <span>Jornada semanal: {formatMinutes(weeklyMinutes)}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            )}

            {primaryArea === 'manual' && showNewEmployee && (
              <AdminSection className="!border-transparent !shadow-none bg-card/40">
                <div className="border-b border-transparent px-5 py-4">
                  <h2 className="text-sm font-semibold">Novo funcionário</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Só os dados necessários para começar. A jornada detalhada é configurada depois.
                  </p>
                </div>
                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block xl:col-span-2">
                    <span className="text-[11px] font-medium">Nome</span>
                    <Input
                      value={newEmployee.name}
                      onChange={event =>
                        setNewEmployee(previous => ({ ...previous, name: event.target.value }))
                      }
                      className="mt-1.5 h-10"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-medium">CPF (opcional)</span>
                    <Input
                      value={newEmployee.cpf}
                      onChange={event =>
                        setNewEmployee(previous => ({
                          ...previous,
                          cpf: event.target.value.replace(/\D/g, '').slice(0, 11),
                        }))
                      }
                      className="mt-1.5 h-10"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-medium">Tipo</span>
                    <select
                      value={newEmployee.employmentType}
                      onChange={event =>
                        setNewEmployee(previous => ({
                          ...previous,
                          employmentType: event.target.value as EmploymentType,
                        }))
                      }
                      className="mt-1.5 h-10 w-full rounded-md border border-transparent bg-muted/20 px-3 text-sm"
                    >
                      <option value="monthly">Mensalista</option>
                      <option value="hourly">Horista</option>
                    </select>
                  </label>
                  {newEmployee.employmentType === 'monthly' ? (
                    <>
                      <NumberInput
                        label="Salário base"
                        value={newEmployee.baseSalary}
                        onChange={value =>
                          setNewEmployee(previous => ({ ...previous, baseSalary: value }))
                        }
                        prefix="R$"
                        hint="Padrão: salário mínimo nacional de 2026 (R$ 1.621,00)."
                      />
                      <NumberInput
                        label="Jornada mensal"
                        value={newEmployee.monthlyHours}
                        onChange={value =>
                          setNewEmployee(previous => ({ ...previous, monthlyHours: value }))
                        }
                        suffix="h"
                      />
                    </>
                  ) : (
                    <NumberInput
                      label="Valor da hora"
                      value={newEmployee.hourlyRate}
                      onChange={value =>
                        setNewEmployee(previous => ({ ...previous, hourlyRate: value }))
                      }
                      prefix="R$"
                    />
                  )}
                  <NumberInput
                    label="Jornada diária de referência"
                    value={newEmployee.dailyHours}
                    onChange={value =>
                      setNewEmployee(previous => ({ ...previous, dailyHours: value }))
                    }
                    suffix="h"
                  />
                  <div className="flex items-end gap-2">
                    <Button onClick={() => void createEmployee()} disabled={saving}>
                      {saving ? 'Salvando...' : 'Cadastrar'}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowNewEmployee(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </AdminSection>
            )}

            <AdminSection className="overflow-visible !border-transparent !shadow-none bg-card/35">
                {primaryArea === 'manual' && (
                  <ManualStepTabs
                    value={manualStep}
                    onChange={step => setView(step)}
                  />
                )}

                {view === 'import' ? (
                  <PointMirrorImportPanel
                    employees={employees}
                    onImport={importPointMirrorEmployees}
                  />
                ) : view !== 'history' && (!employeeId || !currentEmployee) ? (
                  <AdminEmptyState
                    icon={<Clock3 className="h-7 w-7" />}
                    title="Selecione um funcionário"
                    description="A jornada e as ocorrências do cálculo manual serão carregadas para a pessoa escolhida."
                  />
                ) : view !== 'history' && loadingRecord ? (
                  <AdminLoadingState label="Abrindo cálculo..." />
                ) : view === 'schedule' ? (
                  <div className="p-5">
                    <div className="mb-6">
                      <h2 className="text-base font-semibold">1. Jornada e contrato</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Primeiro defina a base do funcionário. Depois informe os horários de cada dia.
                      </p>
                    </div>

                    {(currentEmployee.cpf ||
                      currentEmployee.registration ||
                      currentEmployee.pis ||
                      currentEmployee.admission_date ||
                      currentEmployee.role_title ||
                      currentEmployee.employer_name) && (
                      <div className="mb-6 grid gap-x-6 gap-y-3 border-b border-transparent pb-5 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <span className="text-[10px] uppercase tracking-[.08em] text-muted-foreground">CPF</span>
                          <b className="mt-0.5 block text-sm">{currentEmployee.cpf || '—'}</b>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-[.08em] text-muted-foreground">Matrícula / PIS</span>
                          <b className="mt-0.5 block text-sm">
                            {currentEmployee.registration || '—'}
                            {currentEmployee.pis ? ` · ${currentEmployee.pis}` : ''}
                          </b>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-[.08em] text-muted-foreground">Cargo / admissão</span>
                          <b className="mt-0.5 block text-sm">
                            {currentEmployee.role_title || '—'}
                            {currentEmployee.admission_date ? ` · ${currentEmployee.admission_date}` : ''}
                          </b>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-[.08em] text-muted-foreground">Empregador</span>
                          <b className="mt-0.5 block text-sm">
                            {currentEmployee.employer_name || '—'}
                            {currentEmployee.employer_cnpj ? ` · ${currentEmployee.employer_cnpj}` : ''}
                          </b>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4 border-b border-transparent pb-6 sm:grid-cols-2 xl:grid-cols-5">
                      <label className="block">
                        <span className="text-[11px] font-medium">Tipo</span>
                        <select
                          value={form.employmentType}
                          onChange={event =>
                            updateForm('employmentType', event.target.value as EmploymentType)
                          }
                          className="mt-1.5 h-10 w-full rounded-md border border-transparent bg-muted/20 px-3 text-sm"
                        >
                          <option value="monthly">Mensalista</option>
                          <option value="hourly">Horista</option>
                        </select>
                      </label>

                      {form.employmentType === 'monthly' ? (
                        <>
                          <NumberInput
                            label="Salário base"
                            value={form.baseSalary}
                            onChange={value => updateForm('baseSalary', value)}
                            prefix="R$"
                            hint="Editável. Quando não houver outro valor cadastrado, parte de R$ 1.621,00 em 2026."
                          />
                          <NumberInput
                            label="Divisor mensal"
                            value={form.monthlyHours}
                            onChange={value => updateForm('monthlyHours', value)}
                            suffix="h"
                            hint="Ex.: 220h. Não é calculado pela grade semanal."
                          />
                        </>
                      ) : (
                        <>
                          <NumberInput
                            label="Valor da hora"
                            value={form.hourlyRate}
                            onChange={value => updateForm('hourlyRate', value)}
                            prefix="R$"
                          />
                          <TimeInput
                            label="Horas normais na competência"
                            value={form.normalHours}
                            onChange={value => updateForm('normalHours', value)}
                          />
                        </>
                      )}

                      <NumberInput
                        label="Jornada diária ref."
                        value={form.dailyHours}
                        onChange={value => updateForm('dailyHours', value)}
                        suffix="h"
                        hint="Usada como referência em algumas conferências."
                      />
                      <NumberInput
                        label="Divisor falta/dia"
                        value={form.absenceDayDivisor}
                        onChange={value => updateForm('absenceDayDivisor', value)}
                        hint="Configurável conforme a regra aplicável."
                      />
                    </div>

                    <div className="pt-6">
                      <WeeklyScheduleEditor
                        value={form.weeklySchedule}
                        onChange={value => updateForm('weeklySchedule', value)}
                      />
                    </div>

                    {currentCalculation?.source_type === 'point_mirror_pdf' &&
                      Array.isArray(currentCalculation.imported_punches) &&
                      currentCalculation.imported_punches.length > 0 && (
                        <details className="mt-6 border-t border-transparent pt-4">
                          <summary className="cursor-pointer text-sm font-semibold">
                            Marcações importadas do espelho de ponto
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              {currentCalculation.imported_punches.length} dias no relatório
                            </span>
                          </summary>
                          <div className="mt-3 max-h-[360px] overflow-auto rounded-lg border border-transparent">
                            <table className="w-full min-w-[520px] text-left text-sm">
                              <thead className="sticky top-0 bg-muted/90 text-[10px] uppercase tracking-[.08em] text-muted-foreground">
                                <tr>
                                  <th className="px-3 py-2 font-semibold">Data</th>
                                  <th className="px-3 py-2 font-semibold">Dia</th>
                                  <th className="px-3 py-2 font-semibold">Marcações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-transparent">
                                {currentCalculation.imported_punches.map((day: any, index: number) => (
                                  <tr key={String(day?.date || index)}>
                                    <td className="px-3 py-2">{day?.date || '—'}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{day?.weekdayLabel || '—'}</td>
                                    <td className="px-3 py-2 font-medium">
                                      {Array.isArray(day?.punches) && day.punches.length
                                        ? day.punches.join(' · ')
                                        : 'Sem marcação'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                            A jornada acima é sugerida a partir do padrão das batidas importadas e deve ser conferida antes de finalizar o cálculo.
                          </p>
                        </details>
                      )}

                    <div className="mt-6 flex justify-end border-t border-transparent pt-4">
                      <Button onClick={() => setView('events')}>
                        Próximo: ocorrências
                      </Button>
                    </div>
                  </div>
                ) : view === 'events' ? (
                  <div className="p-5">
                    <div className="mb-6">
                      <h2 className="text-base font-semibold">2. Ocorrências da competência</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        A jornada padrão já está definida. Aqui você informa somente o que saiu da rotina.
                      </p>
                    </div>

                    <div className="grid gap-0 lg:grid-cols-3">
                      <section className="pb-6 lg:pr-6">
                        <div className="mb-4 border-b border-transparent pb-3">
                          <p className="text-sm font-semibold">Horas extras e adicionais</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Acréscimos gerados no mês.
                          </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                          <TimeInput
                            label={`Hora extra ${form.overtime50Percent}%`}
                            value={form.overtime50}
                            onChange={value => updateForm('overtime50', value)}
                          />
                          <TimeInput
                            label={`Hora extra ${form.overtime100Percent}%`}
                            value={form.overtime100}
                            onChange={value => updateForm('overtime100', value)}
                          />
                          <TimeInput
                            label="Horas noturnas"
                            value={form.nightHours}
                            onChange={value => updateForm('nightHours', value)}
                            hint={`Adicional configurado: ${form.nightPercent}%`}
                          />
                          <TimeInput
                            label="Domingo / feriado"
                            value={form.holidayHours}
                            onChange={value => updateForm('holidayHours', value)}
                            hint={`Adicional configurado: ${form.holidayPercent}%`}
                          />
                        </div>
                      </section>

                      <section className="border-t border-transparent py-6 lg:border-l lg:border-t-0 lg:px-6 lg:py-0">
                        <div className="mb-4 border-b border-transparent pb-3">
                          <p className="text-sm font-semibold">Faltas e atrasos</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Tempo não trabalhado e saídas antecipadas.
                          </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                          <NumberInput
                            label="Faltas em dias"
                            value={form.absenceDays}
                            onChange={value => updateForm('absenceDays', value)}
                            step="0.5"
                          />
                          <TimeInput
                            label="Faltas em horas"
                            value={form.absenceHours}
                            onChange={value => updateForm('absenceHours', value)}
                          />
                          <TimeInput
                            label="Atrasos"
                            value={form.lateHours}
                            onChange={value => updateForm('lateHours', value)}
                          />
                        </div>
                      </section>

                      <section className="border-t border-transparent pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                        <div className="mb-4 border-b border-transparent pb-3">
                          <p className="text-sm font-semibold">Banco de horas</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Registre o saldo e escolha se entra no cálculo.
                          </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                          <TimeInput
                            label="Saldo positivo"
                            value={form.bankPositive}
                            onChange={value => updateForm('bankPositive', value)}
                          />
                          <TimeInput
                            label="Saldo negativo"
                            value={form.bankNegative}
                            onChange={value => updateForm('bankNegative', value)}
                          />
                        </div>
                        <label className="mt-4 flex items-center justify-between gap-3 border-t border-transparent pt-4 text-sm">
                          <span>
                            <b className="block font-medium">Liquidar nesta competência</b>
                            <small className="text-muted-foreground">
                              Desligado = apenas registra o saldo.
                            </small>
                          </span>
                          <input
                            type="checkbox"
                            checked={form.settleBank}
                            onChange={event => updateForm('settleBank', event.target.checked)}
                            className="h-4 w-4"
                          />
                        </label>
                      </section>
                    </div>

                    <div className="mt-7 grid gap-6 border-t border-transparent pt-6 lg:grid-cols-2">
                      <section>
                        <div className="mb-3">
                          <p className="text-sm font-semibold">Outros acréscimos</p>
                          <p className="text-xs text-muted-foreground">
                            Escolha o tipo e informe um valor fixo ou percentual da base.
                          </p>
                        </div>
                        <AdjustmentRows
                          rows={form.otherAdditions}
                          onChange={rows => updateForm('otherAdditions', rows)}
                          onAdd={() => addAdjustment('otherAdditions')}
                          onRemove={id => removeAdjustment('otherAdditions', id)}
                          kind="addition"
                          basePay={result.basePay}
                        />
                      </section>

                      <section className="border-t border-transparent pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                        <div className="mb-3">
                          <p className="text-sm font-semibold">Outros descontos</p>
                          <p className="text-xs text-muted-foreground">
                            Escolha o desconto e informe um valor fixo ou percentual da base.
                          </p>
                        </div>
                        <AdjustmentRows
                          rows={form.otherDeductions}
                          onChange={rows => updateForm('otherDeductions', rows)}
                          onAdd={() => addAdjustment('otherDeductions')}
                          onRemove={id => removeAdjustment('otherDeductions', id)}
                          kind="deduction"
                          basePay={result.basePay}
                        />
                      </section>
                    </div>

                    <details className="mt-7 border-t border-transparent pt-4">
                      <summary className="cursor-pointer text-sm font-semibold">
                        Percentuais avançados
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          editar apenas quando necessário
                        </span>
                      </summary>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <NumberInput
                          label="Hora extra principal"
                          value={form.overtime50Percent}
                          onChange={value => updateForm('overtime50Percent', value)}
                          suffix="%"
                        />
                        <NumberInput
                          label="Hora extra especial"
                          value={form.overtime100Percent}
                          onChange={value => updateForm('overtime100Percent', value)}
                          suffix="%"
                        />
                        <NumberInput
                          label="Adicional noturno"
                          value={form.nightPercent}
                          onChange={value => updateForm('nightPercent', value)}
                          suffix="%"
                        />
                        <NumberInput
                          label="Domingo / feriado"
                          value={form.holidayPercent}
                          onChange={value => updateForm('holidayPercent', value)}
                          suffix="%"
                        />
                      </div>
                    </details>

                    <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-transparent pt-4">
                      <Button variant="outline" onClick={() => setView('schedule')}>
                        Voltar para jornada
                      </Button>
                      <Button onClick={() => setView('summary')}>
                        Conferir resultado
                      </Button>
                    </div>
                  </div>
                ) : view === 'summary' ? (
                  <div className="p-5">
                    <div className="mb-6">
                      <h2 className="text-base font-semibold">3. Resumo e conferência</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Confira os valores antes de salvar ou finalizar.
                      </p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[minmax(260px,.72fr)_minmax(0,1.28fr)]">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                          Total apurado
                        </span>
                        <strong className="mt-2 block text-4xl tracking-tight">
                          {formatCurrency(result.total)}
                        </strong>
                        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-transparent pt-4 text-sm">
                          <span>
                            <small className="block text-[10px] uppercase tracking-[.08em] text-muted-foreground">
                              Valor da hora
                            </small>
                            <b>{formatCurrency(result.hourlyRate)}</b>
                          </span>
                          <span>
                            <small className="block text-[10px] uppercase tracking-[.08em] text-muted-foreground">
                              Jornada semanal
                            </small>
                            <b>{formatMinutes(weeklyMinutes)}</b>
                          </span>
                          <span>
                            <small className="block text-[10px] uppercase tracking-[.08em] text-muted-foreground">
                              Acréscimos
                            </small>
                            <b>{formatCurrency(result.additionsTotal)}</b>
                          </span>
                          <span>
                            <small className="block text-[10px] uppercase tracking-[.08em] text-muted-foreground">
                              Descontos
                            </small>
                            <b>-{formatCurrency(result.deductionsTotal)}</b>
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-transparent pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                        <div className="grid gap-8 md:grid-cols-2">
                          <section>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[.08em] text-muted-foreground">
                              Proventos
                            </p>
                            <div className="space-y-2.5">
                              {summaryRows
                                .filter(([, value]) => value !== 0 || value === result.basePay)
                                .map(([label, value]) => (
                                  <div key={label} className="flex items-center justify-between gap-3 text-sm">
                                    <span className="text-muted-foreground">{label}</span>
                                    <b>{formatCurrency(value)}</b>
                                  </div>
                                ))}
                            </div>
                          </section>

                          <section>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[.08em] text-muted-foreground">
                              Descontos
                            </p>
                            <div className="space-y-2.5">
                              {deductionRows.filter(([, value]) => value !== 0).length ? (
                                deductionRows
                                  .filter(([, value]) => value !== 0)
                                  .map(([label, value]) => (
                                    <div key={label} className="flex items-center justify-between gap-3 text-sm">
                                      <span className="text-muted-foreground">{label}</span>
                                      <b>-{formatCurrency(value)}</b>
                                    </div>
                                  ))
                              ) : (
                                <p className="text-sm text-muted-foreground">Nenhum desconto informado.</p>
                              )}
                            </div>
                          </section>
                        </div>

                        {!form.settleBank &&
                          (result.minutes.bankPositive > 0 || result.minutes.bankNegative > 0) && (
                            <p className="mt-5 border-t border-transparent pt-4 text-xs text-muted-foreground">
                              Banco de horas apenas registrado: +{formatMinutes(result.minutes.bankPositive)} / -
                              {formatMinutes(result.minutes.bankNegative)}. Não altera o total.
                            </p>
                          )}
                      </div>
                    </div>

                    <details className="mt-7 border-t border-transparent pt-4">
                      <summary className="cursor-pointer text-sm font-semibold">
                        Ver memória de cálculo
                      </summary>
                      <div className="mt-3 space-y-2">
                        {result.memory.length ? (
                          result.memory.map((line, index) => (
                            <p key={index} className="text-xs leading-5 text-muted-foreground">
                              {line}
                            </p>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Nenhuma ocorrência financeira informada além da base.
                          </p>
                        )}
                      </div>
                    </details>

                    {storageMode === 'local' && (
                      <p className="mt-5 border-t border-transparent pt-4 text-xs leading-5 text-muted-foreground">
                        Modo temporário: estes dados estão sendo preservados neste navegador enquanto a estrutura de banco do Departamento Pessoal não é aplicada.
                      </p>
                    )}

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-transparent pt-4">
                      <Button variant="outline" onClick={() => setView('events')}>
                        Voltar para ocorrências
                      </Button>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            void saveCalculation(recordStatus === 'finalized' ? 'finalized' : 'draft')
                          }
                          disabled={saving}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {recordStatus === 'finalized' ? 'Salvar alterações' : 'Salvar rascunho'}
                        </Button>
                        <Button onClick={() => void saveCalculation('finalized')} disabled={saving}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Finalizar cálculo
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <MonthlyCalculationsTable
                    companyName="Departamento Pessoal"
                    employees={employees}
                    history={history}
                    onOpen={openHistoryRow}
                  />
                )}
              </AdminSection>
          </>
        )}
      </AdminPage>
    </AdminLayout>
  );
}
