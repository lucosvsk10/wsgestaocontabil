-- Public participation does not authorize publication of personal responses.
drop policy if exists "Everyone can view responses for public polls" on public.poll_responses;

create or replace function private.guard_public_response() returns trigger
language plpgsql security definer set search_path='' as $$
declare p public.polls%rowtype; lim record; row_data jsonb := to_jsonb(new);
begin
  select * into p from public.polls where id=new.poll_id;
  if p.id is null or (p.expires_at is not null and p.expires_at<=now())
    or (not coalesce(p.is_public,false) and p.created_by is distinct from auth.uid() and not private.is_any_admin(auth.uid())) then
    raise exception 'Enquete indisponível ou encerrada.' using errcode='42501';
  end if;
  if new.user_id is not null and new.user_id is distinct from auth.uid() then
    raise exception 'Usuário inválido.' using errcode='42501';
  end if;
  if length(coalesce(new.user_name,''))>200 or octet_length(row_data::text)>16000 then
    raise exception 'Resposta muito longa.' using errcode='22023';
  end if;
  if tg_table_name='poll_responses' then
    if not exists(select 1 from public.poll_options where id=(row_data->>'option_id')::uuid and poll_id=p.id) then
      raise exception 'Opção inválida.' using errcode='22023';
    end if;
    if not coalesce(p.allow_comments,false) and nullif(row_data->>'comment','') is not null then
      raise exception 'Comentários não permitidos.' using errcode='22023';
    end if;
  elsif tg_table_name='form_responses' then
    if not exists(select 1 from public.form_questions where id=(row_data->>'question_id')::uuid and poll_id=p.id) then
      raise exception 'Pergunta inválida.' using errcode='22023';
    end if;
  elsif tg_table_name='numerical_responses' then
    if not exists(select 1 from public.numerical_questions where id=(row_data->>'question_id')::uuid and poll_id=p.id
      and (min_value is null or (row_data->>'value')::integer>=min_value)
      and (max_value is null or (row_data->>'value')::integer<=max_value)) then
      raise exception 'Resposta fora do intervalo da pergunta.' using errcode='22023';
    end if;
  end if;
  -- A global cap also protects anonymous writes without trusting a client-provided IP.
  select * into lim from public.consume_rate_limit('public_response_global',p.id::text,600,60);
  if not lim.allowed then raise exception 'Muitas respostas. Aguarde um minuto.' using errcode='P0001'; end if;
  select * into lim from public.consume_rate_limit('public_response_actor',p.id::text||'|'||coalesce(auth.uid()::text,'anonymous'),120,60);
  if not lim.allowed then raise exception 'Muitas respostas. Aguarde um minuto.' using errcode='P0001'; end if;
  return new;
end;
$$;
revoke all on function private.guard_public_response() from public,anon,authenticated;
create trigger guard_public_response before insert on public.poll_responses for each row execute function private.guard_public_response();
create trigger guard_public_response before insert on public.form_responses for each row execute function private.guard_public_response();
create trigger guard_public_response before insert on public.numerical_responses for each row execute function private.guard_public_response();

create or replace function private.guard_extractor_history() returns trigger
language plpgsql security definer set search_path='' as $$
declare lim record;
begin
  if new.requested_by is distinct from auth.uid() or not private.is_extractor_member(new.account_id,auth.uid()) then
    raise exception 'Sem acesso à conta.' using errcode='42501';
  end if;
  if new.requested_from is null or new.requested_to is null or new.requested_from>new.requested_to
    or new.requested_from>current_date or new.requested_to>date_trunc('month',current_date)+interval '1 month - 1 day'
    or new.requested_to-new.requested_from>3660 or octet_length(coalesce(new.metadata,'{}'::jsonb)::text)>32768
    or new.status is distinct from 'requested' then
    raise exception 'Período ou solicitação inválida.' using errcode='22023';
  end if;
  -- Price and processing fields are assigned by staff, never by the requesting browser.
  new.quoted_amount := null;
  new.estimated_xml := null;
  select * into lim from public.consume_rate_limit('extractor_history',auth.uid()::text||'|'||new.account_id::text,3,600);
  if not lim.allowed then raise exception 'Aguarde antes de solicitar outro histórico.' using errcode='P0001'; end if;
  return new;
end;
$$;
revoke all on function private.guard_extractor_history() from public,anon,authenticated;
create trigger guard_extractor_history before insert on public.extractor_history_requests for each row execute function private.guard_extractor_history();

