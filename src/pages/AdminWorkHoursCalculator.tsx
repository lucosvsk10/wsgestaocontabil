import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  History,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCompanySelection } from '@/contexts/CompanySelectionContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateWorkHours,
  emptyWeeklySchedule,
  emptyWorkHoursForm,
  formatCurrency,
  formatMinutes,
  weeklyScheduleMinutes,
  type EmploymentType,
  type MoneyAdjustment,
  type WeeklyDaySchedule,
  type WorkHoursForm,
} from '@/lib/hr/workHours';

type EmployeeRow = {
  id: string;
  company_id: string;
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
  created_at?: string;
  updated_at?: string;
};

type CalculationRow = {
  id: string;
  company_id: string;
  employee_id: string;
  competence: string;
  status: 'draft' | 'finalized';
  employee_name_snapshot: string;
  form_data: WorkHoursForm;
  result_data: any;
  created_at?: string;
  updated_at?: string;
  finalized_at?: string | null;
};

type PageView = 'schedule' | 'events' | 'summary' | 'history';

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

const localKey = (kind: string, companyId: string, userId: string) =>
  `ws:hr:${kind}:${userId}:${companyId}`;
const draftKey = (userId: string, companyId: string, employeeId: string, competence: string) =>
  `ws:hr:hours:draft:${userId}:${companyId}:${employeeId}:${competence}`;
const lastKey = (userId: string, companyId: string) =>
  `ws:hr:hours:last:${userId}:${companyId}`;

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

