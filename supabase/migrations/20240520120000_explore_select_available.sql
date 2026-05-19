-- Explore + denk eşleşme: authenticated / anon kullanıcılar "available" ilan satırlarını okuyabilsin.
-- UYGULAMA: Keşif ve eşleşme sorgularında yalnızca herkese açık kolonları SELECT edin;
-- user_value / estimated_price / ai_min_value / ai_max_value istemciye taşınmamalı.
-- Mevcut "products_select_own" ile birleşince: kendi satırın (tüm status) VEYA başkasının available satırı.

drop policy if exists "products_select_available_marketplace" on public.products;

create policy "products_select_available_marketplace"
  on public.products for select
  to authenticated, anon
  using (status = 'available');
