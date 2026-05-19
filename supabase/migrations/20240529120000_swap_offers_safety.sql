-- Takas güvenlik özeti (yalnızca nitel etiketler; sayısal değer yok)

alter table public.swap_offers
  add column if not exists safety_risk_level text,
  add column if not exists safety_label text;

notify pgrst, 'reload schema';
