-- Departamento Pessoal independente do seletor global de empresas do ADM.
-- Mantém company_id somente para compatibilidade com registros históricos, sem usá-lo no fluxo novo.

alter table if exists public.hr_employees
  alter column company_id drop not null;

alter table if exists public.hr_work_hour_calculations
  alter column company_id drop not null;

alter table if exists public.hr_employees
  add column if not exists registration text,
  add column if not exists pis text,
  add column if not exists admission_date date,
  add column if not exists role_title text,
  add column if not exists department text,
  add column if not exists employer_name text,
  add column if not exists employer_cnpj text,
  add column if not exists bank_hours_start_date date,
  add column if not exists schedule_label text,
  add column if not exists source_metadata jsonb not null default '{}'::jsonb;

alter table if exists public.hr_work_hour_calculations
  add column if not exists source_type text,
  add column if not exists source_metadata jsonb not null default '{}'::jsonb,
  add column if not exists imported_punches jsonb not null default '[]'::jsonb;

alter table if exists public.hr_work_hour_calculations
  drop constraint if exists hr_work_hour_calculations_employee_month_unique;

create unique index if not exists hr_work_hour_calculations_employee_month_uidx
  on public.hr_work_hour_calculations(employee_id, competence);

create index if not exists hr_employees_active_name_global_idx
  on public.hr_employees(active, name);

create index if not exists hr_employees_cpf_idx
  on public.hr_employees(cpf)
  where cpf is not null and cpf <> '';

create index if not exists hr_work_hour_calculations_competence_global_idx
  on public.hr_work_hour_calculations(competence desc, updated_at desc);

comment on column public.hr_employees.company_id is
  'Legado: não deve ser usado para filtrar a Calculadora de Horas. A área de DP é independente do seletor global de empresas do ADM.';
comment on column public.hr_employees.source_metadata is
  'Metadados de origem de cadastros/importações, como Relatório Espelho Ponto.';
comment on column public.hr_work_hour_calculations.imported_punches is
  'Marcações diárias importadas do espelho de ponto para conferência e futura apuração automática.';
