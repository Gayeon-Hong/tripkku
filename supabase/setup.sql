-- TRIPKKU NEXT beta database. Run in Supabase SQL Editor, NOT Edge Functions.
-- Creates NEW tables; does not modify oita_rooms or existing tripkku-private-files.
create extension if not exists pgcrypto;

create table if not exists public.tripkku_trips (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 invite_code text not null unique default encode(gen_random_bytes(12), 'hex'),
 title text not null,
 country_code text not null,
 destination text not null,
 start_date date not null,
 end_date date not null,
 data jsonb not null default '{}'::jsonb,
 revision integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint tripkku_trip_dates check (end_date >= start_date)
);
create table if not exists public.tripkku_trip_members (
 trip_id uuid not null references public.tripkku_trips(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null default '여행자',
 joined_at timestamptz not null default now(),
 primary key(trip_id,user_id)
);
create index if not exists tripkku_members_user_idx on public.tripkku_trip_members(user_id);

create or replace function public.tripkku_is_member(p_trip_id uuid)
returns boolean language sql security definer stable set search_path = public, pg_temp as $$
 select (select auth.uid()) is not null and exists(
  select 1 from public.tripkku_trip_members m
   where m.trip_id = p_trip_id and m.user_id = (select auth.uid())
 );
$$;
revoke all on function public.tripkku_is_member(uuid) from public;
grant execute on function public.tripkku_is_member(uuid) to authenticated;

alter table public.tripkku_trips enable row level security;
alter table public.tripkku_trip_members enable row level security;
revoke all on public.tripkku_trips, public.tripkku_trip_members from anon, authenticated;
grant select on public.tripkku_trips, public.tripkku_trip_members to authenticated;
drop policy if exists tripkku_trips_read on public.tripkku_trips;
create policy tripkku_trips_read on public.tripkku_trips for select to authenticated
 using (public.tripkku_is_member(id));
drop policy if exists tripkku_members_read on public.tripkku_trip_members;
create policy tripkku_members_read on public.tripkku_trip_members for select to authenticated
 using (public.tripkku_is_member(trip_id));

create or replace function public.tripkku_create_trip(
 p_title text,p_country text,p_destination text,p_start date,p_end date,p_data jsonb
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_name text;
begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 if length(trim(coalesce(p_title,''))) not between 2 and 100
 or length(trim(coalesce(p_destination,''))) not between 2 and 120
 or p_country !~ '^[A-Z]{2}$' or p_end<p_start or p_end>p_start+13
 or length(coalesce(p_data::text,'')) > 90000 then
  raise exception 'INVALID_TRIP_INPUT';
 end if;
 insert into public.tripkku_trips(owner_id,title,country_code,destination,start_date,end_date,data)
 values(auth.uid(),left(trim(p_title),100),p_country,left(trim(p_destination),120),p_start,p_end,coalesce(p_data,'{}'::jsonb))
 returning id into v_id;
 v_name:=coalesce(nullif(left(auth.jwt()->'user_metadata'->>'full_name',60),''),'여행자');
 insert into public.tripkku_trip_members(trip_id,user_id,display_name) values(v_id,auth.uid(),v_name);
 return v_id;
end $$;
revoke all on function public.tripkku_create_trip(text,text,text,date,date,jsonb) from public;
grant execute on function public.tripkku_create_trip(text,text,text,date,date,jsonb) to authenticated;

create or replace function public.tripkku_join_trip(p_invite_code text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_name text;
begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 if p_invite_code !~ '^[0-9a-f]{24}$' then raise exception 'INVALID_INVITE'; end if;
 select id into v_id from public.tripkku_trips where invite_code=p_invite_code;
 if v_id is null then raise exception 'INVITE_NOT_FOUND'; end if;
 v_name:=coalesce(nullif(left(auth.jwt()->'user_metadata'->>'full_name',60),''),'여행자');
 insert into public.tripkku_trip_members(trip_id,user_id,display_name)
 values(v_id,auth.uid(),v_name) on conflict(trip_id,user_id) do nothing;
 return v_id;
end $$;
revoke all on function public.tripkku_join_trip(text) from public;
grant execute on function public.tripkku_join_trip(text) to authenticated;

create or replace function public.tripkku_save_trip(p_id uuid,p_data jsonb,p_revision integer)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_revision integer;
begin
 if auth.uid() is null or not public.tripkku_is_member(p_id) then raise exception 'ACCESS_DENIED'; end if;
 if p_data is null or length(p_data::text)>350000 then raise exception 'INVALID_DATA_SIZE'; end if;
 update public.tripkku_trips
 set data=p_data,revision=revision+1,updated_at=now()
 where id=p_id and revision=p_revision returning revision into v_revision;
 if v_revision is null then raise exception 'TRIPKKU_VERSION_CONFLICT'; end if;
 return v_revision;
end $$;
revoke all on function public.tripkku_save_trip(uuid,jsonb,integer) from public;
grant execute on function public.tripkku_save_trip(uuid,jsonb,integer) to authenticated;

-- Personal expenses and files are never placed into the shared trip JSON.
create table if not exists public.tripkku_private_expenses (
 id uuid primary key default gen_random_uuid(),
 trip_id uuid not null references public.tripkku_trips(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null, amount numeric(14,2) not null check (amount>0),
 currency text not null, category text not null default '기타',
 expense_date date, created_at timestamptz not null default now()
);
create index if not exists tripkku_private_expenses_owner_idx on public.tripkku_private_expenses(trip_id,user_id);
alter table public.tripkku_private_expenses enable row level security;
revoke all on public.tripkku_private_expenses from anon, authenticated;
grant select,insert,update,delete on public.tripkku_private_expenses to authenticated;
drop policy if exists tripkku_private_expenses_select on public.tripkku_private_expenses;
create policy tripkku_private_expenses_select on public.tripkku_private_expenses for select to authenticated
 using(user_id=(select auth.uid()));
drop policy if exists tripkku_private_expenses_insert on public.tripkku_private_expenses;
create policy tripkku_private_expenses_insert on public.tripkku_private_expenses for insert to authenticated
 with check(user_id=(select auth.uid()) and public.tripkku_is_member(trip_id));
drop policy if exists tripkku_private_expenses_update on public.tripkku_private_expenses;
create policy tripkku_private_expenses_update on public.tripkku_private_expenses for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and public.tripkku_is_member(trip_id));
drop policy if exists tripkku_private_expenses_delete on public.tripkku_private_expenses;
create policy tripkku_private_expenses_delete on public.tripkku_private_expenses for delete to authenticated
 using(user_id=(select auth.uid()));

create table if not exists public.tripkku_private_files (
 id uuid primary key default gen_random_uuid(),
 trip_id uuid not null references public.tripkku_trips(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 path text not null unique, display_name text not null, mime_type text not null,
 size_bytes bigint not null check(size_bytes between 1 and 15728640),
 created_at timestamptz not null default now()
);
create index if not exists tripkku_private_files_owner_idx on public.tripkku_private_files(trip_id,user_id);
alter table public.tripkku_private_files enable row level security;
revoke all on public.tripkku_private_files from anon, authenticated;
grant select,insert,update,delete on public.tripkku_private_files to authenticated;
drop policy if exists tripkku_private_files_select on public.tripkku_private_files;
create policy tripkku_private_files_select on public.tripkku_private_files for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists tripkku_private_files_insert on public.tripkku_private_files;
create policy tripkku_private_files_insert on public.tripkku_private_files for insert to authenticated
 with check(user_id=(select auth.uid()) and public.tripkku_is_member(trip_id)
  and split_part(path,'/',1)=(select auth.uid())::text and split_part(path,'/',2)=trip_id::text);
drop policy if exists tripkku_private_files_update on public.tripkku_private_files;
create policy tripkku_private_files_update on public.tripkku_private_files for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and public.tripkku_is_member(trip_id)
  and split_part(path,'/',1)=(select auth.uid())::text and split_part(path,'/',2)=trip_id::text);
drop policy if exists tripkku_private_files_delete on public.tripkku_private_files;
create policy tripkku_private_files_delete on public.tripkku_private_files for delete to authenticated using(user_id=(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('tripkku-next-files','tripkku-next-files',false,15728640,
 array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do nothing;
drop policy if exists tripkku_next_storage_read on storage.objects;
create policy tripkku_next_storage_read on storage.objects for select to authenticated
 using(bucket_id='tripkku-next-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists tripkku_next_storage_write on storage.objects;
create policy tripkku_next_storage_write on storage.objects for insert to authenticated
 with check(bucket_id='tripkku-next-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists tripkku_next_storage_delete on storage.objects;
create policy tripkku_next_storage_delete on storage.objects for delete to authenticated
 using(bucket_id='tripkku-next-files' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Server-side daily per-user AI request budget (not an absolute billing cap).
create table if not exists public.tripkku_ai_quota (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_day date not null default current_date,
 kind text not null, used integer not null default 0,
 primary key(user_id,request_day,kind)
);
alter table public.tripkku_ai_quota enable row level security;
revoke all on public.tripkku_ai_quota from anon,authenticated;
create or replace function public.tripkku_ai_allow(p_kind text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_used integer; v_limit integer;
begin
 if auth.uid() is null then return false; end if;
 v_limit:=case p_kind when 'plan' then 12 when 'chat' then 50 when 'translate' then 120 when 'detect-country' then 15 else 0 end;
 if v_limit=0 then return false; end if;
 insert into public.tripkku_ai_quota(user_id,request_day,kind,used)
 values(auth.uid(),current_date,p_kind,1)
 on conflict(user_id,request_day,kind)
 do update set used=public.tripkku_ai_quota.used+1 where public.tripkku_ai_quota.used<v_limit
 returning used into v_used;
 return v_used is not null;
end $$;
revoke all on function public.tripkku_ai_allow(text) from public;
grant execute on function public.tripkku_ai_allow(text) to authenticated;

-- Optional Realtime: try to add this new table only, ignore when already published.
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tripkku_trips') then
  alter publication supabase_realtime add table public.tripkku_trips;
 end if;
exception when undefined_object or insufficient_privilege then
 raise notice 'Realtime publication skipped; enable tripkku_trips in Dashboard later';
end $$;
