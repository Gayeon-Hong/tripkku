-- TripKku demo backend: run in Supabase SQL Editor ONCE after reviewing.
-- Row Level Security keeps invite-only trip details and individual finances private.
-- This schema is designed for Supabase Auth (Google/Kakao) on the general WEB version.
-- Toss Mini App needs a separately verified Toss Login -> backend identity -> DB authorization bridge.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  preset text not null default 'oita',
  title text not null default '우리 여행',
  city text not null default '벳푸 · 유후인',
  dates text not null default '날짜 미정',
  language text not null default 'ja-JP',
  description text not null default '',
  budget_note text not null default '',
  shared_target integer not null default 550000 check(shared_target >= 0),
  active_plan text not null default 'A' check (active_plan in ('A','B')),
  nights_a jsonb not null default '[90000,90000]'::jsonb,
  nights_b jsonb not null default '[85000,320000]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null default '친구',
  role text not null default 'editor' check (role in ('owner','editor')),
  joined_at timestamptz not null default now(),
  primary key (trip_id,user_id)
);

create table if not exists public.member_finances (
  trip_id uuid not null,
  user_id uuid not null,
  personal_target integer not null default 450000 check(personal_target >= 0),
  airfare integer not null default 0 check(airfare >= 0),
  personal_extra integer not null default 0 check(personal_extra >= 0),
  updated_at timestamptz not null default now(),
  primary key (trip_id,user_id),
  foreign key (trip_id,user_id) references public.trip_members(trip_id,user_id) on delete cascade
);

create table if not exists public.shared_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null default '기타',
  title text not null,
  amount integer not null default 0 check (amount >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.plan_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  plan_key text not null check(plan_key in ('A','B')),
  day_number integer not null check(day_number between 1 and 30),
  time_label text not null default '',
  title text not null,
  note text not null default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Only hashed invite tokens are stored. Invite links contain 192 bits of randomness.
create table if not exists public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default (now()+interval '7 days'),
  uses integer not null default 0,
  max_uses integer not null default 15,
  created_by uuid not null references auth.users(id)
);

create index if not exists idx_members_user on public.trip_members(user_id);
create index if not exists idx_items_trip on public.plan_items(trip_id,plan_key,day_number);
create index if not exists idx_expenses_trip on public.shared_expenses(trip_id);

-- SECURITY DEFINER prevents recursive RLS when checking trip_members permissions.
create or replace function public.is_trip_member(p_trip uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.trip_members m
    where m.trip_id=p_trip and m.user_id=(select auth.uid())
  );
$$;
revoke all on function public.is_trip_member(uuid) from public;
grant execute on function public.is_trip_member(uuid) to authenticated;

create or replace function public.seed_trip_owner()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
 insert into public.trip_members(trip_id,user_id,role,nickname)
 values(new.id,new.owner_id,'owner','나');
 return new;
end;$$;
drop trigger if exists trg_trip_owner on public.trips;
create trigger trg_trip_owner after insert on public.trips
for each row execute function public.seed_trip_owner();

create or replace function public.prevent_owner_change()
returns trigger language plpgsql as $$
begin
 if new.owner_id is distinct from old.owner_id then
   raise exception 'Trip owner cannot be reassigned';
 end if;
 return new;
end;$$;
drop trigger if exists trg_trip_owner_lock on public.trips;
create trigger trg_trip_owner_lock before update on public.trips
for each row execute function public.prevent_owner_change();

create or replace function public.seed_member_finances()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
 insert into public.member_finances(trip_id,user_id)
 values(new.trip_id,new.user_id) on conflict do nothing;
 return new;
end;$$;
drop trigger if exists trg_seed_finance on public.trip_members;
create trigger trg_seed_finance after insert on public.trip_members
for each row execute function public.seed_member_finances();

-- A member can edit only their nickname, never escalate role or move membership.
create or replace function public.prevent_member_role_change()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
 if new.trip_id is distinct from old.trip_id or new.user_id is distinct from old.user_id
    or new.role is distinct from old.role then
    raise exception 'Membership identity and role cannot be changed';
 end if;
 return new;
end;$$;
drop trigger if exists trg_member_role_lock on public.trip_members;
create trigger trg_member_role_lock before update on public.trip_members
for each row execute function public.prevent_member_role_change();

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.member_finances enable row level security;
alter table public.shared_expenses enable row level security;
alter table public.plan_items enable row level security;
alter table public.trip_invites enable row level security;

