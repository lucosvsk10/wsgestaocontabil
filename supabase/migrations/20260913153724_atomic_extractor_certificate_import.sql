-- Only the certificate-validation service may persist a verified import.
-- Company, encrypted certificate and account link commit together or all roll back.
create or replace function public.extractor_save_verified_certificate(
  p_account_id uuid, p_actor_id uuid, p_company jsonb, p_certificate jsonb
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_company public.fiscal_companies%rowtype;
  v_cnpj text := p_company->>'cnpj';
begin
  if not private.can_manage_extractor(p_account_id,p_actor_id) then
    raise exception 'extractor_access_denied' using errcode='42501';
  end if;
  if v_cnpj !~ '^[0-9]{14}$' or p_certificate->>'holder_cnpj' is distinct from v_cnpj
    or (p_certificate->>'valid_until')::date < current_date
    or nullif(p_certificate->>'certificate_ciphertext','') is null
    or nullif(p_certificate->>'password_ciphertext','') is null then
    raise exception 'invalid_certificate' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('extractor_certificate:'||v_cnpj,0));
  select * into v_company from public.fiscal_companies where cnpj=v_cnpj for update;
  if v_company.id is not null then
    -- Reading a CNPJ out of a PFX is not proof of ICP-Brasil trust. Never use it
    -- alone to grant access to a different tenant's existing fiscal history.
    if v_company.created_by is distinct from p_actor_id
      and not exists(select 1 from public.extractor_companies where account_id=p_account_id and fiscal_company_id=v_company.id)
      and not exists(select 1 from public.user_roles where user_id=p_actor_id and role='admin') then
      raise exception 'company_link_requires_admin' using errcode='42501';
    end if;
    -- Renewal must not overwrite manually maintained data, environment or ownership.
  else
    insert into public.fiscal_companies(cnpj,razao_social,nome_fantasia,inscricao_estadual,endereco,uf,codigo_municipio,municipio,regime_tributario,ambiente_padrao,status,created_by,fiscal_settings)
    values(v_cnpj,p_company->>'razao_social',p_company->>'nome_fantasia',p_company->>'inscricao_estadual',p_company->'endereco',p_company->>'uf',p_company->>'codigo_municipio',p_company->>'municipio',p_company->>'regime_tributario','producao','ativa',p_actor_id,coalesce(p_company->'fiscal_settings','{}'::jsonb))
    returning * into v_company;
  end if;
  update public.fiscal_certificates set is_active=false,updated_at=now() where company_id=v_company.id and is_active;
  insert into public.fiscal_certificates(company_id,certificate_name,certificate_ciphertext,certificate_iv,password_ciphertext,password_iv,holder_cnpj,holder_name,valid_from,valid_until,serial_number,is_active,inspected_at,created_by)
  values(v_company.id,p_certificate->>'certificate_name',p_certificate->>'certificate_ciphertext',p_certificate->>'certificate_iv',p_certificate->>'password_ciphertext',p_certificate->>'password_iv',v_cnpj,p_certificate->>'holder_name',(p_certificate->>'valid_from')::date,(p_certificate->>'valid_until')::date,p_certificate->>'serial_number',true,now(),p_actor_id);
  insert into public.extractor_companies(account_id,fiscal_company_id,status,automatic_sync)
  values(p_account_id,v_company.id,'active',true)
  on conflict(account_id,fiscal_company_id) do update set status='active',automatic_sync=true,updated_at=now();
  -- Existing cursor/backoff is preserved on renewal.
  insert into public.fiscal_purchase_sync_state(company_id,paused,status,next_scheduled_at)
  values(v_company.id,false,'queued',now()) on conflict(company_id) do nothing;
  insert into public.fiscal_sales_sync_state(company_id,paused,status,backfill_days,initial_backfill_done,reconciliation_complete,history_start_month,next_scheduled_at)
  values(v_company.id,false,'queued',30,false,false,to_char(current_date-interval '30 days','YYMM'),now()) on conflict(company_id) do nothing;
  return v_company.id;
end;
$$;
revoke all on function public.extractor_save_verified_certificate(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.extractor_save_verified_certificate(uuid,uuid,jsonb,jsonb) to service_role;

