-- Birthdays are no longer part of the contact card. Safe to run more than once.
-- get_invite stops returning them. The guests.birthday_month and birthday_day columns
-- stay in place, but nothing shows or asks for them anymore.

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
      select jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name)
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

grant execute on function public.get_invite(text) to anon, authenticated;

notify pgrst, 'reload schema';
