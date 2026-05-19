-- Owner-visible explanation when AI badge is "unknown"
alter table public.products
  add column if not exists ai_uncertainty_reason text;

notify pgrst, 'reload schema';
