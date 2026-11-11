-- Site switches the family flips from the admin. Safe to run more than once.
--
-- meet_lucy_open: false shows "Coming soon" and a small game at / instead of the
-- Meet Lucy page. Signed in admins always see the real page.

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
drop policy if exists "admins manage" on public.site_settings;
create policy "admins manage" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.site_settings (key, value) values ('meet_lucy_open', 'false'::jsonb)
on conflict (key) do nothing;

-- What visitors are allowed to know about the switches.
create or replace function public.get_site_status()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'meet_lucy_open', coalesce((select s.value = 'true'::jsonb from public.site_settings s where s.key = 'meet_lucy_open'), false)
  );
$$;

revoke all on function public.get_site_status() from public;
grant execute on function public.get_site_status() to anon, authenticated;

notify pgrst, 'reload schema';
