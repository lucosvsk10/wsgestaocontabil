-- Keep a readable audit trail of the fiscal searches shown in the Extrator.
-- Reuses the existing fiscal_sync_logs table and records only meaningful state changes.

alter table public.fiscal_sync_logs
  add column if not exists source text,
  add column if not exists response_code text,
  add column if not exists response_message text,
  add column if not exists details jsonb not null default '{}'::jsonb;

create index if not exists fiscal_sync_logs_company_created_idx
  on public.fiscal_sync_logs(company_id, created_at desc);

create or replace function private.log_purchase_sync_history()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor uuid;
  started_at timestamptz;
  finished_at timestamptz;
  should_log boolean := false;
  normalized_status text;
begin
  if tg_op = 'INSERT' then
    should_log := new.last_completed_at is not null
      or new.last_error is not null
      or coalesce(new.status,'') in ('cooldown','error','failed','waiting_certificate');
  else
    should_log :=
      new.last_completed_at is distinct from old.last_completed_at
      or (new.last_error is distinct from old.last_error and new.last_error is not null)
      or (
        new.status is distinct from old.status
        and coalesce(new.status,'') in ('cooldown','error','failed','waiting_certificate')
      );
  end if;

  if not should_log then
    return new;
  end if;

  select created_by into actor
  from public.fiscal_companies
  where id = new.company_id;

  if actor is null then
    return new;
  end if;

  started_at := coalesce(new.last_started_at, new.updated_at, now());
  finished_at := coalesce(new.last_completed_at, new.last_failed_at, new.updated_at, now());

  normalized_status := case
    when new.last_error is not null or coalesce(new.status,'') in ('error','failed') then 'erro'
    when coalesce(new.status,'') = 'cooldown' then 'aguardando'
    when coalesce(new.status,'') = 'waiting_certificate' then 'aguardando'
    else 'concluido'
  end;

  insert into public.fiscal_sync_logs(
    company_id,
    sync_type,
    periodo_inicio,
    periodo_fim,
    documentos_encontrados,
    documentos_processados,
    documentos_erro,
    status,
    mensagem_erro,
    tempo_duracao,
    created_at,
    completed_at,
    created_by,
    source,
    response_code,
    response_message,
    details
  )
  values(
    new.company_id,
    'compras',
    started_at::date,
    finished_at::date,
    case when new.last_status_code = '138' then 1 else 0 end,
    case when new.last_completed_at is not null then 1 else 0 end,
    case when normalized_status = 'erro' then 1 else 0 end,
    normalized_status,
    new.last_error,
    greatest(0, floor(extract(epoch from (finished_at - started_at)))::integer),
    started_at,
    finished_at,
    actor,
    'Ambiente Nacional / SEFAZ',
    new.last_status_code,
    new.last_status_message,
    jsonb_build_object(
      'state_status', new.status,
      'consecutive_failures', coalesce(new.consecutive_failures,0),
      'next_scheduled_at', new.next_scheduled_at
    )
  );

  return new;
end
$$;

drop trigger if exists trg_purchase_sync_history on public.fiscal_purchase_sync_state;
create trigger trg_purchase_sync_history
after insert or update on public.fiscal_purchase_sync_state
for each row execute function private.log_purchase_sync_history();

create or replace function private.log_sales_state_history()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor uuid;
  started_at timestamptz;
  finished_at timestamptz;
  should_log boolean := false;
  msg text;
