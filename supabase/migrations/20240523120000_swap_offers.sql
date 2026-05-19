-- Takas teklifleri: swap_offers + swap_offer_items

create table if not exists public.swap_offers (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users (id) on delete cascade,
  to_user_id uuid not null references auth.users (id) on delete cascade,
  requested_product_id uuid not null references public.products (id) on delete cascade,
  status text not null default 'pending',
  message text,
  value_match_score integer,
  match_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint swap_offers_status_chk check (
    status in ('pending', 'accepted', 'rejected', 'cancelled')
  ),
  constraint swap_offers_no_self check (from_user_id <> to_user_id)
);

create table if not exists public.swap_offer_items (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.swap_offers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists swap_offers_from_user_id_idx on public.swap_offers (from_user_id);
create index if not exists swap_offers_to_user_id_idx on public.swap_offers (to_user_id);
create index if not exists swap_offers_requested_product_id_idx
  on public.swap_offers (requested_product_id);
create index if not exists swap_offer_items_offer_id_idx on public.swap_offer_items (offer_id);
create index if not exists swap_offer_items_product_id_idx on public.swap_offer_items (product_id);

create or replace function public.set_swap_offers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists swap_offers_set_updated_at on public.swap_offers;
create trigger swap_offers_set_updated_at
  before update on public.swap_offers
  for each row execute function public.set_swap_offers_updated_at();

alter table public.swap_offers enable row level security;
alter table public.swap_offer_items enable row level security;

drop policy if exists "swap_offers_select_parties" on public.swap_offers;
drop policy if exists "swap_offers_insert_sender" on public.swap_offers;
drop policy if exists "swap_offers_receiver_decide" on public.swap_offers;
drop policy if exists "swap_offers_sender_cancel" on public.swap_offers;

create policy "swap_offers_select_parties"
  on public.swap_offers for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

create policy "swap_offers_insert_sender"
  on public.swap_offers for insert to authenticated
  with check (from_user_id = auth.uid());

create policy "swap_offers_receiver_decide"
  on public.swap_offers for update to authenticated
  using (to_user_id = auth.uid() and status = 'pending')
  with check (
    to_user_id = auth.uid()
    and status in ('accepted', 'rejected')
  );

create policy "swap_offers_sender_cancel"
  on public.swap_offers for update to authenticated
  using (from_user_id = auth.uid() and status = 'pending')
  with check (from_user_id = auth.uid() and status = 'cancelled');

drop policy if exists "swap_offer_items_select_party" on public.swap_offer_items;
drop policy if exists "swap_offer_items_insert_sender" on public.swap_offer_items;

create policy "swap_offer_items_select_party"
  on public.swap_offer_items for select to authenticated
  using (
    exists (
      select 1 from public.swap_offers o
      where o.id = offer_id
        and (o.from_user_id = auth.uid() or o.to_user_id = auth.uid())
    )
  );

create policy "swap_offer_items_insert_sender"
  on public.swap_offer_items for insert to authenticated
  with check (
    exists (
      select 1 from public.swap_offers o
      where o.id = offer_id and o.from_user_id = auth.uid()
    )
  );

-- İptal / hata durumunda teklif satırını temizlemek için (API rollback)
drop policy if exists "swap_offers_delete_sender_pending" on public.swap_offers;
create policy "swap_offers_delete_sender_pending"
  on public.swap_offers for delete to authenticated
  using (from_user_id = auth.uid() and status = 'pending');

notify pgrst, 'reload schema';