function isMissingHrStorage(error: any) {
  const text = String(error?.message || error?.details || '').toLowerCase();
  return (
    error?.code === '42P01' ||
    text.includes('hr_employees') ||
    text.includes('hr_work_hour_calculations') ||
    text.includes('weekly_schedule')
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
    baseSalary: Number(employee.base_salary || 0),
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

function AdjustmentRows({
  rows,
  onChange,
  onAdd,
  onRemove,
  kind,
}: {
  rows: MoneyAdjustment[];
  onChange: (rows: MoneyAdjustment[]) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  kind: 'addition' | 'deduction';
}) {
  return (
    <div className="space-y-2">
      {rows.map(row => (
        <div key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_40px]">
          <Input
            value={row.label}
            onChange={event =>
              onChange(rows.map(item => (item.id === row.id ? { ...item, label: event.target.value } : item)))
            }
            placeholder={kind === 'addition' ? 'Ex.: comissão, gratificação' : 'Ex.: adiantamento, vale'}
            className="h-10"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={row.amount}
            onChange={event =>
              onChange(
                rows.map(item =>
                  item.id === row.id ? { ...item, amount: numberValue(event.target.value) } : item,
                ),
              )
            }
            className="h-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(row.id)}
            aria-label="Remover lançamento"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {kind === 'addition' ? 'Adicionar acréscimo' : 'Adicionar desconto'}
      </Button>
    </div>
  );
}

function ViewTabs({ value, onChange }: { value: PageView; onChange: (view: PageView) => void }) {
  const tabs: Array<{ key: PageView; label: string; icon: typeof Clock3 }> = [
    { key: 'schedule', label: 'Jornada', icon: CalendarDays },
    { key: 'events', label: 'Ocorrências', icon: Clock3 },
    { key: 'summary', label: 'Resumo', icon: ReceiptText },
    { key: 'history', label: 'Histórico', icon: History },
  ];

  return (
    <div className="flex w-full overflow-x-auto border-b border-border/60">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex min-w-[150px] flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              active
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/25 hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AdminWorkHoursCalculator() {
  const { user } = useAuth();
  const { selectedCompany } = useCompanySelection();
  const companyId = selectedCompany?.id || '';

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
    baseSalary: 0,
    hourlyRate: 0,
    monthlyHours: 220,
    dailyHours: 8,
  });

  const currentEmployee = useMemo(
    () => employees.find(employee => employee.id === employeeId) || null,
    [employees, employeeId],
  );
  const result = useMemo(() => calculateWorkHours(form), [form]);
  const weeklyMinutes = useMemo(
    () => weeklyScheduleMinutes(form.weeklySchedule || []),
    [form.weeklySchedule],
  );

  const loadHistory = useCallback(
    async (mode = storageMode) => {
      if (!companyId) {
        setHistory([]);
        return;
      }
      if (mode === 'local') {
        setHistory(
          readLocal<CalculationRow[]>(
            localKey('calculations', companyId, user?.id || 'unknown'),
            [],
          ),
        );
        return;
      }
      const { data, error } = await (supabase as any)
        .from('hr_work_hour_calculations')
        .select('*')
        .eq('company_id', companyId)
        .order('competence', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(240);
      if (error) {
        if (isMissingHrStorage(error)) {
          setStorageMode('local');
          setHistory(
            readLocal<CalculationRow[]>(
              localKey('calculations', companyId, user?.id || 'unknown'),
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
    [companyId, storageMode, user?.id],
  );

  const loadEmployees = useCallback(async () => {
    if (!companyId) {
      setEmployees([]);
      return;
    }
    setLoading(true);
    setMessage('');
    const { data, error } = await (supabase as any)
      .from('hr_employees')
      .select('*')
      .eq('company_id', companyId)
      .eq('active', true)
      .order('name');

    if (error) {
      if (isMissingHrStorage(error)) {
        setStorageMode('local');
        setEmployees(
          readLocal<EmployeeRow[]>(localKey('employees', companyId, user?.id || 'unknown'), []),
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
  }, [companyId, loadHistory, user?.id]);

  useEffect(() => {
    setEmployees([]);
    setHistory([]);
    setCurrentRecordId(null);
    setRecordStatus('draft');
    setForm(emptyWorkHoursForm());
    setMessage('');
    setDirty(false);
    setView('schedule');

    if (!companyId || !user?.id) {
      setEmployeeId('');
      return;
    }

    const last = readLocal<{ employeeId?: string; competence?: string }>(
      lastKey(user.id, companyId),
      {},
    );
    setEmployeeId(last.employeeId || '');
    setCompetence(last.competence || currentCompetence());
    void loadEmployees();
  }, [companyId, user?.id, loadEmployees]);

  useEffect(() => {
    if (!user?.id || !companyId) return;
    writeLocal(lastKey(user.id, companyId), { employeeId, competence });
  }, [user?.id, companyId, employeeId, competence]);

  useEffect(() => {
    if (!employeeId || !currentEmployee || !companyId || !user?.id) {
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
            localKey('calculations', companyId, user.id),
            [],
          ).find(
            row => row.employee_id === employeeId && row.competence.slice(0, 7) === competence,
          ) || null;
      } else {
        const { data, error } = await (supabase as any)
          .from('hr_work_hour_calculations')
          .select('*')
          .eq('company_id', companyId)
          .eq('employee_id', employeeId)
          .eq('competence', competenceDate(competence))
          .maybeSingle();

        if (error && isMissingHrStorage(error)) {
          setStorageMode('local');
          saved =
            readLocal<CalculationRow[]>(
              localKey('calculations', companyId, user.id),
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
        draftKey(user.id, companyId, employeeId, competence),
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
  }, [employeeId, competence, currentEmployee?.id, companyId, user?.id, storageMode]);

  useEffect(() => {
    if (!dirty || !user?.id || !companyId || !employeeId) return;
    writeLocal(draftKey(user.id, companyId, employeeId, competence), form);
  }, [dirty, user?.id, companyId, employeeId, competence, form]);

  const updateForm = <K extends keyof WorkHoursForm>(key: K, value: WorkHoursForm[K]) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setDirty(true);
    setMessage('');
  };

  const createEmployee = async () => {
    if (!companyId || !user?.id || !newEmployee.name.trim()) {
      setMessage('Informe o nome do funcionário.');
      return;
    }

    setSaving(true);
    setMessage('');
    const row: EmployeeRow = {
      id: crypto.randomUUID(),
      company_id: companyId,
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
      writeLocal(localKey('employees', companyId, user.id), next);
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
          writeLocal(localKey('employees', companyId, user.id), next);
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
      baseSalary: 0,
      hourlyRate: 0,
      monthlyHours: 220,
      dailyHours: 8,
    });
    setSaving(false);
  };

  const persistEmployeeDefaults = async () => {
    if (!currentEmployee || !user?.id || !companyId) return;

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
      writeLocal(localKey('employees', companyId, user.id), next);
      return;
    }

    const { error } = await (supabase as any)
      .from('hr_employees')
      .update(patch)
      .eq('id', currentEmployee.id)
      .eq('company_id', companyId);

    if (!error) {
      setEmployees(previous =>
        previous.map(employee =>
          employee.id === currentEmployee.id ? { ...employee, ...patch } : employee,
        ),
      );
    }
  };

  const saveCalculation = async (status: 'draft' | 'finalized') => {
    if (!companyId || !user?.id || !employeeId || !currentEmployee) {
      setMessage('Selecione um funcionário antes de salvar.');
      return;
    }

    setSaving(true);
    setMessage('');
    const now = new Date().toISOString();
    const payload: CalculationRow = {
      id: currentRecordId || crypto.randomUUID(),
      company_id: companyId,
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
        localKey('calculations', companyId, user.id),
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
      writeLocal(localKey('calculations', companyId, user.id), rows);
      setHistory(rows);
      setCurrentRecordId(persisted.id);
    };

    if (storageMode === 'local') {
      persistLocalCalculation();
    } else {
      const dbPayload = {
        company_id: companyId,
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
        .upsert(dbPayload, { onConflict: 'company_id,employee_id,competence' })
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
    localStorage.removeItem(draftKey(user.id, companyId, employeeId, competence));
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
      { id: crypto.randomUUID(), label: '', amount: 0 },
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
    <AdminLayout>
      <AdminPage className="space-y-5">
        <AdminPageHeader
          eyebrow="Departamento Pessoal"
          title="Calculadora de horas"
          description="Configure a jornada semanal, registre apenas as ocorrências do mês e confira o resultado em uma tela separada."
        />

        {message && (
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {!selectedCompany ? (
          <AdminSection>
            <AdminEmptyState
              icon={<Clock3 className="h-7 w-7" />}
              title="Selecione uma empresa no topo"
              description="A calculadora sempre trabalha dentro da empresa ativa do painel."
            />
          </AdminSection>
        ) : loading ? (
          <AdminSection>
            <AdminLoadingState label="Carregando Departamento Pessoal..." />
          </AdminSection>
        ) : (
          <>
            <div className="border-y border-border/60 bg-background py-3">
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
                    className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                  <span>{selectedCompany.company_name}</span>
                  <span>•</span>
                  <span className="capitalize">{formatCompetence(competenceDate(competence))}</span>
                  <span>•</span>
                  <span>{statusLabel}</span>
                  {weeklyMinutes > 0 && (
                    <>
                      <span>•</span>
                      <span>Jornada semanal: {formatMinutes(weeklyMinutes)}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {showNewEmployee && (
              <AdminSection>
                <div className="border-b border-border/50 px-5 py-4">
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
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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

            {!employees.length && !showNewEmployee ? (
              <AdminSection>
                <AdminEmptyState
                  icon={<UserPlus className="h-7 w-7" />}
                  title="Cadastre o primeiro funcionário"
                  description="Depois você configura os horários de cada dia da semana na própria calculadora."
                />
              </AdminSection>
            ) : (
              <AdminSection className="overflow-visible">
                <ViewTabs value={view} onChange={setView} />

                {!employeeId || !currentEmployee ? (
                  <AdminEmptyState
                    icon={<Clock3 className="h-7 w-7" />}
                    title="Selecione um funcionário"
                    description="A jornada, as ocorrências e o histórico serão carregados para a pessoa escolhida."
                  />
                ) : loadingRecord ? (
                  <AdminLoadingState label="Abrindo cálculo..." />
                ) : view === 'schedule' ? (
                  <div className="p-5">
                    <div className="mb-6">
                      <h2 className="text-base font-semibold">1. Jornada e contrato</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Primeiro defina a base do funcionário. Depois informe os horários de cada dia.
                      </p>
                    </div>

                    <div className="grid gap-4 border-b border-border/50 pb-6 sm:grid-cols-2 xl:grid-cols-5">
                      <label className="block">
                        <span className="text-[11px] font-medium">Tipo</span>
                        <select
                          value={form.employmentType}
                          onChange={event =>
                            updateForm('employmentType', event.target.value as EmploymentType)
                          }
                          className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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

                    <div className="mt-6 flex justify-end border-t border-border/50 pt-4">
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
                        <div className="mb-4 border-b border-border/50 pb-3">
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

                      <section className="border-t border-border/50 py-6 lg:border-l lg:border-t-0 lg:px-6 lg:py-0">
                        <div className="mb-4 border-b border-border/50 pb-3">
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

                      <section className="border-t border-border/50 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                        <div className="mb-4 border-b border-border/50 pb-3">
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
                        <label className="mt-4 flex items-center justify-between gap-3 border-t border-border/40 pt-4 text-sm">
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

                    <div className="mt-7 grid gap-6 border-t border-border/50 pt-6 lg:grid-cols-2">
                      <section>
                        <div className="mb-3">
                          <p className="text-sm font-semibold">Outros acréscimos</p>
                          <p className="text-xs text-muted-foreground">
                            Comissão, gratificação ou outro valor pontual.
                          </p>
                        </div>
                        <AdjustmentRows
                          rows={form.otherAdditions}
                          onChange={rows => updateForm('otherAdditions', rows)}
                          onAdd={() => addAdjustment('otherAdditions')}
                          onRemove={id => removeAdjustment('otherAdditions', id)}
                          kind="addition"
                        />
                      </section>

                      <section className="border-t border-border/50 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                        <div className="mb-3">
                          <p className="text-sm font-semibold">Outros descontos</p>
                          <p className="text-xs text-muted-foreground">
                            Adiantamento, vale ou outro valor manual.
                          </p>
                        </div>
                        <AdjustmentRows
                          rows={form.otherDeductions}
                          onChange={rows => updateForm('otherDeductions', rows)}
                          onAdd={() => addAdjustment('otherDeductions')}
                          onRemove={id => removeAdjustment('otherDeductions', id)}
                          kind="deduction"
                        />
                      </section>
                    </div>

                    <details className="mt-7 border-t border-border/50 pt-4">
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

                    <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-border/50 pt-4">
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
                        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border/50 pt-4 text-sm">
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

                      <div className="border-t border-border/50 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
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
                            <p className="mt-5 border-t border-border/50 pt-4 text-xs text-muted-foreground">
                              Banco de horas apenas registrado: +{formatMinutes(result.minutes.bankPositive)} / -
                              {formatMinutes(result.minutes.bankNegative)}. Não altera o total.
                            </p>
                          )}
                      </div>
                    </div>

                    <details className="mt-7 border-t border-border/50 pt-4">
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
                      <p className="mt-5 border-t border-border/50 pt-4 text-xs leading-5 text-muted-foreground">
                        Modo temporário: estes dados estão sendo preservados neste navegador enquanto a estrutura de banco do Departamento Pessoal não é aplicada.
                      </p>
                    )}

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
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
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
                      <div>
                        <h2 className="text-sm font-semibold">Histórico</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {selectedCompany.company_name}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void loadHistory()}>
                        Atualizar
                      </Button>
                    </div>

                    {!history.length ? (
                      <AdminEmptyState
                        icon={<History className="h-7 w-7" />}
                        title="Nenhum cálculo salvo"
                        description="Rascunhos e cálculos finalizados desta empresa aparecerão aqui."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                          <thead className="border-b border-border/60 bg-muted/15 text-[10px] uppercase tracking-[.08em] text-muted-foreground">
                            <tr>
                              <th className="px-5 py-3 font-semibold">Funcionário</th>
                              <th className="px-4 py-3 font-semibold">Competência</th>
                              <th className="px-4 py-3 font-semibold">Status</th>
                              <th className="px-4 py-3 font-semibold">Acréscimos</th>
                              <th className="px-4 py-3 font-semibold">Descontos</th>
                              <th className="px-4 py-3 font-semibold">Total</th>
                              <th className="px-4 py-3 font-semibold">Atualizado</th>
                              <th className="px-4 py-3" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {history.map(row => (
                              <tr key={row.id} className="hover:bg-muted/15">
                                <td className="px-5 py-3 font-medium">{row.employee_name_snapshot}</td>
                                <td className="px-4 py-3 capitalize">{formatCompetence(row.competence)}</td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-muted-foreground">
                                    {row.status === 'finalized' ? 'Finalizado' : 'Rascunho'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {formatCurrency(Number(row.result_data?.additionsTotal || 0))}
                                </td>
                                <td className="px-4 py-3">
                                  {formatCurrency(Number(row.result_data?.deductionsTotal || 0))}
                                </td>
                                <td className="px-4 py-3 font-semibold">
                                  {formatCurrency(Number(row.result_data?.total || 0))}
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                  {formatDateTime(row.updated_at)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button variant="outline" size="sm" onClick={() => openHistoryRow(row)}>
                                    Abrir
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </AdminSection>
            )}
          </>
        )}
      </AdminPage>
    </AdminLayout>
  );
}
