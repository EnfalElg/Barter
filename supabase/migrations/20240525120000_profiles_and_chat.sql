-- Public seller profiles + direct messaging

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  username text unique,
  avatar_url text,
  location text,
  bio text,
  trust_score integer not null default 50,
  completed_swaps integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete cascade,
  participant_a uuid not null references auth.users (id) on delete cascade,
  participant_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_threads_different_participants check (participant_a <> participant_b)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists chat_threads_participant_a_idx on public.chat_threads (participant_a);
create index if not exists chat_threads_participant_b_idx on public.chat_threads (participant_b);
create index if not exists chat_threads_product_id_idx on public.chat_threads (product_id);
create index if not exists chat_messages_thread_id_idx on public.chat_messages (thread_id);
create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at);

create or replace function public.set_chat_threads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chat_threads_set_updated_at on public.chat_threads;
create trigger chat_threads_set_updated_at
  before update on public.chat_threads
  for each row execute function public.set_chat_threads_updated_at();

alter table public.profiles enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_all"
  on public.profiles for select to authenticated, anon
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "chat_threads_select_participants" on public.chat_threads;
drop policy if exists "chat_threads_insert_participant" on public.chat_threads;
drop policy if exists "chat_threads_update_participants" on public.chat_threads;

create policy "chat_threads_select_participants"
  on public.chat_threads for select to authenticated
  using (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "chat_threads_insert_participant"
  on public.chat_threads for insert to authenticated
  with check (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "chat_threads_update_participants"
  on public.chat_threads for update to authenticated
  using (auth.uid() = participant_a or auth.uid() = participant_b)
  with check (auth.uid() = participant_a or auth.uid() = participant_b);

drop policy if exists "chat_messages_select_thread" on public.chat_messages;
drop policy if exists "chat_messages_insert_sender" on public.chat_messages;

create policy "chat_messages_select_thread"
  on public.chat_messages for select to authenticated
  using (
    exists (
      select 1 from public.chat_threads t
      where t.id = chat_messages.thread_id
        and (t.participant_a = auth.uid() or t.participant_b = auth.uid())
    )
  );

create policy "chat_messages_insert_sender"
  on public.chat_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_threads t
      where t.id = chat_messages.thread_id
        and (t.participant_a = auth.uid() or t.participant_b = auth.uid())
    )
  );

notify pgrst, 'reload schema';