begin
  if tg_op = 'INSERT' then
    should_log := coalesce(new.status,'') in ('waiting_state_credentials','waiting_certificate','error','idle')
      or new.last_completed_at is not null;
  else
    should_log :=
      new.last_completed_at is distinct from old.last_completed_at
      or (
        new.status is distinct from old.status
        and coalesce(new.status,'') in ('waiting_state_credentials','waiting_certificate','error','idle')
      )
      or (new.last_error is distinct from old.last_error and new.last_error is not null);
  end if;

  if not should_log then
    return new;
  end if;

  select created_by into actor
  from public.fiscal_companies
  where id = new.company_id;

  if actor is null then
    return new;
  end if;

  started_at := coalesce(new.last_started_at, new.updated_at, now());
  finished_at := coalesce(new.last_completed_at, new.updated_at, now());

  msg := case coalesce(new.status,'')
    when 'waiting_state_credentials' then 'Aguardando credencial estadual para iniciar a leitura das vendas emitidas.'
    when 'waiting_certificate' then 'Aguardando certificado A1 válido.'
    when 'idle' then 'Rotina de vendas concluída.'
    when 'error' then coalesce(new.last_error,'Falha na rotina de vendas.')
    else coalesce(new.last_error, replace(coalesce(new.status,''),'_',' '))
  end;

  insert into public.fiscal_sync_logs(
    company_id,sync_type,periodo_inicio,periodo_fim,
    documentos_encontrados,documentos_processados,documentos_erro,
    status,mensagem_erro,tempo_duracao,created_at,completed_at,created_by,
    source,response_code,response_message,details
  )
  values(
    new.company_id,
    'vendas',
    started_at::date,
    finished_at::date,
    coalesce(new.found_documents,0),
    coalesce(new.scanned_numbers,0),
    case when new.last_error is not null or new.status='error' then 1 else 0 end,
    case
      when new.status='error' then 'erro'
      when new.status in ('waiting_state_credentials','waiting_certificate') then 'aguardando'
      when new.status='idle' then 'concluido'
      else coalesce(new.status,'iniciado')
    end,
    new.last_error,
    greatest(0, floor(extract(epoch from (finished_at - started_at)))::integer),
    started_at,
    case when new.status in ('waiting_state_credentials','waiting_certificate') then null else finished_at end,
    actor,
    'Sincronização de vendas',
    null,
    msg,
    jsonb_build_object(
      'state_status', new.status,
      'latest_number', new.latest_number,
      'reconciliation_total', coalesce(new.reconciliation_total,0),
      'reconciliation_resolved', coalesce(new.reconciliation_resolved,0),
      'reconciliation_found', coalesce(new.reconciliation_found,0),
      'reconciliation_missing', coalesce(new.reconciliation_missing,0),
      'reconciliation_complete', coalesce(new.reconciliation_complete,false),
      'next_scheduled_at', new.next_scheduled_at
    )
  );

  return new;
end
$$;

drop trigger if exists trg_sales_state_history on public.fiscal_sales_sync_state;
create trigger trg_sales_state_history
after insert or update on public.fiscal_sales_sync_state
for each row execute function private.log_sales_state_history();

create or replace function private.log_sales_reconciliation_history()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor uuid;
  should_log boolean := false;
begin
  if new.last_checked_at is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    should_log := new.cstat is not null or new.xmotivo is not null or new.status <> 'pending';
  else
    should_log :=
      new.last_checked_at is distinct from old.last_checked_at
      and (
        new.cstat is distinct from old.cstat
        or new.xmotivo is distinct from old.xmotivo
        or new.status is distinct from old.status
        or new.status in ('found','cancelled','not_found','error')
      );
  end if;

  if not should_log then
    return new;
  end if;

  select created_by into actor
  from public.fiscal_companies
  where id = new.company_id;

  if actor is null then
    return new;
  end if;

  insert into public.fiscal_sync_logs(
    company_id,sync_type,periodo_inicio,periodo_fim,
    documentos_encontrados,documentos_processados,documentos_erro,
    status,mensagem_erro,tempo_duracao,created_at,completed_at,created_by,
    source,response_code,response_message,details
  )
  values(
    new.company_id,
    'vendas',
    coalesce(new.issue_date::date,new.last_checked_at::date),
    coalesce(new.issue_date::date,new.last_checked_at::date),
    case when new.status in ('found','cancelled') then 1 else 0 end,
    1,
    case when new.status='error' then 1 else 0 end,
    case
      when new.status='error' then 'erro'
      when new.status in ('found','cancelled','not_found') then 'concluido'
      else 'consultado'
    end,
    case when new.status='error' then new.xmotivo else null end,
    0,
    new.last_checked_at,
    coalesce(new.resolved_at,new.last_checked_at),
    actor,
    'SVRS / consulta de situação',
    new.cstat,
    new.xmotivo,
    jsonb_build_object(
      'note_number', new.note_number,
      'model', new.model,
      'series', new.series,
      'result_status', new.status,
      'attempts', coalesce(new.attempts,0),
      'month_code', new.month_code
    )
  );

  return new;
end
$$;

drop trigger if exists trg_sales_reconciliation_history on public.fiscal_sales_reconciliation;
create trigger trg_sales_reconciliation_history
after insert or update on public.fiscal_sales_reconciliation
for each row execute function private.log_sales_reconciliation_history();

