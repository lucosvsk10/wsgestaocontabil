-- The client cannot attest its own password change or edit security bookkeeping.
create or replace function private.protect_user_password_flags() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if current_user in ('anon','authenticated') and
 (new.must_change_password is distinct from old.must_change_password or new.password_changed_at is distinct from old.password_changed_at) then
  raise exception 'Campos de segurança são gerenciados pelo servidor.' using errcode='42501';
 end if;
 return new;
end; $$;
revoke all on function private.protect_user_password_flags() from public,anon,authenticated;
create trigger protect_user_password_flags before update on public.users for each row execute function private.protect_user_password_flags();

create or replace function private.record_verified_password_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.encrypted_password is distinct from old.encrypted_password and nullif(new.encrypted_password,'') is not null then
  update public.users set must_change_password=false,password_changed_at=now() where id=new.id and role='client';
 end if;
 return new;
end; $$;
revoke all on function private.record_verified_password_change() from public,anon,authenticated;
create trigger record_verified_password_change after update of encrypted_password on auth.users for each row execute function private.record_verified_password_change();

create or replace function public.mark_client_password_changed() returns void
language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.users where id=auth.uid() and role='client' and not must_change_password and password_changed_at is not null) then
  raise exception 'Atualize sua senha antes de confirmar a alteração.' using errcode='42501';
 end if;
end; $$;
revoke all on function public.mark_client_password_changed() from public,anon;
grant execute on function public.mark_client_password_changed() to authenticated;

