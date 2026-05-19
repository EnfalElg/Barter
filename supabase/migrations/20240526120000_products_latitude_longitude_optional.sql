-- Optional aliases for lat/lng (app reads lat/lng, latitude/longitude, or null).
-- Safe to run on DBs that already have lat/lng only.

alter table public.products
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

notify pgrst, 'reload schema';
