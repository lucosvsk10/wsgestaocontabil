-- Central, atomic abuse controls. Only service_role can consume buckets;
-- the table stores a one-way key hash, never an email, IP, password or token.
create table if not exists public.rate_limit_buckets (
  key_hash text primary key,
  scope text not null,
  window_started_at timestamptz not null,
  hit_count integer not null default 0,
  last_seen_at timestamptz not null default now(),
  constraint rate_limit_buckets_scope_check check (scope ~ '^[a-z0-9_:-]{1,80}$'),
  constraint rate_limit_buckets_count_check check (hit_count >= 0)
);

alter table public.rate_limit_buckets enable row level security;
revoke all on public.rate_limit_buckets from public, anon, authenticated;
grant select, insert, update, delete on public.rate_limit_buckets to service_role;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_hash text;
  v_now timestamptz := clock_timestamp();
  v_started timestamptz;
  v_count integer;
  v_window integer := least(greatest(coalesce(p_window_seconds, 60), 1), 86400);
  v_limit integer := least(greatest(coalesce(p_limit, 1), 1), 10000);
  v_retry integer;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'service role only';
  end if;
  if coalesce(length(p_scope), 0) = 0 or p_scope !~ '^[a-z0-9_:-]{1,80}$' then
    raise exception 'invalid rate limit scope';
  end if;
  if coalesce(length(p_key), 0) = 0 or length(p_key) > 512 then
    raise exception 'invalid rate limit key';
  end if;

  v_hash := md5(p_scope || ':' || p_key);
  select window_started_at, hit_count
    into v_started, v_count
    from public.rate_limit_buckets
   where key_hash = v_hash
   for update;

  if not found or v_now >= v_started + make_interval(secs => v_window) then
    insert into public.rate_limit_buckets(key_hash, scope, window_started_at, hit_count, last_seen_at)
    values (v_hash, p_scope, v_now, 1, v_now)
    on conflict (key_hash) do update
      set scope = excluded.scope,
          window_started_at = excluded.window_started_at,
          hit_count = 1,
          last_seen_at = excluded.last_seen_at;
    allowed := true;
    remaining := v_limit - 1;
    retry_after_seconds := 0;
  elsif v_count < v_limit then
    update public.rate_limit_buckets
       set hit_count = hit_count + 1, last_seen_at = v_now
     where key_hash = v_hash;
    allowed := true;
    remaining := v_limit - v_count - 1;
    retry_after_seconds := 0;
  else
    v_retry := greatest(1, ceil(extract(epoch from ((v_started + make_interval(secs => v_window)) - v_now)))::integer);
    update public.rate_limit_buckets set last_seen_at = v_now where key_hash = v_hash;
    allowed := false;
    remaining := 0;
    retry_after_seconds := v_retry;
  end if;

  -- Keep abandoned keys bounded without a separate privileged cleanup endpoint.
  if random() < 0.01 then
    delete from public.rate_limit_buckets where last_seen_at < v_now - interval '2 days';
  end if;
  return next;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
