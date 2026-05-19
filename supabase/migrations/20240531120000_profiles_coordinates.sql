-- Profil konumu (metin + isteğe bağlı koordinat; tam adres istenmez)

alter table public.profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

notify pgrst, 'reload schema';
