-- Enable inserts/selects for authenticated users (run once if policies missing)
-- Adjust if you already defined policies with the same names.

drop policy if exists "products_select_authenticated" on public.products;
drop policy if exists "products_insert_own" on public.products;
drop policy if exists "products_update_own" on public.products;
drop policy if exists "products_delete_own" on public.products;

create policy "products_select_authenticated"
  on public.products for select
  to authenticated
  using (true);

create policy "products_insert_own"
  on public.products for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "products_update_own"
  on public.products for update
  to authenticated
  using (auth.uid() = owner_id);

create policy "products_delete_own"
  on public.products for delete
  to authenticated
  using (auth.uid() = owner_id);
