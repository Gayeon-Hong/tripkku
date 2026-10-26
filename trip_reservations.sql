-- Execute once in the Supabase SQL Editor. RLS stays ON.
create table if not exists public.trip_reservations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  kind text not null check (kind in ('flight','hotel')),
  provider text not null check(length(provider)<=150),
  start_date text not null default '' check(length(start_date)<=30),
  end_date text not null default '' check(length(end_date)<=30),
  time_info text not null default '' check(length(time_info)<=90),
  route_info text not null default '' check(length(route_info)<=180),
  price_info text not null default '' check(length(price_info)<=90),
  notes text not null default '' check(length(notes)<=500),
  created_at timestamptz not null default now()
);
alter table public.trip_reservations enable row level security;
create policy trip_reservations_select on public.trip_reservations for select to authenticated using (public.is_trip_member(trip_id) or exists(select 1 from public.trips where id=trip_id and owner_id=(select auth.uid())));
create policy trip_reservations_insert on public.trip_reservations for insert to authenticated with check (created_by=(select auth.uid()) and (public.is_trip_member(trip_id) or exists(select 1 from public.trips where id=trip_id and owner_id=(select auth.uid()))));
create policy trip_reservations_delete on public.trip_reservations for delete to authenticated using (created_by=(select auth.uid()) or exists(select 1 from public.trips where id=trip_id and owner_id=(select auth.uid())));
