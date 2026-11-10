-- Lucy's Bat Mitzvah: initial schema.
-- Safe to run more than once. Paste into the Supabase SQL editor or run with the Supabase CLI.
--
-- Security model:
--   * Every table has RLS on. Visitors (anon) cannot read or write any table directly,
--     except published rows of lucy_posts.
--   * Visitors act only through the security definer functions at the bottom.
--   * Admins are Supabase Auth users whose email is listed in public.admins.

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  email text primary key,
  added_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.new_invite_token()
returns text
language sql volatile set search_path = ''
as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Guest list
-- ---------------------------------------------------------------------------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- envelope name, e.g. "The Cohen Family"
  greeting text,                      -- how the site says hi, e.g. "Aunt Ruth and Uncle Dan"
  email text,
  phone text,
  address1 text,
  address2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'United States',
  address_updated_at timestamptz,
  group_tag text,                     -- free label, e.g. "Family", "School friends"
  notes text,
  personal_message text,              -- shown on the household's invite page (RSVP phase)
  invite_token text not null unique default public.new_invite_token(),
  address_request_sent_at timestamptz,
  save_the_date_sent_at timestamptz,
  invitation_sent_at timestamptz,
  rsvp_message text,
  rsvp_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists households_touch on public.households;
create trigger households_touch before update on public.households
  for each row execute function public.touch_updated_at();

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  first_name text not null,
  last_name text,
  kind text not null default 'adult' check (kind in ('adult', 'kid')),
  email text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists guests_household_idx on public.guests(household_id);

-- ---------------------------------------------------------------------------
-- Events and RSVPs (RSVP pages are built in a later phase; tables are ready)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  event_date date,
  time_text text,
  location text,
  details text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.household_events (
  household_id uuid not null references public.households(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  primary key (household_id, event_id)
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null check (status in ('yes', 'no', 'maybe')),
  note text,
  updated_at timestamptz not null default now(),
  unique (guest_id, event_id)
);

insert into public.events (slug, name, event_date, sort) values
  ('friday-dinner', 'Friday Night Dinner', date '2027-03-19', 1),
  ('service-lunch', 'Service and Lunch',   date '2027-03-20', 2),
  ('party',         'Party',               date '2027-03-20', 3)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Things visitors send us
-- ---------------------------------------------------------------------------
create table if not exists public.address_submissions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete set null,
  name text not null,
  email text,
  phone text,
  address1 text not null,
  address2 text,
  city text not null,
  state text,
  postal_code text,
  country text,
  note text,
  status text not null default 'new' check (status in ('new', 'merged', 'ignored')),
  created_at timestamptz not null default now()
);
create index if not exists address_submissions_created_idx on public.address_submissions(created_at desc);

create table if not exists public.bottle_messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete set null,
  from_name text not null,
  message text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Lucy's corner
-- ---------------------------------------------------------------------------
create table if not exists public.lucy_posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'drawing' check (kind in ('drawing', 'story', 'idea')),
  title text not null,
  body text,
  image_path text,                    -- path inside the lucy-art storage bucket
  published boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists lucy_posts_touch on public.lucy_posts;
