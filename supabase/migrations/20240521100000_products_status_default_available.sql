-- Veri: yayında olmayan null status'lu satırlar keşfet / detay için "available" yapılır.
-- RLS: Keşfet detayı için önceki migrationlarda
--   products_select_own + products_select_available_marketplace (veya eşdeğeri) olmalı.
-- Eksikse Supabase SQL Editor'da:
--
-- create policy "Anyone can view available products"
--   on public.products for select to authenticated, anon
--   using (status = 'available');
-- create policy "Users can view their own products"
--   on public.products for select to authenticated, anon
--   using (auth.uid() = owner_id);

update public.products
set status = 'available'
where status is null or trim(coalesce(status, '')) = '';
