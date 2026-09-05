-- RLS does not protect TRUNCATE, TRIGGER or REFERENCES. Browser roles never
-- need these privileges and must not inherit them from broad table grants.
revoke truncate, trigger, references on all tables in schema public
  from anon, authenticated;

revoke create on schema public from public, anon, authenticated;

-- Future tables/functions start closed and are opened explicitly by migrations.
alter default privileges in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;
