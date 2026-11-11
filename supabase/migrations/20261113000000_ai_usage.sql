-- Daily AI usage counter, so each person can make a limited number of AI planning requests a day.
-- Run once in the Supabase SQL Editor (safe to run again). Only the plan-meals Edge Function uses this table.

create table if not exists public.ai_usage (
  user_id uuid    not null references auth.users (id) on delete cascade,
  day     date    not null default current_date,
  uses    integer not null default 0 check (uses >= 0),
  primary key (user_id, day)
);

-- Row-level security on with no policies: nobody can read or change it through the API. Only the function below can.
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

-- Adds one use for today and returns the new total, atomically.
create or replace function public.increment_ai_usage(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_count integer;
begin
  insert into public.ai_usage as u (user_id, day, uses)
  values (p_user, current_date, 1)
  on conflict (user_id, day) do update set uses = u.uses + 1
  returning uses into new_count;
  return new_count;
end;
$$;

-- Only the Edge Function (using the service role) may call it. Signed-in and signed-out visitors may not.
revoke all on function public.increment_ai_usage(uuid) from public, anon, authenticated;
grant execute on function public.increment_ai_usage(uuid) to service_role;
