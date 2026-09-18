alter table public.extractor_companies
  add column if not exists profile_overrides jsonb not null default '{}'::jsonb;

comment on column public.extractor_companies.profile_overrides is
  'Tenant-scoped display/profile overrides for the Extractor SaaS. Never use for fiscal ownership or CNPJ identity.';

create or replace function public.extractor_save_verified_certificate(
  p_account_id uuid,
  p_actor_id uuid,
  p_company jsonb,
  p_certificate jsonb
)
returns uuid
language plpgsql
set search_path to ''
as $function$
declare
  v_company public.fiscal_companies%rowtype;
  v_cnpj text := p_company->>'cnpj';
  v_org_id uuid;
  v_existing_certificate_id uuid;
  v_cross_account boolean := false;
  v_serial text := nullif(p_certificate->>'serial_number','');
begin
  if not private.can_manage_extractor(p_account_id,p_actor_id) then
    raise exception 'extractor_access_denied' using errcode='42501';
  end if;

  select organization_id into v_org_id
  from public.extractor_accounts
  where id=p_account_id
  for share;

  if v_org_id is null then
    raise exception 'extractor_account_not_found' using errcode='22023';
  end if;

  if v_cnpj !~ '^[0-9]{14}$'
    or p_certificate->>'holder_cnpj' is distinct from v_cnpj
    or (p_certificate->>'valid_until')::date < current_date
    or nullif(p_certificate->>'certificate_ciphertext','') is null
    or nullif(p_certificate->>'password_ciphertext','') is null then
    raise exception 'invalid_certificate' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('extractor_certificate:'||v_cnpj,0));

  select * into v_company
  from public.fiscal_companies
  where cnpj=v_cnpj
  for update;

  if v_company.id is null then
    insert into public.fiscal_companies(
      cnpj,razao_social,nome_fantasia,inscricao_estadual,endereco,uf,codigo_municipio,
      municipio,regime_tributario,ambiente_padrao,status,created_by,fiscal_settings
    )
    values(
      v_cnpj,p_company->>'razao_social',p_company->>'nome_fantasia',
      p_company->>'inscricao_estadual',p_company->'endereco',p_company->>'uf',
      p_company->>'codigo_municipio',p_company->>'municipio',
      p_company->>'regime_tributario','producao','ativa',p_actor_id,
      coalesce(p_company->'fiscal_settings','{}'::jsonb)
    )
    returning * into v_company;
  else
    select exists(
      select 1
      from public.extractor_companies ec
      where ec.fiscal_company_id=v_company.id
        and ec.account_id<>p_account_id
        and ec.status<>'removed'
    ) into v_cross_account;
  end if;

  -- This RPC is service-role only. The Edge Function verifies the authenticated
  -- owner/admin, active entitlement, PFX password, holder CNPJ and validity
  -- before calling it. A verified certificate may therefore link the same
  -- legal CNPJ to another entitled Extractor account without exposing another
  -- tenant's account metadata; document access remains date/account scoped.
  if v_serial is not null then
    select id into v_existing_certificate_id
    from public.fiscal_certificates
    where company_id=v_company.id
      and serial_number=v_serial
      and holder_cnpj=v_cnpj
      and valid_until>=current_date
    order by is_active desc, valid_until desc
    limit 1
    for update;
  end if;

  if v_existing_certificate_id is not null then
    update public.fiscal_certificates
    set certificate_name=coalesce(nullif(p_certificate->>'certificate_name',''),certificate_name),
        certificate_ciphertext=p_certificate->>'certificate_ciphertext',
        certificate_iv=p_certificate->>'certificate_iv',
        password_ciphertext=p_certificate->>'password_ciphertext',
        password_iv=p_certificate->>'password_iv',
        holder_name=coalesce(nullif(p_certificate->>'holder_name',''),holder_name),
        valid_from=(p_certificate->>'valid_from')::date,
        valid_until=(p_certificate->>'valid_until')::date,
        is_active=true,
        inspected_at=now(),
        updated_at=now()
    where id=v_existing_certificate_id;
  else
    update public.fiscal_certificates
    set is_active=false,updated_at=now()
    where company_id=v_company.id and is_active;

    insert into public.fiscal_certificates(
      company_id,certificate_name,certificate_ciphertext,certificate_iv,
      password_ciphertext,password_iv,holder_cnpj,holder_name,valid_from,valid_until,
      serial_number,is_active,inspected_at,created_by
    )
    values(
      v_company.id,p_certificate->>'certificate_name',
      p_certificate->>'certificate_ciphertext',p_certificate->>'certificate_iv',
      p_certificate->>'password_ciphertext',p_certificate->>'password_iv',
      v_cnpj,p_certificate->>'holder_name',
      (p_certificate->>'valid_from')::date,(p_certificate->>'valid_until')::date,
      v_serial,true,now(),p_actor_id
    );
  end if;

  insert into public.extractor_companies(account_id,fiscal_company_id,status,automatic_sync)
  values(p_account_id,v_company.id,'active',true)
  on conflict(account_id,fiscal_company_id)
  do update set status='active',automatic_sync=true,updated_at=now();

  insert into public.fiscal_purchase_sync_state(company_id,paused,status,next_scheduled_at)
  values(v_company.id,false,'queued',now())
  on conflict(company_id) do nothing;

  insert into public.fiscal_sales_sync_state(
    company_id,paused,status,backfill_days,initial_backfill_done,
    reconciliation_complete,history_start_month,next_scheduled_at
  )
  values(
    v_company.id,false,'queued',30,false,false,
    to_char(current_date-interval '30 days','YYMM'),now()
  )
  on conflict(company_id) do nothing;

  insert into public.saas_audit_logs(
    organization_id,actor_user_id,action,resource_type,resource_id,is_sensitive,metadata
  )
  values(
    v_org_id,p_actor_id,
    case when v_cross_account then 'extractor_company_linked_verified_certificate'
         else 'extractor_certificate_saved' end,
    'fiscal_company',v_company.id::text,true,
    jsonb_build_object(
      'cnpj_suffix',right(v_cnpj,4),
      'cross_account_existing_company',v_cross_account,
      'serial_present',v_serial is not null
    )
  );

  return v_company.id;
end;
$function$;

revoke all on function public.extractor_save_verified_certificate(uuid,uuid,jsonb,jsonb) from public;
revoke all on function public.extractor_save_verified_certificate(uuid,uuid,jsonb,jsonb) from anon;
revoke all on function public.extractor_save_verified_certificate(uuid,uuid,jsonb,jsonb) from authenticated;
grant execute on function public.extractor_save_verified_certificate(uuid,uuid,jsonb,jsonb) to service_role;
