-- Saved products / favorites (private per user)

create table if not exists public.product_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

alter table public.product_favorites enable row level security;

drop policy if exists "Users can view own favorites" on public.product_favorites;
create policy "Users can view own favorites"
  on public.product_favorites
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own favorites" on public.product_favorites;
create policy "Users can insert own favorites"
  on public.product_favorites
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on public.product_favorites;
create policy "Users can delete own favorites"
  on public.product_favorites
  for delete
  using (auth.uid() = user_id);

create index if not exists product_favorites_user_id_idx
  on public.product_favorites(user_id);

create index if not exists product_favorites_product_id_idx
  on public.product_favorites(product_id);

notify pgrst, 'reload schema';
