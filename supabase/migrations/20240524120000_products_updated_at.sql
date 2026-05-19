-- Owner edit flow: updated_at + RLS update policy (idempotent)

alter table public.products
  add column if not exists updated_at timestamptz default now();

update public.products
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

drop policy if exists "products_update_own" on public.products;

create policy "products_update_own"
  on public.products for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

notify pgrst, 'reload schema';
