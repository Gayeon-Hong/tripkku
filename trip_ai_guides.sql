-- Tripkku 여행별 AI 추천 가이드: 기존 정책을 끄지 않습니다.
create table if not exists public.trip_ai_guides (
 trip_id uuid primary key references public.trips(id) on delete cascade,
 guide jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.trip_ai_guides enable row level security;
drop policy if exists trip_ai_guides_read on public.trip_ai_guides;
create policy trip_ai_guides_read on public.trip_ai_guides for select to authenticated
 using (exists(select 1 from public.trips t where t.id=trip_id and (t.owner_id=(select auth.uid()) or public.is_trip_member(t.id))));
drop policy if exists trip_ai_guides_write on public.trip_ai_guides;
create policy trip_ai_guides_write on public.trip_ai_guides for insert to authenticated
 with check (exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select auth.uid())));
drop policy if exists trip_ai_guides_update on public.trip_ai_guides;
create policy trip_ai_guides_update on public.trip_ai_guides for update to authenticated
 using (exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select auth.uid())))
 with check (exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select auth.uid())));
