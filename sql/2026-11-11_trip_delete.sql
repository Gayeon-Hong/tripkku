-- ─────────────────────────────────────────────────────────────
-- 트립꾸 · 여행 삭제 / 나가기 (2026-11-11)
-- Supabase Dashboard → SQL Editor 에 붙여넣고 한 번 실행하면 끝.
-- 여러 번 실행해도 안전하다(정책·함수를 새로 만든다).
--
-- 왜 필요한가:
--   앱의 '삭제·나가기'는 처음에 Edge Function(tripkku-trip-actions)을 부르도록
--   만들어졌지만 그 함수가 배포되지 않아 늘 실패했다. 이 SQL은 그 자리를
--   RLS 안에서 동작하는 함수 두 개로 대신한다.
-- ─────────────────────────────────────────────────────────────

-- 1) 만든 사람이 자기 여행을 지울 수 있게 (행 단위 보안 + 권한)
alter table public.tripkku_trips enable row level security;
drop policy if exists tripkku_trips_delete_owner on public.tripkku_trips;
create policy tripkku_trips_delete_owner on public.tripkku_trips
  for delete to authenticated
  using (owner_id = (select auth.uid()));
grant delete on public.tripkku_trips to authenticated;

-- 2) 참여자가 스스로 나갈 수 있게 (자기 멤버 행만)
alter table public.tripkku_trip_members enable row level security;
drop policy if exists tripkku_members_delete_self on public.tripkku_trip_members;
create policy tripkku_members_delete_self on public.tripkku_trip_members
  for delete to authenticated
  using (user_id = (select auth.uid()));
grant delete on public.tripkku_trip_members to authenticated;

-- 3) 앱이 먼저 호출하는 삭제 함수 (소유자만)
create or replace function public.tripkku_delete_trip(p_trip uuid)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'LOGIN_REQUIRED'; end if;
  if not exists (select 1 from public.tripkku_trips where id = p_trip and owner_id = v_uid) then
    raise exception 'NOT_OWNER';
  end if;

  -- 개인 예약 파일은 스토리지 객체까지 정리 (실패해도 행 삭제는 계속)
  begin
    delete from storage.objects
     where bucket_id = 'tripkku-next-files'
       and (storage.foldername(name))[1] = p_trip::text;
  exception when others then null;
  end;

  delete from public.tripkku_trips where id = p_trip and owner_id = v_uid;
  return true;
end $$;
revoke all on function public.tripkku_delete_trip(uuid) from public, anon;
grant execute on function public.tripkku_delete_trip(uuid) to authenticated;

-- 4) 앱이 먼저 호출하는 나가기 함수 (참여자만 · 만든 사람은 '삭제')
create or replace function public.tripkku_leave_trip(p_trip uuid)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'LOGIN_REQUIRED'; end if;
  if exists (select 1 from public.tripkku_trips where id = p_trip and owner_id = v_uid) then
    raise exception 'OWNER_MUST_DELETE';
  end if;

  delete from public.tripkku_private_files   where trip_id = p_trip and user_id = v_uid;
  delete from public.tripkku_private_expenses where trip_id = p_trip and user_id = v_uid;
  delete from public.tripkku_trip_members     where trip_id = p_trip and user_id = v_uid;
  delete from public.tripkku_trip_preferences where trip_id = p_trip and user_id = v_uid;
  return true;
end $$;
revoke all on function public.tripkku_leave_trip(uuid) from public, anon;
grant execute on function public.tripkku_leave_trip(uuid) to authenticated;

-- 확인: 두 함수가 보이면 성공
select proname, pg_get_function_identity_arguments(oid) as args
  from pg_proc
 where proname in ('tripkku_delete_trip','tripkku_leave_trip');
