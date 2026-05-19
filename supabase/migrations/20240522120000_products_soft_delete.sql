-- Soft delete: uygulama status = 'deleted' kullanır; fiziksel DELETE kullanılmamalı.
-- RLS: products_update_own (20240512120000) zaten auth.uid() = owner_id ile güncellemeye izin verir.
--       WITH CHECK atlanırsa PostgreSQL, USING ifadesini WITH CHECK olarak da kullanır.
--
-- Hard delete politikasını kaldırıyoruz; yanlışlıkla kalıcı silmeyi engeller.

drop policy if exists "products_delete_own" on public.products;

-- status kolonu (barter migration'da zaten var); eski DB'ler için idempotent:

alter table public.products
  add column if not exists status text default 'available';

update public.products
set status = 'available'
where status is null or trim(coalesce(status, '')) = '';

notify pgrst, 'reload schema';
