-- İstek listesi: ürün ve profil düzeyinde aranan kategoriler / anahtar kelimeler

alter table public.products
  add column if not exists wanted_categories text[] default '{}',
  add column if not exists wanted_keywords text[] default '{}';

alter table public.profiles
  add column if not exists wanted_categories text[] default '{}',
  add column if not exists wanted_keywords text[] default '{}';

notify pgrst, 'reload schema';
