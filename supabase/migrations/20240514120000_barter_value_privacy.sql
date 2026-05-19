-- Barter-first: private user_value, AI badge fields, safe listing RPCs, tighter RLS.

-- ---------------------------------------------------------------------------
-- Columns (additive; backfill from legacy estimated_price / city)
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists user_value numeric;

update public.products
set user_value = coalesce(user_value, estimated_price, 1)
where user_value is null;

alter table public.products
  alter column estimated_price drop not null;

update public.products
set estimated_price = coalesce(estimated_price, user_value)
where estimated_price is null;

alter table public.products
  alter column user_value set not null,
  alter column user_value set default 1;

alter table public.products
  add column if not exists category text,
  add column if not exists condition text,
  add column if not exists location text,
  add column if not exists status text not null default 'available',
  add column if not exists ai_min_value numeric,
  add column if not exists ai_max_value numeric,
  add column if not exists ai_confidence numeric,
  add column if not exists ai_value_deviation numeric,
  add column if not exists ai_value_status text,
  add column if not exists ai_badge_label text,
  add column if not exists ai_badge_color text,
  add column if not exists is_value_hidden boolean not null default true;

update public.products
set
  category = coalesce(nullif(trim(category), ''), (tags)[1], 'Genel'),
  condition = coalesce(nullif(trim(condition), ''), 'Belirtilmedi'),
  location = coalesce(nullif(trim(location), ''), nullif(trim(city), ''), 'Belirtilmedi'),
  status = case when status is null or trim(status) = '' then 'available' else status end,
  ai_value_status = coalesce(ai_value_status, 'unknown'),
  ai_badge_label = coalesce(ai_badge_label, 'AI emin değil'),
  ai_badge_color = coalesce(ai_badge_color, 'gray')
where true;

alter table public.products
  alter column category set not null,
  alter column condition set not null,
  alter column location set not null;

create index if not exists products_user_value_idx on public.products (user_value);
create index if not exists products_status_idx on public.products (status);

-- ---------------------------------------------------------------------------
-- RPC: public catalog (no private values)
-- ---------------------------------------------------------------------------

