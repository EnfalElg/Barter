-- Barter marketplace: product listings with geo + AI-estimated value
-- Run in Supabase SQL editor or via supabase db push

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  quantity numeric not null default 1,
  unit text not null default 'piece',
  estimated_price numeric not null,
  lat double precision not null,
  lng double precision not null,
  city text not null,
  tags text[] not null default '{}',
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists products_owner_id_idx on public.products (owner_id);
create index if not exists products_city_idx on public.products (city);
create index if not exists products_estimated_price_idx on public.products (estimated_price);
create index if not exists products_created_at_idx on public.products (created_at desc);

alter table public.products enable row level security;

-- Adjust policies for your auth model; common pattern:
-- create policy "read all authenticated" on public.products for select to authenticated using (true);
-- create policy "insert own" on public.products for insert to authenticated with check (auth.uid() = owner_id);
-- create policy "update own" on public.products for update to authenticated using (auth.uid() = owner_id);
-- create policy "delete own" on public.products for delete to authenticated using (auth.uid() = owner_id);
