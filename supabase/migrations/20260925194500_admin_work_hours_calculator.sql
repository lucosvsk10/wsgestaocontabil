-- Departamento Pessoal: cadastro mínimo de funcionários e cálculos mensais de horas.
-- Acesso exclusivo a administradores da WS. O cálculo não substitui folha/encargos legais.

create table if not exists public.hr_employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  cpf text,
  employment_type text not null default 'monthly'
    check (employment_type in ('monthly', 'hourly')),
  base_salary numeric(14,2) not null default 0 check (base_salary >= 0),
  hourly_rate numeric(14,6) not null default 0 check (hourly_rate >= 0),
  monthly_hours numeric(8,2) not null default 220 check (monthly_hours > 0),
  daily_hours numeric(8,2) not null default 8 check (daily_hours >= 0),
  absence_day_divisor numeric(8,2) not null default 30 check (absence_day_divisor > 0),
  overtime_50_percent numeric(8,2) not null default 50 check (overtime_50_percent >= 0),
  overtime_100_percent numeric(8,2) not null default 100 check (overtime_100_percent >= 0),
  night_percent numeric(8,2) not null default 20 check (night_percent >= 0),
  holiday_percent numeric(8,2) not null default 100 check (holiday_percent >= 0),
  active boolean not null default true,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hr_employees_company_active_name_idx
  on public.hr_employees(company_id, active, name);

create table if not exists public.hr_work_hour_calculations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.hr_employees(id) on delete cascade,
  competence date not null,
  status text not null default 'draft'
    check (status in ('draft', 'finalized')),
  employee_name_snapshot text not null,
  form_data jsonb not null default '{}'::jsonb,
  result_data jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hr_work_hour_calculations_competence_first_day
    check (extract(day from competence) = 1),
  constraint hr_work_hour_calculations_employee_month_unique
    unique (company_id, employee_id, competence)
);

create index if not exists hr_work_hour_calculations_company_competence_idx
  on public.hr_work_hour_calculations(company_id, competence desc, updated_at desc);

alter table public.hr_employees enable row level security;
alter table public.hr_work_hour_calculations enable row level security;

drop policy if exists hr_employees_admin_select on public.hr_employees;
create policy hr_employees_admin_select
on public.hr_employees
for select
to authenticated
using (private.is_any_admin((select auth.uid())));

drop policy if exists hr_employees_admin_manage on public.hr_employees;
create policy hr_employees_admin_manage
on public.hr_employees
for all
to authenticated
using (private.is_any_admin((select auth.uid())))
with check (private.is_any_admin((select auth.uid())));

drop policy if exists hr_work_hour_calculations_admin_select on public.hr_work_hour_calculations;
create policy hr_work_hour_calculations_admin_select
on public.hr_work_hour_calculations
for select
to authenticated
using (private.is_any_admin((select auth.uid())));

drop policy if exists hr_work_hour_calculations_admin_manage on public.hr_work_hour_calculations;
create policy hr_work_hour_calculations_admin_manage
on public.hr_work_hour_calculations
for all
to authenticated
using (private.is_any_admin((select auth.uid())))
with check (private.is_any_admin((select auth.uid())));

grant select, insert, update, delete on table public.hr_employees to authenticated;
grant select, insert, update, delete on table public.hr_work_hour_calculations to authenticated;

comment on table public.hr_employees is
  'Cadastro mínimo por empresa usado pelas ferramentas internas de Departamento Pessoal da WS.';
comment on table public.hr_work_hour_calculations is
  'Rascunhos e cálculos finalizados da Calculadora de Horas do painel administrador.';