create or replace function public.list_public_products_safe()
returns table (
  id uuid,
  owner_id uuid,
  title text,
  description text,
  category text,
  condition text,
  image_url text,
  location text,
  status text,
  ai_value_status text,
  ai_badge_label text,
  ai_badge_color text,
  created_at timestamptz,
  lat double precision,
  lng double precision,
  city text,
  tags text[],
  quantity numeric,
  unit text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.owner_id,
    p.title,
    p.description,
    p.category,
    p.condition,
    p.image_url,
    p.location,
    p.status,
    p.ai_value_status,
    p.ai_badge_label,
    p.ai_badge_color,
    p.created_at,
    p.lat,
    p.lng,
    p.city,
    p.tags,
    p.quantity,
    p.unit
  from public.products p
  where p.status = 'available';
$$;

grant execute on function public.list_public_products_safe() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: single public card
-- ---------------------------------------------------------------------------

create or replace function public.get_public_product_card(pid uuid)
returns table (
  id uuid,
  owner_id uuid,
  title text,
  description text,
  category text,
  condition text,
  image_url text,
  location text,
  status text,
  ai_value_status text,
  ai_badge_label text,
  ai_badge_color text,
  created_at timestamptz,
  lat double precision,
  lng double precision,
  city text,
  tags text[],
  quantity numeric,
  unit text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.owner_id,
    p.title,
    p.description,
    p.category,
    p.condition,
    p.image_url,
    p.location,
    p.status,
    p.ai_value_status,
    p.ai_badge_label,
    p.ai_badge_color,
    p.created_at,
    p.lat,
    p.lng,
    p.city,
    p.tags,
    p.quantity,
    p.unit
  from public.products p
  where p.id = pid and p.status = 'available';
$$;

grant execute on function public.get_public_product_card(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: ±% band matches (uses private user_value; returns only public fields + score)
-- ---------------------------------------------------------------------------

create or replace function public.get_similar_barter_matches(p_product_id uuid, p_range_pct numeric default 10)
returns table (
  id uuid,
  title text,
  description_preview text,
  category text,
  condition text,
  image_url text,
  location text,
  ai_value_status text,
  ai_badge_label text,
  ai_badge_color text,
  value_match_score integer,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_val numeric;
  rlow numeric;
  rhigh numeric;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;

  select pr.owner_id, pr.user_value
  into v_owner, v_val
  from public.products pr
  where pr.id = p_product_id;

  if v_owner is null then
    raise exception 'not_found';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'forbidden';
  end if;

  if v_val is null or v_val <= 0 then
    raise exception 'invalid anchor value';
  end if;

  rlow := v_val * (1 - (p_range_pct / 100.0));
  rhigh := v_val * (1 + (p_range_pct / 100.0));

  return query
  select
    p.id,
    p.title,
    left(coalesce(p.description, ''), 220) as description_preview,
    p.category,
    p.condition,
    p.image_url,
    p.location,
    p.ai_value_status,
    p.ai_badge_label,
    p.ai_badge_color,
    round(
      (least(v_val, p.user_value) / greatest(v_val, p.user_value)) * 100
    )::integer as value_match_score,
    p.created_at
  from public.products p
  where
    p.id <> p_product_id
    and p.status = 'available'
    and p.owner_id <> auth.uid()
    and p.user_value between rlow and rhigh
  order by value_match_score desc, p.created_at desc;
end;
$$;

grant execute on function public.get_similar_barter_matches(uuid, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: swap offer screen — my products with match score vs target (no value leak)
-- ---------------------------------------------------------------------------

create or replace function public.offer_match_scores(p_target_id uuid)
returns table (
  id uuid,
  title text,
  category text,
  condition text,
  image_url text,
  location text,
  ai_value_status text,
  ai_badge_label text,
  ai_badge_color text,
  value_match_score integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  tv numeric;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;

  select pr.user_value
  into tv
  from public.products pr
  where pr.id = p_target_id and pr.status = 'available';

  if tv is null or tv <= 0 then
    raise exception 'not_found';
  end if;

  return query
  select
    p.id,
    p.title,
    p.category,
    p.condition,
    p.image_url,
    p.location,
    p.ai_value_status,
    p.ai_badge_label,
    p.ai_badge_color,
    round((least(tv, p.user_value) / greatest(tv, p.user_value)) * 100)::integer
      as value_match_score
  from public.products p
  where
    p.owner_id = auth.uid()
    and p.status = 'available';
end;
$$;

grant execute on function public.offer_match_scores(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: discover feed in ±% band (uses user_value internally; never returned)
-- ---------------------------------------------------------------------------

create or replace function public.discover_similar_value_rows(
  anchor_value double precision,
  anchor_lat double precision default null,
  anchor_lng double precision default null,
  exclude_id uuid default null
)
returns table (
  id uuid,
  owner_id uuid,
  title text,
  description text,
  category text,
  condition text,
  image_url text,
  location text,
  status text,
  ai_value_status text,
  ai_badge_label text,
  ai_badge_color text,
  created_at timestamptz,
  lat double precision,
  lng double precision,
  city text,
  tags text[],
  quantity numeric,
  unit text,
  distance_km double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.owner_id,
    p.title,
    p.description,
    p.category,
    p.condition,
    p.image_url,
    p.location,
    p.status,
    p.ai_value_status,
    p.ai_badge_label,
    p.ai_badge_color,
    p.created_at,
    p.lat,
    p.lng,
    p.city,
    p.tags,
    p.quantity,
    p.unit,
    case
      when anchor_lat is null or anchor_lng is null
        or not (anchor_lat between -90::double precision and 90::double precision)
        or not (anchor_lng between -180::double precision and 180::double precision)
        then null::double precision
      else
        (
          6371.0 * acos(
            least(
              1::double precision,
              greatest(
                -1::double precision,
                cos(radians(anchor_lat)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(anchor_lng))
                  + sin(radians(anchor_lat)) * sin(radians(p.lat))
              )
            )
          )
        )
    end as distance_km
  from public.products p
  where
    p.status = 'available'
    and anchor_value > 0
    and p.user_value between (anchor_value * 0.9) and (anchor_value * 1.1)
    and (exclude_id is null or p.id <> exclude_id)
  order by
    distance_km nulls last,
    abs(p.user_value - anchor_value) asc;
$$;

grant execute on function public.discover_similar_value_rows(double precision, double precision, double precision, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: table reads limited to owner; public reads go through RPCs above
-- ---------------------------------------------------------------------------

drop policy if exists "products_select_authenticated" on public.products;
drop policy if exists "products_select_own" on public.products;

create policy "products_select_own"
  on public.products for select
  to authenticated
  using (auth.uid() = owner_id);