create trigger lucy_posts_touch before update on public.lucy_posts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Email log (written by the admin after the Postmark function succeeds)
-- ---------------------------------------------------------------------------
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete set null,
  kind text not null,
  to_email text not null,
  subject text,
  postmark_id text,
  error text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'admins', 'households', 'guests', 'events', 'household_events', 'rsvps',
    'address_submissions', 'bottle_messages', 'lucy_posts', 'email_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admins manage" on public.%I', t);
    execute format(
      'create policy "admins manage" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

drop policy if exists "anyone reads published posts" on public.lucy_posts;
create policy "anyone reads published posts" on public.lucy_posts
  for select to anon, authenticated using (published);
grant select on public.lucy_posts to anon;

-- ---------------------------------------------------------------------------
-- Storage for Lucy's drawings: public read, admin write
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('lucy-art', 'lucy-art', true)
on conflict (id) do nothing;

drop policy if exists "lucy-art admin insert" on storage.objects;
create policy "lucy-art admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'lucy-art' and public.is_admin());

drop policy if exists "lucy-art admin update" on storage.objects;
create policy "lucy-art admin update" on storage.objects
  for update to authenticated using (bucket_id = 'lucy-art' and public.is_admin());

drop policy if exists "lucy-art admin delete" on storage.objects;
create policy "lucy-art admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'lucy-art' and public.is_admin());

drop policy if exists "lucy-art admin list" on storage.objects;
create policy "lucy-art admin list" on storage.objects
  for select to authenticated using (bucket_id = 'lucy-art' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Public functions (the only things a visitor can do)
-- ---------------------------------------------------------------------------

-- Who is this link for? Returns null for an unknown token. Never returns the address itself.
create or replace function public.get_invite(p_token text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'greeting', coalesce(nullif(btrim(h.greeting), ''), h.name),
    'has_address', coalesce(btrim(h.address1), '') <> ''
  )
  from public.households h
  where h.invite_token = p_token;
$$;

-- Address form. With a valid personal token the household is updated directly;
-- without one the submission waits in the admin inbox.
create or replace function public.submit_address(
  p_name text,
  p_address1 text,
  p_city text,
  p_state text default null,
  p_postal_code text default null,
  p_country text default null,
  p_address2 text default null,
  p_email text default null,
  p_phone text default null,
  p_note text default null,
  p_token text default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_household uuid;
  v_recent int;
begin
  if coalesce(btrim(p_name), '') = '' or coalesce(btrim(p_address1), '') = '' or coalesce(btrim(p_city), '') = '' then
    raise exception 'missing_fields';
  end if;
  if length(p_name) > 200 or length(p_address1) > 200 or length(coalesce(p_address2, '')) > 200
     or length(p_city) > 120 or length(coalesce(p_state, '')) > 80 or length(coalesce(p_postal_code, '')) > 30
     or length(coalesce(p_country, '')) > 80 or length(coalesce(p_email, '')) > 200
     or length(coalesce(p_phone, '')) > 40 or length(coalesce(p_note, '')) > 2000 then
    raise exception 'too_long';
  end if;

  select count(*) into v_recent from public.address_submissions
  where created_at > now() - interval '10 minutes';
  if v_recent >= 60 then
    raise exception 'too_busy';
  end if;

  if coalesce(p_token, '') <> '' then
    select h.id into v_household from public.households h where h.invite_token = p_token;
  end if;

  insert into public.address_submissions
    (household_id, name, email, phone, address1, address2, city, state, postal_code, country, note, status)
  values
    (v_household, btrim(p_name), nullif(btrim(p_email), ''), nullif(btrim(p_phone), ''), btrim(p_address1),
     nullif(btrim(p_address2), ''), btrim(p_city), nullif(btrim(p_state), ''), nullif(btrim(p_postal_code), ''),
     nullif(btrim(p_country), ''), nullif(btrim(p_note), ''),
     case when v_household is null then 'new' else 'merged' end);

  if v_household is not null then
    update public.households h set
      address1 = btrim(p_address1),
      address2 = nullif(btrim(p_address2), ''),
      city = btrim(p_city),
      state = nullif(btrim(p_state), ''),
      postal_code = nullif(btrim(p_postal_code), ''),
      country = coalesce(nullif(btrim(p_country), ''), h.country),
      email = coalesce(nullif(btrim(p_email), ''), h.email),
      phone = coalesce(nullif(btrim(p_phone), ''), h.phone),
      address_updated_at = now()
    where h.id = v_household;
  end if;

  return jsonb_build_object('ok', true, 'matched', v_household is not null);
end;
$$;

-- Message in a bottle. Hidden from the site until an admin approves it.
create or replace function public.send_bottle(
  p_name text,
  p_message text,
  p_token text default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_household uuid;
  v_recent int;
begin
  if coalesce(btrim(p_name), '') = '' or coalesce(btrim(p_message), '') = '' then
    raise exception 'missing_fields';
  end if;
  if length(p_name) > 120 or length(p_message) > 1000 then
    raise exception 'too_long';
  end if;

  select count(*) into v_recent from public.bottle_messages
  where created_at > now() - interval '10 minutes';
  if v_recent >= 60 then
    raise exception 'too_busy';
  end if;

  if coalesce(p_token, '') <> '' then
    select h.id into v_household from public.households h where h.invite_token = p_token;
  end if;

  insert into public.bottle_messages (household_id, from_name, message)
  values (v_household, btrim(p_name), btrim(p_message));

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_public_bottles()
returns table (id uuid, from_name text, message text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select b.id, b.from_name, b.message, b.created_at
  from public.bottle_messages b
  where b.approved
  order by b.created_at desc
  limit 60;
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.get_invite(text) from public;
revoke all on function public.submit_address(text, text, text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.send_bottle(text, text, text) from public;
revoke all on function public.get_public_bottles() from public;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.get_invite(text) to anon, authenticated;
grant execute on function public.submit_address(text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.send_bottle(text, text, text) to anon, authenticated;
grant execute on function public.get_public_bottles() to anon, authenticated;

notify pgrst, 'reload schema';
