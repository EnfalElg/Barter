-- Idempotent: ensure authenticated users can delete their own product rows.
-- Safe if "products_delete_own" already exists from an earlier migration.

drop policy if exists "products_delete_own" on public.products;

create policy "products_delete_own"
  on public.products for delete
  to authenticated
  using (auth.uid() = owner_id);
