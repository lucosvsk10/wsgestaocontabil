import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  Clock3,
  Copy,
  History,
  Plus,
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
  AdminToolbar,
} from '@/components/admin/ui/AdminPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCompanySelection } from '@/contexts/CompanySelectionContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DailyTimeCalculator from '@/components/admin/hr/DailyTimeCalculator';
import {
  calculateWorkHours,
  emptyWorkHoursForm,
  formatCurrency,
  formatMinutes,
  parseHoursToMinutes,
  type EmploymentType,
  type MoneyAdjustment,
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

const localKey = (kind: string, companyId: string, userId: string) => `ws:hr:${kind}:${userId}:${companyId}`;
const draftKey = (userId: string, companyId: string, employeeId: string, competence: string) =>
  `ws:hr:hours:draft:${userId}:${companyId}:${employeeId}:${competence}`;
const lastKey = (userId: string, companyId: string) => `ws:hr:hours:last:${userId}:${companyId}`;

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
    // Browser storage is best effort. The normal path is Supabase.
  }
}

function isMissingHrStorage(error: any) {
  const text = String(error?.message || error?.details || '').toLowerCase();
  return error?.code === '42P01' || text.includes('hr_employees') || text.includes('hr_work_hour_calculations');
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
      {hint && <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span>}
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
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-foreground">{label}</span>
      <div className="relative mt-1.5">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={event => onChange(numberValue(event.target.value))}
          className={`h-10 ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
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
        <div key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_40px]">
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
              onChange(rows.map(item => (item.id === row.id ? { ...item, amount: numberValue(event.target.value) } : item)))
            }
            className="h-10"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(row.id)} aria-label="Remover lançamento">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {kind === 'addition' ? 'Outro acréscimo' : 'Outro desconto'}
      </Button>
    </div>
  );
}

export default function AdminWorkHoursCalculator() {
  const { user } = useAuth();
  const { selectedCompany } = useCompanySelection();
  const companyId = selectedCompany?.id || '';

  const [view, setView] = useState<'calculator' | 'history'>('calculator');
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

  const loadHistory = useCallback(async (mode = storageMode) => {
    if (!companyId) {
      setHistory([]);
      return;
    }
    if (mode === 'local') {
      setHistory(readLocal<CalculationRow[]>(localKey('calculations', companyId, user?.id || 'unknown'), []));
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
        setHistory(readLocal<CalculationRow[]>(localKey('calculations', companyId, user?.id || 'unknown'), []));
        return;
      }
      setMessage(error.message || 'Não foi possível carregar o histórico.');
      return;
    }
    setHistory((data || []) as CalculationRow[]);
  }, [companyId, storageMode]);

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
        setEmployees(readLocal<EmployeeRow[]>(localKey('employees', companyId, user?.id || 'unknown'), []));
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
  }, [companyId, loadHistory]);

  useEffect(() => {
    setEmployees([]);
    setHistory([]);
    setCurrentRecordId(null);
    setRecordStatus('draft');
    setForm(emptyWorkHoursForm());
    setMessage('');
    setDirty(false);

    if (!companyId || !user?.id) {
      setEmployeeId('');
      return;
    }

    const last = readLocal<{ employeeId?: string; competence?: string }>(lastKey(user.id, companyId), {});
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
          readLocal<CalculationRow[]>(localKey('calculations', companyId, user?.id || 'unknown'), []).find(
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
            readLocal<CalculationRow[]>(localKey('calculations', companyId, user?.id || 'unknown'), []).find(
              row => row.employee_id === employeeId && row.competence.slice(0, 7) === competence,
            ) || null;
        } else if (error) {
          setMessage(error.message || 'Não foi possível abrir este cálculo.');
        } else {
          saved = data as CalculationRow | null;
        }
      }

      if (!active) return;

      if (saved) {
        setCurrentRecordId(saved.id);
        setRecordStatus(saved.status);
        setForm({ ...emptyWorkHoursForm(), ...(saved.form_data || {}) });
        setDirty(false);
      } else {
        const browserDraft = readLocal<WorkHoursForm | null>(
          draftKey(user.id, companyId, employeeId, competence),
          null,
        );
        setCurrentRecordId(null);
        setRecordStatus('draft');
        setForm(browserDraft ? { ...emptyWorkHoursForm(), ...browserDraft } : employeeDefaults(currentEmployee));
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
      active: true,
    };

    if (storageMode === 'local') {
      const next = [...employees, row].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      setEmployees(next);
      writeLocal(localKey('employees', companyId, user?.id || 'unknown'), next);
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
          writeLocal(localKey('employees', companyId, user?.id || 'unknown'), next);
          setEmployeeId(row.id);
        } else {
          setMessage(error.message || 'Não foi possível cadastrar o funcionário.');
          setSaving(false);
          return;
        }
      } else {
        const created = data as EmployeeRow;
        setEmployees(previous => [...previous, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
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
      const rows = readLocal<CalculationRow[]>(localKey('calculations', companyId, user?.id || 'unknown'), []);
      const existingIndex = rows.findIndex(
        row => row.employee_id === employeeId && row.competence.slice(0, 7) === competence,
      );
      const persisted = { ...payload, created_at: existingIndex >= 0 ? rows[existingIndex].created_at : now };
      if (existingIndex >= 0) rows[existingIndex] = persisted;
      else rows.unshift(persisted);
      writeLocal(localKey('calculations', companyId, user?.id || 'unknown'), rows);
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
    setForm({ ...emptyWorkHoursForm(), ...(previous.form_data || {}) });
    setDirty(true);
    setMessage(`Dados de ${formatCompetence(previous.competence)} copiados para ${formatCompetence(target)}.`);
  };

  const addMinutesToField = (
    key: 'overtime50' | 'overtime100' | 'lateHours',
    minutes: number,
  ) => {
    const current = parseHoursToMinutes(form[key]);
    updateForm(key, formatMinutes(current + Math.max(0, minutes)));
    setMessage('Diferença adicionada ao cálculo mensal.');
  };

  const addAdjustment = (kind: 'otherAdditions' | 'otherDeductions') => {
    updateForm(kind, [
      ...form[kind],
      { id: crypto.randomUUID(), label: '', amount: 0 },
    ] as WorkHoursForm[typeof kind]);
  };

  const removeAdjustment = (kind: 'otherAdditions' | 'otherDeductions', id: string) => {
    updateForm(kind, form[kind].filter(item => item.id !== id) as WorkHoursForm[typeof kind]);
  };

  const openHistoryRow = (row: CalculationRow) => {
    setEmployeeId(row.employee_id);
    setCompetence(row.competence.slice(0, 7));
    setView('calculator');
  };

  const summaryRows = [
    ['Salário / base', result.basePay],
    ['HE 50%', result.additions.overtime50],
    ['HE 100%', result.additions.overtime100],
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
          description="Apure horas, adicionais e descontos sem transformar a rotina em uma folha de pagamento inteira."
          actions={
            <>
              <Button
                variant={view === 'calculator' ? 'default' : 'outline'}
                onClick={() => setView('calculator')}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Calcular
              </Button>
              <Button
                variant={view === 'history' ? 'default' : 'outline'}
                onClick={() => setView('history')}
              >
                <History className="mr-2 h-4 w-4" />
                Histórico
              </Button>
            </>
          }
        />

        {message && (
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground">
            {message}
          </div>
        )}

        {!selectedCompany ? (
          <AdminSection>
            <AdminEmptyState
              icon={<Clock3 className="h-7 w-7" />}
              title="Selecione uma empresa no topo"
              description="A calculadora sempre trabalha isolada dentro da empresa ativa do painel."
            />
          </AdminSection>
        ) : loading ? (
          <AdminSection>
            <AdminLoadingState label="Carregando Departamento Pessoal..." />
          </AdminSection>
        ) : view === 'history' ? (
          <AdminSection>
            <AdminToolbar>
              <div>
                <p className="text-sm font-semibold">Histórico de cálculos</p>
                <p className="text-xs text-muted-foreground">{selectedCompany.company_name}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadHistory()}>
                Atualizar
              </Button>
            </AdminToolbar>
            {!history.length ? (
              <AdminEmptyState
                icon={<History className="h-7 w-7" />}
                title="Nenhum cálculo salvo"
                description="Os rascunhos e cálculos finalizados desta empresa aparecerão aqui."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-border/60 bg-muted/20 text-[10px] uppercase tracking-[.08em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Funcionário</th>
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
                        <td className="px-4 py-3 font-medium">{row.employee_name_snapshot}</td>
                        <td className="px-4 py-3 capitalize">{formatCompetence(row.competence)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${row.status === 'finalized' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                            {row.status === 'finalized' ? 'Finalizado' : 'Rascunho'}
                          </span>
                        </td>
                        <td className="px-4 py-3">{formatCurrency(Number(row.result_data?.additionsTotal || 0))}</td>
                        <td className="px-4 py-3">{formatCurrency(Number(row.result_data?.deductionsTotal || 0))}</td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(Number(row.result_data?.total || 0))}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(row.updated_at)}</td>
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
          </AdminSection>
        ) : (
          <>
            <AdminSection>
              <AdminToolbar>
                <div className="grid min-w-0 flex-1 gap-3 lg:grid-cols-[minmax(260px,1fr)_190px_auto]">
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">Funcionário</span>
                    <select
                      value={employeeId}
                      onChange={event => setEmployeeId(event.target.value)}
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
                    <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">Competência</span>
                    <Input
                      type="month"
                      value={competence}
                      onChange={event => setCompetence(event.target.value)}
                      className="mt-1.5 h-10"
                    />
                  </label>
                  <div className="flex items-end gap-2">
                    <Button variant="outline" onClick={duplicatePrevious} disabled={!employeeId}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicar mês anterior
                    </Button>
                  </div>
                </div>
                <Button onClick={() => setShowNewEmployee(value => !value)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Novo funcionário
                </Button>
              </AdminToolbar>

              {showNewEmployee && (
                <div className="border-b border-border/50 bg-muted/10 p-4">
                  <div className="mb-3">
                    <p className="text-sm font-semibold">Cadastro rápido</p>
                    <p className="text-xs text-muted-foreground">Só o necessário para reaproveitar nos próximos meses.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="block xl:col-span-2">
                      <span className="text-[11px] font-medium">Nome</span>
                      <Input
                        value={newEmployee.name}
                        onChange={event => setNewEmployee(previous => ({ ...previous, name: event.target.value }))}
                        className="mt-1.5 h-10"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-medium">CPF (opcional)</span>
                      <Input
                        value={newEmployee.cpf}
                        onChange={event => setNewEmployee(previous => ({ ...previous, cpf: event.target.value.replace(/\D/g, '').slice(0, 11) }))}
                        className="mt-1.5 h-10"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-medium">Tipo</span>
                      <select
                        value={newEmployee.employmentType}
                        onChange={event => setNewEmployee(previous => ({ ...previous, employmentType: event.target.value as EmploymentType }))}
                        className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="monthly">Mensalista</option>
                        <option value="hourly">Horista</option>
                      </select>
                    </label>
                    {newEmployee.employmentType === 'monthly' ? (
                      <>
                        <NumberInput label="Salário base" value={newEmployee.baseSalary} onChange={value => setNewEmployee(previous => ({ ...previous, baseSalary: value }))} prefix="R$" />
                        <NumberInput label="Jornada mensal" value={newEmployee.monthlyHours} onChange={value => setNewEmployee(previous => ({ ...previous, monthlyHours: value }))} suffix="h" />
                      </>
                    ) : (
                      <NumberInput label="Valor da hora" value={newEmployee.hourlyRate} onChange={value => setNewEmployee(previous => ({ ...previous, hourlyRate: value }))} prefix="R$" />
                    )}
                    <NumberInput label="Jornada diária" value={newEmployee.dailyHours} onChange={value => setNewEmployee(previous => ({ ...previous, dailyHours: value }))} suffix="h" />
                    <div className="flex items-end gap-2">
                      <Button onClick={() => void createEmployee()} disabled={saving}>
                        {saving ? 'Salvando...' : 'Cadastrar'}
                      </Button>
                      <Button variant="ghost" onClick={() => setShowNewEmployee(false)}>Cancelar</Button>
                    </div>
                  </div>
                </div>
              )}

              {!employees.length && !showNewEmployee && (
                <AdminEmptyState
                  icon={<UserPlus className="h-7 w-7" />}
                  title="Cadastre o primeiro funcionário"
                  description="Depois disso, salário, jornada e percentuais padrão ficam prontos para as próximas competências."
                />
              )}
            </AdminSection>

            {employeeId && currentEmployee && (
              loadingRecord ? (
                <AdminSection>
                  <AdminLoadingState label="Abrindo cálculo..." />
                </AdminSection>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.75fr)]">
                  <div className="space-y-5">
                    <AdminSection>
                      <AdminToolbar>
                        <div>
                          <p className="text-sm font-semibold">Base do cálculo</p>
                          <p className="text-xs text-muted-foreground">{currentEmployee.name} · {formatCompetence(competenceDate(competence))}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${recordStatus === 'finalized' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                          {dirty ? 'Alterações não salvas' : recordStatus === 'finalized' ? 'Finalizado' : 'Rascunho'}
                        </span>
                      </AdminToolbar>
                      <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
                        <label className="block">
                          <span className="text-[11px] font-medium">Tipo</span>
                          <select
                            value={form.employmentType}
                            onChange={event => updateForm('employmentType', event.target.value as EmploymentType)}
                            className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="monthly">Mensalista</option>
                            <option value="hourly">Horista</option>
                          </select>
                        </label>
                        {form.employmentType === 'monthly' ? (
                          <>
                            <NumberInput label="Salário base" value={form.baseSalary} onChange={value => updateForm('baseSalary', value)} prefix="R$" />
                            <NumberInput label="Jornada mensal" value={form.monthlyHours} onChange={value => updateForm('monthlyHours', value)} suffix="h" />
                          </>
                        ) : (
                          <>
                            <NumberInput label="Valor da hora" value={form.hourlyRate} onChange={value => updateForm('hourlyRate', value)} prefix="R$" />
                            <TimeInput label="Horas normais no mês" value={form.normalHours} onChange={value => updateForm('normalHours', value)} />
                          </>
                        )}
                        <NumberInput label="Jornada diária" value={form.dailyHours} onChange={value => updateForm('dailyHours', value)} suffix="h" />
                      </div>
                    </AdminSection>

                    <DailyTimeCalculator
                      dailyHours={form.dailyHours}
                      onAddOvertime={(minutes, kind) =>
                        addMinutesToField(kind === '50' ? 'overtime50' : 'overtime100', minutes)
                      }
                      onAddDeficit={minutes => addMinutesToField('lateHours', minutes)}
                    />

                    <div className="grid gap-5 lg:grid-cols-2">
                      <AdminSection>
                        <AdminToolbar>
                          <div>
                            <p className="text-sm font-semibold">Acréscimos</p>
                            <p className="text-xs text-muted-foreground">Informe só o que aconteceu no mês.</p>
                          </div>
                        </AdminToolbar>
                        <div className="grid gap-4 p-4 sm:grid-cols-2">
                          <TimeInput label={`Hora extra ${form.overtime50Percent}%`} value={form.overtime50} onChange={value => updateForm('overtime50', value)} />
                          <TimeInput label={`Hora extra ${form.overtime100Percent}%`} value={form.overtime100} onChange={value => updateForm('overtime100', value)} />
                          <TimeInput label="Horas noturnas" value={form.nightHours} onChange={value => updateForm('nightHours', value)} hint={`Adicional atual: ${form.nightPercent}%`} />
                          <TimeInput label="Domingo / feriado" value={form.holidayHours} onChange={value => updateForm('holidayHours', value)} hint={`Adicional atual: ${form.holidayPercent}%`} />
                          <TimeInput label="Banco positivo" value={form.bankPositive} onChange={value => updateForm('bankPositive', value)} hint={form.settleBank ? 'Entra no valor deste mês.' : 'Apenas saldo informativo.'} />
                        </div>
                        <div className="border-t border-border/50 p-4">
                          <AdjustmentRows
                            rows={form.otherAdditions}
                            onChange={rows => updateForm('otherAdditions', rows)}
                            onAdd={() => addAdjustment('otherAdditions')}
                            onRemove={id => removeAdjustment('otherAdditions', id)}
                            kind="addition"
                          />
                        </div>
                      </AdminSection>

                      <AdminSection>
                        <AdminToolbar>
                          <div>
                            <p className="text-sm font-semibold">Descontos</p>
                            <p className="text-xs text-muted-foreground">Faltas, atrasos e banco negativo.</p>
                          </div>
                        </AdminToolbar>
                        <div className="grid gap-4 p-4 sm:grid-cols-2">
                          <NumberInput label="Faltas em dias" value={form.absenceDays} onChange={value => updateForm('absenceDays', value)} step="0.5" />
                          <TimeInput label="Faltas em horas" value={form.absenceHours} onChange={value => updateForm('absenceHours', value)} />
                          <TimeInput label="Atrasos / saídas" value={form.lateHours} onChange={value => updateForm('lateHours', value)} />
                          <TimeInput label="Banco negativo" value={form.bankNegative} onChange={value => updateForm('bankNegative', value)} hint={form.settleBank ? 'Descontado neste mês.' : 'Apenas saldo informativo.'} />
                          <label className="sm:col-span-2 flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/15 px-3 py-3 text-sm">
                            <span>
                              <b className="block font-medium">Liquidar banco de horas nesta competência</b>
                              <small className="text-muted-foreground">Quando desligado, os saldos ficam registrados sem alterar o total.</small>
                            </span>
                            <input
                              type="checkbox"
                              checked={form.settleBank}
                              onChange={event => updateForm('settleBank', event.target.checked)}
                              className="h-4 w-4"
                            />
                          </label>
                        </div>
                        <div className="border-t border-border/50 p-4">
                          <AdjustmentRows
                            rows={form.otherDeductions}
                            onChange={rows => updateForm('otherDeductions', rows)}
                            onAdd={() => addAdjustment('otherDeductions')}
                            onRemove={id => removeAdjustment('otherDeductions', id)}
                            kind="deduction"
                          />
                        </div>
                      </AdminSection>
                    </div>

                    <AdminSection>
                      <details>
                        <summary className="cursor-pointer select-none px-4 py-4 text-sm font-semibold">
                          Regras do cálculo
                          <span className="ml-2 text-xs font-normal text-muted-foreground">percentuais e divisores editáveis</span>
                        </summary>
                        <div className="grid gap-4 border-t border-border/50 p-4 sm:grid-cols-2 lg:grid-cols-5">
                          <NumberInput label="HE principal" value={form.overtime50Percent} onChange={value => updateForm('overtime50Percent', value)} suffix="%" />
                          <NumberInput label="HE especial" value={form.overtime100Percent} onChange={value => updateForm('overtime100Percent', value)} suffix="%" />
                          <NumberInput label="Adicional noturno" value={form.nightPercent} onChange={value => updateForm('nightPercent', value)} suffix="%" />
                          <NumberInput label="Domingo / feriado" value={form.holidayPercent} onChange={value => updateForm('holidayPercent', value)} suffix="%" />
                          <NumberInput label="Divisor falta/dia" value={form.absenceDayDivisor} onChange={value => updateForm('absenceDayDivisor', value)} />
                        </div>
                        <p className="border-t border-border/50 px-4 py-3 text-[11px] leading-5 text-muted-foreground">
                          Os percentuais ficam editáveis porque convenções e regras aplicáveis podem variar. Esta tela apura horas e remuneração; INSS, FGTS, IRRF e demais encargos não são presumidos automaticamente aqui.
                        </p>
                      </details>
                    </AdminSection>
                  </div>

                  <div className="xl:sticky xl:top-5 xl:self-start">
                    <AdminSection>
                      <AdminToolbar>
                        <div>
                          <p className="text-sm font-semibold">Resumo</p>
                          <p className="text-xs text-muted-foreground">Atualizado enquanto você digita.</p>
                        </div>
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                      </AdminToolbar>

                      <div className="space-y-4 p-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
                            <span className="text-[10px] uppercase tracking-[.08em] text-muted-foreground">Valor da hora</span>
                            <b className="mt-1 block text-lg">{formatCurrency(result.hourlyRate)}</b>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
                            <span className="text-[10px] uppercase tracking-[.08em] text-muted-foreground">Valor do dia</span>
                            <b className="mt-1 block text-lg">{formatCurrency(result.dailyRate)}</b>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {summaryRows.filter(([, value]) => value !== 0 || value === result.basePay).map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-muted-foreground">{label}</span>
                              <b>{formatCurrency(value)}</b>
                            </div>
                          ))}
                          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-sm">
                            <span className="font-medium">Acréscimos</span>
                            <b>{formatCurrency(result.additionsTotal)}</b>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {deductionRows.filter(([, value]) => value !== 0).map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-muted-foreground">{label}</span>
                              <b>-{formatCurrency(value)}</b>
                            </div>
                          ))}
                          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-sm">
                            <span className="font-medium">Descontos</span>
                            <b>-{formatCurrency(result.deductionsTotal)}</b>
                          </div>
                        </div>

                        {!form.settleBank && (result.minutes.bankPositive > 0 || result.minutes.bankNegative > 0) && (
                          <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
                            Banco informado: +{formatMinutes(result.minutes.bankPositive)} / -{formatMinutes(result.minutes.bankNegative)}. Não afeta o total enquanto a liquidação estiver desligada.
                          </div>
                        )}

                        <div className="rounded-xl border border-foreground/15 bg-foreground/[.03] p-4">
                          <span className="text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">Total apurado</span>
                          <strong className="mt-1 block text-3xl tracking-tight">{formatCurrency(result.total)}</strong>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            Base + acréscimos − descontos de horas.
                          </span>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                          <Button
                            variant="outline"
                            onClick={() => void saveCalculation(recordStatus === 'finalized' ? 'finalized' : 'draft')}
                            disabled={saving}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {recordStatus === 'finalized' ? 'Salvar alterações' : 'Salvar rascunho'}
                          </Button>
                          <Button onClick={() => void saveCalculation('finalized')} disabled={saving}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Finalizar
                          </Button>
                        </div>

                        <details className="rounded-lg border border-border/60">
                          <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold">Ver memória de cálculo</summary>
                          <div className="space-y-2 border-t border-border/50 px-3 py-3">
                            {result.memory.length ? result.memory.map((line, index) => (
                              <p key={index} className="text-[11px] leading-5 text-muted-foreground">{line}</p>
                            )) : (
                              <p className="text-[11px] text-muted-foreground">Preencha os lançamentos para ver a memória detalhada.</p>
                            )}
                          </div>
                        </details>

                        {storageMode === 'local' && (
                          <p className="text-[10px] leading-4 text-muted-foreground">
                            Modo temporário: os dados desta área estão sendo preservados neste navegador enquanto a estrutura de banco do Departamento Pessoal não é aplicada.
                          </p>
                        )}
                      </div>
                    </AdminSection>
                  </div>
                </div>
              )
            )}
          </>
        )}
      </AdminPage>
    </AdminLayout>
  );
}
