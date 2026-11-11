-- Contact info check: "Contact info up to date?"
-- Safe to run more than once.
--
-- Change to the security model: the holder of a household's personal link can now see
-- everything we keep for that household's contact card (envelope name, address, phone,
-- email, the main contact's name and birthday, and the names and relationships of the
-- rest of the family) so they can confirm it or correct it. Notes, group, other
-- households, and anything else are never returned.
--
-- households.address_confirmed_at now means the whole contact card was confirmed.

-- People: one main contact per household, a birthday (month and day only), and how
-- each other person is related to the main contact.
alter table public.guests add column if not exists is_primary boolean not null default false;
alter table public.guests add column if not exists relationship text;
alter table public.guests add column if not exists birthday_month smallint;
alter table public.guests add column if not exists birthday_day smallint;

alter table public.guests drop constraint if exists guests_birthday_check;
alter table public.guests add constraint guests_birthday_check check (
  (birthday_month is null and birthday_day is null)
  or (birthday_month between 1 and 12 and birthday_day between 1 and 31)
);

create unique index if not exists guests_one_primary_idx on public.guests(household_id) where is_primary;

-- Every household that has people gets a main contact: the first person on its list.
update public.guests g set is_primary = true
where g.id in (
  select distinct on (x.household_id) x.id
  from public.guests x
  where not exists (select 1 from public.guests y where y.household_id = x.household_id and y.is_primary)
  order by x.household_id, x.sort, x.created_at
);

-- The shared link keeps the full contact card too, for an admin to match by hand.
alter table public.address_submissions add column if not exists first_name text;
alter table public.address_submissions add column if not exists last_name text;
alter table public.address_submissions add column if not exists birthday_month smallint;
alter table public.address_submissions add column if not exists birthday_day smallint;
alter table public.address_submissions add column if not exists family jsonb not null default '[]'::jsonb;

-- Who is this link for, and what do we have for them? Returns null for an unknown token.
create or replace function public.get_invite(p_token text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'name', h.name,
    'greeting', coalesce(nullif(btrim(h.greeting), ''), h.name),
    'has_address', coalesce(btrim(h.address1), '') <> '',
    'confirmed', h.address_confirmed_at is not null,
    'address', case when coalesce(btrim(h.address1), '') = '' then null else jsonb_build_object(
      'address1', h.address1,
      'address2', h.address2,
      'city', h.city,
      'state', h.state,
      'postal_code', h.postal_code,
      'country', h.country
    ) end,
    'phone', h.phone,
    'email', h.email,
    'contact', (
      select jsonb_build_object(
        'first_name', p.first_name,
        'last_name', p.last_name,
        'birthday_month', p.birthday_month,
        'birthday_day', p.birthday_day
      )
      from public.guests p
      where p.household_id = h.id and p.is_primary
    ),
    'family', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'first_name', f.first_name,
        'last_name', f.last_name,
        'relationship', f.relationship
      ) order by f.sort, f.created_at)
      from public.guests f
      where f.household_id = h.id and not f.is_primary
    ), '[]'::jsonb)
  )
  from public.households h
  where h.invite_token = p_token;
$$;

