-- Run in Supabase SQL Editor. Requires existing public.is_trip_member(uuid).
create table if not exists public.trip_reels (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  url text not null,
  title text not null,
  place_name text not null default '',
  category text not null default 'other' check (category in ('food','place','other')),
  thumbnail_url text,
  caption text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists trip_reels_trip_id_idx on public.trip_reels(trip_id);
alter table public.trip_reels enable row level security;
drop policy if exists trip_reels_read on public.trip_reels;
create policy trip_reels_read on public.trip_reels for select to authenticated using (public.is_trip_member(trip_id) or exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select auth.uid())));
drop policy if exists trip_reels_insert on public.trip_reels;
create policy trip_reels_insert on public.trip_reels for insert to authenticated with check (created_by=(select auth.uid()) and (public.is_trip_member(trip_id) or exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select auth.uid()))));
drop policy if exists trip_reels_update on public.trip_reels;
create policy trip_reels_update on public.trip_reels for update to authenticated using (public.is_trip_member(trip_id) or exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select auth.uid()))) with check (public.is_trip_member(trip_id) or exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select auth.uid())));
drop policy if exists trip_reels_delete on public.trip_reels;
create policy trip_reels_delete on public.trip_reels for delete to authenticated using (created_by=(select auth.uid()) or exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select auth.uid())));
