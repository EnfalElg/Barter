-- Profile trust / rating aggregates

alter table public.profiles
  add column if not exists rating_average numeric default 0,
  add column if not exists rating_count integer default 0;

update public.profiles
set
  rating_average = coalesce(rating_average, 0),
  rating_count = coalesce(rating_count, 0),
  trust_score = coalesce(trust_score, 50),
  completed_swaps = coalesce(completed_swaps, 0),
  updated_at = coalesce(updated_at, created_at, now())
where rating_average is null
   or rating_count is null
   or trust_score is null
   or completed_swaps is null
   or updated_at is null;

-- Persist recalculated trust (SECURITY DEFINER — cross-user profile update)
create or replace function public.apply_user_trust_stats(
  p_user_id uuid,
  p_trust_score integer,
  p_completed_swaps integer,
  p_rating_average numeric,
  p_rating_count integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  update public.profiles
  set
    trust_score = greatest(0, least(100, p_trust_score)),
    completed_swaps = greatest(0, p_completed_swaps),
    rating_average = greatest(0, coalesce(p_rating_average, 0)),
    rating_count = greatest(0, p_rating_count),
    updated_at = now()
  where id = p_user_id;

  if not found then
    insert into public.profiles (
      id,
      trust_score,
      completed_swaps,
      rating_average,
      rating_count
    )
    values (
      p_user_id,
      greatest(0, least(100, p_trust_score)),
      greatest(0, p_completed_swaps),
      greatest(0, coalesce(p_rating_average, 0)),
      greatest(0, p_rating_count)
    );
  end if;
end;
$$;

revoke all on function public.apply_user_trust_stats(uuid, integer, integer, numeric, integer) from public;
grant execute on function public.apply_user_trust_stats(uuid, integer, integer, numeric, integer) to authenticated;

notify pgrst, 'reload schema';