-- The guest tapped "Confirm info".
create or replace function public.confirm_info(p_token text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_household uuid;
begin
  update public.households h
  set address_confirmed_at = now()
  where h.invite_token = p_token
    and coalesce(btrim(h.address1), '') <> ''
  returning h.id into v_household;

  return jsonb_build_object('ok', v_household is not null);
end;
$$;

-- The guest sent the form. With a personal token the household is updated right away;
-- without one the card waits in the admin inbox. Every send is also kept in
-- address_submissions as a record of what was sent.
--
-- p_info: { name, first_name, last_name, address1, address2, city, state, postal_code,
--           country, phone, email, birthday_month, birthday_day, note,
--           family: [{ id?, first_name, last_name, relationship }] }
create or replace function public.submit_contact(p_info jsonb, p_token text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_household uuid;
  v_recent int;
  v_primary uuid;
  v_keep uuid[] := '{}';
  v_id uuid;
  v_sort int := 1;
  v_month smallint;
  v_day smallint;
  v_family jsonb := '[]'::jsonb;
  f jsonb;
  t text;
  v_name text := btrim(coalesce(p_info ->> 'name', ''));
  v_first text := btrim(coalesce(p_info ->> 'first_name', ''));
  v_last text := nullif(btrim(coalesce(p_info ->> 'last_name', '')), '');
  v_address1 text := btrim(coalesce(p_info ->> 'address1', ''));
  v_address2 text := nullif(btrim(coalesce(p_info ->> 'address2', '')), '');
  v_city text := btrim(coalesce(p_info ->> 'city', ''));
  v_state text := nullif(btrim(coalesce(p_info ->> 'state', '')), '');
  v_postal text := nullif(btrim(coalesce(p_info ->> 'postal_code', '')), '');
  v_country text := nullif(btrim(coalesce(p_info ->> 'country', '')), '');
  v_phone text := nullif(btrim(coalesce(p_info ->> 'phone', '')), '');
  v_email text := nullif(btrim(coalesce(p_info ->> 'email', '')), '');
  v_note text := nullif(btrim(coalesce(p_info ->> 'note', '')), '');
begin
  if jsonb_typeof(p_info) is distinct from 'object' then
    raise exception 'missing_fields';
  end if;
  if v_first = '' or v_address1 = '' or v_city = '' then
    raise exception 'missing_fields';
  end if;
  if v_name = '' then
    v_name := btrim(v_first || ' ' || coalesce(v_last, ''));
  end if;
  if length(v_name) > 200 or length(v_first) > 100 or length(coalesce(v_last, '')) > 100
     or length(v_address1) > 200 or length(coalesce(v_address2, '')) > 200 or length(v_city) > 120
     or length(coalesce(v_state, '')) > 80 or length(coalesce(v_postal, '')) > 30
     or length(coalesce(v_country, '')) > 80 or length(coalesce(v_phone, '')) > 40
     or length(coalesce(v_email, '')) > 200 or length(coalesce(v_note, '')) > 2000 then
    raise exception 'too_long';
  end if;

  -- Birthday: month and day, both or neither.
  t := p_info ->> 'birthday_month';
  if coalesce(t, '') ~ '^\d{1,2}$' and coalesce(p_info ->> 'birthday_day', '') ~ '^\d{1,2}$' then
    v_month := t::smallint;
    v_day := (p_info ->> 'birthday_day')::smallint;
    if v_month not between 1 and 12 or v_day not between 1 and 31 then
      v_month := null;
      v_day := null;
    end if;
  end if;

  -- Family: up to 20 people, each with a first name.
  if jsonb_typeof(p_info -> 'family') = 'array' then
    if jsonb_array_length(p_info -> 'family') > 20 then
      raise exception 'too_long';
    end if;
    for f in select * from jsonb_array_elements(p_info -> 'family') loop
      if jsonb_typeof(f) <> 'object' or btrim(coalesce(f ->> 'first_name', '')) = '' then
        continue;
      end if;
      if length(f ->> 'first_name') > 100 or length(coalesce(f ->> 'last_name', '')) > 100
         or length(coalesce(f ->> 'relationship', '')) > 60 then
        raise exception 'too_long';
      end if;
      v_family := v_family || jsonb_build_array(jsonb_build_object(
        'id', case when coalesce(f ->> 'id', '') ~ '^[0-9a-f-]{36}$' then f ->> 'id' end,
        'first_name', btrim(f ->> 'first_name'),
        'last_name', nullif(btrim(coalesce(f ->> 'last_name', '')), ''),
        'relationship', nullif(btrim(coalesce(f ->> 'relationship', '')), '')
      ));
    end loop;
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
    (household_id, name, first_name, last_name, email, phone, address1, address2, city, state, postal_code,
     country, birthday_month, birthday_day, family, note, status)
  values
    (v_household, v_name, v_first, v_last, v_email, v_phone, v_address1, v_address2, v_city, v_state, v_postal,
     v_country, v_month, v_day, v_family, v_note, case when v_household is null then 'new' else 'merged' end);

  if v_household is null then
    return jsonb_build_object('ok', true, 'matched', false);
  end if;

  update public.households h set
    name = v_name,
    address1 = v_address1,
    address2 = v_address2,
    city = v_city,
    state = v_state,
    postal_code = v_postal,
    country = coalesce(v_country, h.country),
    phone = v_phone,
    email = coalesce(v_email, h.email),
    address_updated_at = now(),
    address_confirmed_at = now()
  where h.id = v_household;

  -- The main contact: the one marked, or else someone already listed with the same first name.
  select g.id into v_primary from public.guests g where g.household_id = v_household and g.is_primary;
  if v_primary is null then
    select g.id into v_primary from public.guests g
    where g.household_id = v_household and lower(g.first_name) = lower(v_first)
    order by g.sort limit 1;
  end if;
  if v_primary is null then
    insert into public.guests (household_id, first_name, last_name, is_primary, birthday_month, birthday_day, sort)
    values (v_household, v_first, v_last, true, v_month, v_day, 0)
    returning id into v_primary;
  else
    update public.guests g set
      first_name = v_first, last_name = v_last, is_primary = true,
      birthday_month = v_month, birthday_day = v_day, relationship = null, sort = 0
    where g.id = v_primary;
  end if;
  v_keep := array[v_primary];

  -- Everyone else: update the people we already had, add new ones, remove the ones taken off.
  for f in select * from jsonb_array_elements(v_family) loop
    v_id := null;
    if f ->> 'id' = v_primary::text then
      continue;
    end if;
    if f ->> 'id' is not null then
      update public.guests g set
        first_name = f ->> 'first_name',
        last_name = f ->> 'last_name',
        relationship = f ->> 'relationship',
        sort = v_sort
      where g.id = (f ->> 'id')::uuid and g.household_id = v_household and g.id <> v_primary
      returning g.id into v_id;
    end if;
    if v_id is null then
      insert into public.guests (household_id, first_name, last_name, relationship, kind, sort)
      values (
        v_household, f ->> 'first_name', f ->> 'last_name', f ->> 'relationship',
        case when lower(coalesce(f ->> 'relationship', '')) ~ '\m(son|daughter|child|kid|stepson|stepdaughter)\M' then 'kid' else 'adult' end,
        v_sort
      )
      returning id into v_id;
    end if;
    v_keep := v_keep || v_id;
    v_sort := v_sort + 1;
  end loop;

  delete from public.guests g where g.household_id = v_household and not (g.id = any(v_keep));

  return jsonb_build_object('ok', true, 'matched', true);
end;
$$;

-- Replaced by confirm_info and submit_contact.
drop function if exists public.confirm_address(text);
drop function if exists public.submit_address(text, text, text, text, text, text, text, text, text, text, text);

revoke all on function public.confirm_info(text) from public;
revoke all on function public.submit_contact(jsonb, text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;
grant execute on function public.confirm_info(text) to anon, authenticated;
grant execute on function public.submit_contact(jsonb, text) to anon, authenticated;

notify pgrst, 'reload schema';
