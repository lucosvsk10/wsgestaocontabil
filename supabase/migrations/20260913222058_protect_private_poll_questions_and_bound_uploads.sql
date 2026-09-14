-- Questions in private polls follow the parent poll's visibility (RLS).
drop policy if exists "Anyone can view form questions" on public.form_questions;
create policy "Visible poll questions" on public.form_questions for select to anon,authenticated
using (exists(select 1 from public.polls p where p.id=form_questions.poll_id));
drop policy if exists "Anyone can view numerical questions" on public.numerical_questions;
create policy "Visible numerical poll questions" on public.numerical_questions for select to anon,authenticated
using (exists(select 1 from public.polls p where p.id=numerical_questions.poll_id));

-- Bound new uploads without modifying existing objects.
update storage.buckets set file_size_limit=52428800 where id in ('accounting-documents','comprovantes','lancamentos') and file_size_limit is null;
update storage.buckets set file_size_limit=5242880,allowed_mime_types=array['image/png','image/jpeg','image/webp','image/gif','image/avif']
where id='carousel-logos';

create or replace function private.limit_simulation_insert() returns trigger
language plpgsql security definer set search_path='' as $$
declare lim record;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 select * into lim from public.consume_rate_limit('save_simulation',auth.uid()::text,30,60);
 if not lim.allowed then raise exception 'Muitas simulações salvas. Aguarde um minuto.' using errcode='P0001'; end if;
 return new;
end; $$;
revoke all on function private.limit_simulation_insert() from public,anon,authenticated;
create trigger limit_simulation_insert before insert on public.tax_simulations for each row execute function private.limit_simulation_insert();
create trigger limit_simulation_insert before insert on public.inss_simulations for each row execute function private.limit_simulation_insert();
create trigger limit_simulation_insert before insert on public.prolabore_simulations for each row execute function private.limit_simulation_insert();