-- trips: own creation; any authenticated member may edit trip-level budget/plan.
create policy trips_read_member on public.trips for select to authenticated
using(public.is_trip_member(id));
create policy trips_create_owner on public.trips for insert to authenticated
with check(owner_id=(select auth.uid()));
create policy trips_update_member on public.trips for update to authenticated
using(public.is_trip_member(id)) with check(public.is_trip_member(id));

-- Member nickname and membership list are visible to the group, but no private finances.
create policy members_read_group on public.trip_members for select to authenticated
using(public.is_trip_member(trip_id));
create policy members_update_self on public.trip_members for update to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- This is the privacy boundary: other travelers CANNOT SELECT each other's airfare/budget.
create policy finance_read_self on public.member_finances for select to authenticated
using(user_id=(select auth.uid()) and public.is_trip_member(trip_id));
create policy finance_update_self on public.member_finances for update to authenticated
using(user_id=(select auth.uid()) and public.is_trip_member(trip_id))
with check(user_id=(select auth.uid()) and public.is_trip_member(trip_id));
create policy finance_insert_self on public.member_finances for insert to authenticated
with check(user_id=(select auth.uid()) and public.is_trip_member(trip_id));

create policy shared_read_member on public.shared_expenses for select to authenticated
using(public.is_trip_member(trip_id));
create policy shared_insert_member on public.shared_expenses for insert to authenticated
with check(public.is_trip_member(trip_id) and created_by=(select auth.uid()));
create policy shared_update_member on public.shared_expenses for update to authenticated
using(public.is_trip_member(trip_id)) with check(public.is_trip_member(trip_id));
create policy shared_delete_member on public.shared_expenses for delete to authenticated
using(public.is_trip_member(trip_id));

create policy items_read_member on public.plan_items for select to authenticated
using(public.is_trip_member(trip_id));
create policy items_insert_member on public.plan_items for insert to authenticated
with check(public.is_trip_member(trip_id) and created_by=(select auth.uid()));
create policy items_update_member on public.plan_items for update to authenticated
using(public.is_trip_member(trip_id)) with check(public.is_trip_member(trip_id));
create policy items_delete_member on public.plan_items for delete to authenticated
using(public.is_trip_member(trip_id));

-- No direct API select/insert policies on trip_invites. RPC exposes only high-entropy token.
create or replace function public.create_trip_invite(p_trip uuid)
returns text language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare v_token text := encode(extensions.gen_random_bytes(24),'hex');
begin
 if (select auth.uid()) is null or not exists (
   select 1 from public.trips where id=p_trip and owner_id=(select auth.uid())
 ) then raise exception 'Only the trip owner can invite'; end if;
 insert into public.trip_invites(trip_id,token_hash,created_by)
 values (p_trip,encode(extensions.digest(v_token,'sha256'),'hex'),(select auth.uid()));
 return v_token;
end;$$;
revoke all on function public.create_trip_invite(uuid) from public;
grant execute on function public.create_trip_invite(uuid) to authenticated;

create or replace function public.join_trip(p_token text)
returns uuid language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare v_inv public.trip_invites%rowtype;
begin
 if (select auth.uid()) is null then raise exception 'Login required'; end if;
 if p_token !~ '^[0-9a-f]{48}$' then raise exception 'Invalid invitation'; end if;
 select * into v_inv from public.trip_invites
 where token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
   and expires_at>now() for update;
 if not found then raise exception 'Invitation expired or invalid'; end if;
 if exists(select 1 from public.trip_members where trip_id=v_inv.trip_id and user_id=(select auth.uid()))
 then return v_inv.trip_id; end if;
 if v_inv.uses>=v_inv.max_uses then raise exception 'Invitation exhausted'; end if;
 insert into public.trip_members(trip_id,user_id,nickname,role)
 values(v_inv.trip_id,(select auth.uid()),'친구','editor');
 update public.trip_invites set uses=uses+1 where id=v_inv.id;
 return v_inv.trip_id;
end;$$;
revoke all on function public.join_trip(text) from public;
grant execute on function public.join_trip(text) to authenticated;

-- Supabase Realtime needs table replication enabled. Ignore duplicates on subsequent runs.
do $$ begin
  alter publication supabase_realtime add table public.trips;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.trip_members;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.member_finances;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.shared_expenses;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.plan_items;
exception when duplicate_object then null; end $$;

-- NOTE: for production add audit log, soft-delete, invite revocation, per-user rate limiting,
-- schema migrations, automated RLS tests and personal data deletion/export flows.
