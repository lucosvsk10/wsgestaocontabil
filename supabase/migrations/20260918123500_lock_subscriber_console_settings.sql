drop policy if exists admin_subscriber_console_settings_no_client_access
on public.admin_subscriber_console_settings;

create policy admin_subscriber_console_settings_no_client_access
on public.admin_subscriber_console_settings
for all
to authenticated
using (false)
with check (false);
