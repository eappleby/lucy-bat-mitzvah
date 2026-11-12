-- Pearl dive high scores: one shared top 10 on the Coming soon page. Safe to run more than once.
-- Players leave arcade style initials (up to 3 letters or digits). Visitors only read the
-- top 10 and add a score through the functions below; admins can delete rows.

create table if not exists public.pearl_scores (
  id uuid primary key default gen_random_uuid(),
  initials text not null check (initials ~ '^[A-Z0-9]{1,3}$'),
  score int not null check (score between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists pearl_scores_rank_idx on public.pearl_scores (score desc, created_at);

alter table public.pearl_scores enable row level security;
drop policy if exists "admins manage" on public.pearl_scores;
create policy "admins manage" on public.pearl_scores
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- The top 10, best first; ties go to whoever got there first.
create or replace function public.get_pearl_scores()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('initials', s.initials, 'score', s.score) order by s.score desc, s.created_at), '[]'::jsonb)
  from (select initials, score, created_at from public.pearl_scores order by score desc, created_at limit 10) s;
$$;

-- Adds a score and returns the new top 10.
create or replace function public.submit_pearl_score(p_initials text, p_score int)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_initials text := upper(btrim(coalesce(p_initials, '')));
  v_recent int;
begin
  if v_initials !~ '^[A-Z0-9]{1,3}$' or p_score is null or p_score not between 1 and 500 then
    raise exception 'bad_score';
  end if;
  select count(*) into v_recent from public.pearl_scores where created_at > now() - interval '10 minutes';
  if v_recent >= 100 then
    raise exception 'too_busy';
  end if;
  insert into public.pearl_scores (initials, score) values (v_initials, p_score);
  return public.get_pearl_scores();
end;
$$;

revoke all on function public.get_pearl_scores() from public;
revoke all on function public.submit_pearl_score(text, int) from public;
grant execute on function public.get_pearl_scores() to anon, authenticated;
grant execute on function public.submit_pearl_score(text, int) to anon, authenticated;

notify pgrst, 'reload schema';
