-- Run once in Supabase SQL Editor (in addition to sql/schema.sql).
-- Defense-in-depth quota: 20 authenticated, member-verified AI calls / UTC day.
create table if not exists public.ai_daily_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 usage_day date not null,
 calls integer not null default 0 check (calls >= 0),
 primary key(user_id,usage_day)
);
alter table public.ai_daily_usage enable row level security;
-- No direct API policies: only the SECURITY DEFINER function may update counters.
create or replace function public.consume_ai_request(p_trip uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_ok integer;
begin
  if (select auth.uid()) is null or not public.is_trip_member(p_trip) then
    return false;
  end if;
  insert into public.ai_daily_usage(user_id,usage_day,calls)
  values ((select auth.uid()),(now() at time zone 'UTC')::date,1)
  on conflict(user_id,usage_day) do update
    set calls=public.ai_daily_usage.calls+1
    where public.ai_daily_usage.calls<20
  returning calls into v_ok;
  return v_ok is not null;
end;$$;
revoke all on function public.consume_ai_request(uuid) from public;
grant execute on function public.consume_ai_request(uuid) to authenticated;
