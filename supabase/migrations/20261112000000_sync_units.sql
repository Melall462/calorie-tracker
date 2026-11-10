-- Nutrily cloud sync: one table, one row per piece of a person's data ("unit": a day, the settings, the recipe book).
-- Run this once in the Supabase dashboard (SQL Editor) or with `supabase db push`. It is safe to run again.
--
-- Security: every row belongs to the signed-in user who created it and nobody else can read or change it (row-level
-- security). Access is granted explicitly, because the project is meant to be created with "Automatically expose new
-- tables" switched off.

create table if not exists public.sync_units (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key        text        not null check (char_length(key) between 1 and 80),
  value      jsonb       not null check (octet_length(value::text) <= 262144), -- 256 KB per unit is far more than needed
  version    integer     not null default 1 check (version >= 1),             -- raised by 1 on every change, so devices can tell when they are out of date
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Lets a device ask only for what changed since it last synced.
create index if not exists sync_units_user_updated_idx on public.sync_units (user_id, updated_at);

alter table public.sync_units enable row level security;

drop policy if exists "Users manage their own sync units" on public.sync_units;
create policy "Users manage their own sync units"
  on public.sync_units
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Only signed-in users touch this table. Signed-out visitors (the anon role) never do.
revoke all on public.sync_units from anon;
grant select, insert, update, delete on public.sync_units to authenticated;

-- The server sets updated_at, so a device with a wrong clock cannot confuse the sync.
create or replace function public.set_sync_units_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sync_units_set_updated_at on public.sync_units;
create trigger sync_units_set_updated_at
  before insert or update on public.sync_units
  for each row execute function public.set_sync_units_updated_at();
