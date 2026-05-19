-- Barter completion lifecycle + mutual ratings

-- swap_offers: allow "completed"
alter table public.swap_offers drop constraint if exists swap_offers_status_chk;

alter table public.swap_offers
  add constraint swap_offers_status_chk check (
    status in ('pending', 'accepted', 'rejected', 'cancelled', 'completed')
  );

alter table public.swap_offers
  add column if not exists updated_at timestamptz not null default now();

-- products.updated_at (idempotent)
alter table public.products
  add column if not exists updated_at timestamptz default now();

-- Mutual ratings after completed barter
create table if not exists public.swap_ratings (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.swap_offers (id) on delete cascade,
  rater_id uuid not null references auth.users (id) on delete cascade,
  rated_user_id uuid not null references auth.users (id) on delete cascade,
  score integer not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (offer_id, rater_id)
);

create index if not exists swap_ratings_offer_id_idx on public.swap_ratings (offer_id);
create index if not exists swap_ratings_rated_user_id_idx on public.swap_ratings (rated_user_id);

alter table public.swap_ratings enable row level security;

drop policy if exists "Users can view swap ratings" on public.swap_ratings;
drop policy if exists "Users can insert own swap ratings" on public.swap_ratings;
drop policy if exists "Users can update own swap ratings" on public.swap_ratings;

create policy "Users can view swap ratings"
  on public.swap_ratings for select to authenticated
  using (true);

create policy "Users can insert own swap ratings"
  on public.swap_ratings for insert to authenticated
  with check (auth.uid() = rater_id);

create policy "Users can update own swap ratings"
  on public.swap_ratings for update to authenticated
  using (auth.uid() = rater_id)
  with check (auth.uid() = rater_id);

-- Either party may mark an accepted offer as completed (status only)
drop policy if exists "swap_offers_party_complete" on public.swap_offers;

create policy "swap_offers_party_complete"
  on public.swap_offers for update to authenticated
  using (
    (from_user_id = auth.uid() or to_user_id = auth.uid())
    and status = 'accepted'
  )
  with check (
    (from_user_id = auth.uid() or to_user_id = auth.uid())
    and status = 'completed'
  );

-- Atomic completion: offer + all involved products -> swapped
create or replace function public.complete_swap_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_offer public.swap_offers%rowtype;
  v_item record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;

  select * into v_offer from public.swap_offers where id = p_offer_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_offer.from_user_id <> v_uid and v_offer.to_user_id <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_offer.status <> 'accepted' then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  update public.swap_offers
  set status = 'completed', updated_at = now()
  where id = p_offer_id and status = 'accepted';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  update public.products
  set status = 'swapped', updated_at = now()
  where id = v_offer.requested_product_id
    and status in ('available', 'reserved', 'paused');

  for v_item in
    select product_id from public.swap_offer_items where offer_id = p_offer_id
  loop
    update public.products
    set status = 'swapped', updated_at = now()
    where id = v_item.product_id
      and status in ('available', 'reserved', 'paused');
  end loop;

  return jsonb_build_object('ok', true, 'status', 'completed');
end;
$$;

revoke all on function public.complete_swap_offer(uuid) from public;
grant execute on function public.complete_swap_offer(uuid) to authenticated;

notify pgrst, 'reload schema';