-- Seed the history with the latest known state so the screen is useful immediately.
insert into public.fiscal_sync_logs(
  company_id,sync_type,periodo_inicio,periodo_fim,
  documentos_encontrados,documentos_processados,documentos_erro,
  status,mensagem_erro,tempo_duracao,created_at,completed_at,created_by,
  source,response_code,response_message,details
)
select
  s.company_id,
  'compras',
  coalesce(s.last_started_at,s.updated_at,now())::date,
  coalesce(s.last_completed_at,s.last_failed_at,s.updated_at,now())::date,
  case when s.last_status_code='138' then 1 else 0 end,
  case when s.last_completed_at is not null then 1 else 0 end,
  case when s.last_error is not null then 1 else 0 end,
  case
    when s.last_error is not null or s.status in ('error','failed') then 'erro'
    when s.status in ('cooldown','waiting_certificate') then 'aguardando'
    else 'concluido'
  end,
  s.last_error,
  greatest(0,floor(extract(epoch from (coalesce(s.last_completed_at,s.last_failed_at,s.updated_at,now()) - coalesce(s.last_started_at,s.updated_at,now()))))::integer),
  coalesce(s.last_started_at,s.updated_at,now()),
  coalesce(s.last_completed_at,s.last_failed_at,s.updated_at,now()),
  fc.created_by,
  'Ambiente Nacional / SEFAZ',
  s.last_status_code,
  s.last_status_message,
  jsonb_build_object('state_status',s.status,'backfill',true)
from public.fiscal_purchase_sync_state s
join public.fiscal_companies fc on fc.id=s.company_id
where not exists (
  select 1 from public.fiscal_sync_logs l
  where l.company_id=s.company_id and l.sync_type='compras'
);

insert into public.fiscal_sync_logs(
  company_id,sync_type,periodo_inicio,periodo_fim,
  documentos_encontrados,documentos_processados,documentos_erro,
  status,mensagem_erro,tempo_duracao,created_at,completed_at,created_by,
  source,response_code,response_message,details
)
select
  s.company_id,
  'vendas',
  coalesce(s.last_started_at,s.updated_at,now())::date,
  coalesce(s.last_completed_at,s.updated_at,now())::date,
  coalesce(s.found_documents,0),
  coalesce(s.scanned_numbers,0),
  case when s.last_error is not null or s.status='error' then 1 else 0 end,
  case
    when s.status='error' then 'erro'
    when s.status in ('waiting_state_credentials','waiting_certificate') then 'aguardando'
    when s.status='idle' then 'concluido'
    else coalesce(s.status,'iniciado')
  end,
  s.last_error,
  greatest(0,floor(extract(epoch from (coalesce(s.last_completed_at,s.updated_at,now()) - coalesce(s.last_started_at,s.updated_at,now()))))::integer),
  coalesce(s.last_started_at,s.updated_at,now()),
  s.last_completed_at,
  fc.created_by,
  'Sincronização de vendas',
  null,
  case s.status
    when 'waiting_state_credentials' then 'Aguardando credencial estadual para iniciar a leitura das vendas emitidas.'
    when 'waiting_certificate' then 'Aguardando certificado A1 válido.'
    when 'idle' then 'Rotina de vendas concluída.'
    else coalesce(s.last_error,replace(coalesce(s.status,''),'_',' '))
  end,
  jsonb_build_object('state_status',s.status,'backfill',true)
from public.fiscal_sales_sync_state s
join public.fiscal_companies fc on fc.id=s.company_id
where not exists (
  select 1 from public.fiscal_sync_logs l
  where l.company_id=s.company_id and l.sync_type='vendas' and l.source='Sincronização de vendas'
);

with ranked as (
  select
    r.*,
    fc.created_by,
    row_number() over (partition by r.company_id order by r.last_checked_at desc nulls last) as rn
  from public.fiscal_sales_reconciliation r
  join public.fiscal_companies fc on fc.id=r.company_id
  where r.last_checked_at is not null
)
insert into public.fiscal_sync_logs(
  company_id,sync_type,periodo_inicio,periodo_fim,
  documentos_encontrados,documentos_processados,documentos_erro,
  status,mensagem_erro,tempo_duracao,created_at,completed_at,created_by,
  source,response_code,response_message,details
)
select
  company_id,
  'vendas',
  coalesce(issue_date::date,last_checked_at::date),
  coalesce(issue_date::date,last_checked_at::date),
  case when status in ('found','cancelled') then 1 else 0 end,
  1,
  case when status='error' then 1 else 0 end,
  case when status='error' then 'erro' else 'consultado' end,
  case when status='error' then xmotivo else null end,
  0,
  last_checked_at,
  coalesce(resolved_at,last_checked_at),
  created_by,
  'SVRS / consulta de situação',
  cstat,
  xmotivo,
  jsonb_build_object('note_number',note_number,'model',model,'series',series,'result_status',status,'attempts',attempts,'backfill',true)
from ranked
where rn <= 12
  and not exists (
    select 1 from public.fiscal_sync_logs l
    where l.company_id=ranked.company_id
      and l.source='SVRS / consulta de situação'
      and l.created_at=ranked.last_checked_at
      and coalesce(l.details->>'note_number','')=ranked.note_number::text
  );

-- Keep operational history bounded.
delete from public.fiscal_sync_logs where created_at < now() - interval '120 days';
