alter table if exists public.hr_employees
  add column if not exists weekly_schedule jsonb not null default
  '[
    {"key":"monday","active":true,"entry1":"","exit1":"","entry2":"","exit2":""},
    {"key":"tuesday","active":true,"entry1":"","exit1":"","entry2":"","exit2":""},
    {"key":"wednesday","active":true,"entry1":"","exit1":"","entry2":"","exit2":""},
    {"key":"thursday","active":true,"entry1":"","exit1":"","entry2":"","exit2":""},
    {"key":"friday","active":true,"entry1":"","exit1":"","entry2":"","exit2":""},
    {"key":"saturday","active":false,"entry1":"","exit1":"","entry2":"","exit2":""},
    {"key":"sunday","active":false,"entry1":"","exit1":"","entry2":"","exit2":""}
  ]'::jsonb;

alter table if exists public.hr_employees
  drop constraint if exists hr_employees_weekly_schedule_array;

alter table if exists public.hr_employees
  add constraint hr_employees_weekly_schedule_array
  check (jsonb_typeof(weekly_schedule) = 'array');

comment on column public.hr_employees.weekly_schedule is
  'Jornada semanal padrão do funcionário, com dias ativos e até dois períodos de trabalho por dia.';
