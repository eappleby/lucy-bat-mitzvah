-- Personal address check: "Is this your address?"
-- Safe to run more than once.
--
-- Change to the security model: the holder of a household's personal link can now
-- see that household's mailing address, so they can confirm it or correct it.
-- Nothing else about the household (email, phone, guests, notes) is ever returned.

alter table public.households add column if not exists address_confirmed_at timestamptz;

-- Who is this link for, and what address do we have? Returns null for an unknown token.
create or replace function public.get_invite(p_token text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'greeting', coalesce(nullif(btrim(h.greeting), ''), h.name),
    'name', h.name,
    'has_address', coalesce(btrim(h.address1), '') <> '',
    'confirmed', h.address_confirmed_at is not null,
    'address', case when coalesce(btrim(h.address1), '') = '' then null else jsonb_build_object(
      'address1', h.address1,
      'address2', h.address2,
      'city', h.city,
      'state', h.state,
      'postal_code', h.postal_code,
      'country', h.country
    ) end
  )
  from public.households h
  where h.invite_token = p_token;
$$;

-- The guest tapped "Yes, that's my address".
create or replace function public.confirm_address(p_token text)
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

-- Same as before, plus: an address sent through a personal link counts as confirmed.
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
      address_updated_at = now(),
      address_confirmed_at = now()
    where h.id = v_household;
  end if;

  return jsonb_build_object('ok', true, 'matched', v_household is not null);
end;
$$;

revoke all on function public.confirm_address(text) from public;
grant execute on function public.confirm_address(text) to anon, authenticated;
grant execute on function public.get_invite(text) to anon, authenticated;
grant execute on function public.submit_address(text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
