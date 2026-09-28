alter table if exists public.hr_employees
  alter column base_salary set default 1621;

comment on column public.hr_employees.base_salary is
  'Salário-base do funcionário. Novos mensalistas partem do salário mínimo nacional de 2026 (R$ 1.621,00), permanecendo editável.';
