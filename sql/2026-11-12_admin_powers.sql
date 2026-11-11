-- ─────────────────────────────────────────────────────────────
-- 트립꾸 · 관리자 전체 권한 (2026-11-12)
-- Supabase Dashboard → SQL Editor 에 붙여넣고 한 번 실행. 여러 번 실행해도 안전.
--
-- tripkku_beta_admins 에 등록된 관리자는 모든 여행에서 만든 사람과 같은 권한을 가진다.
--   · 참여자 내보내기 (만든 사람은 제외)
--   · 여행 삭제
-- 관리자 여부는 오직 서버 테이블로 판단한다(이메일·localStorage 사용 안 함).
-- ─────────────────────────────────────────────────────────────

create or replace function public.tripkku_is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.tripkku_beta_admins where user_id = auth.uid());
$$;
revoke all on function public.tripkku_is_admin() from public, anon;
grant execute on function public.tripkku_is_admin() to authenticated;

-- 1) 관리자: 참여자 내보내기
create or replace function public.tripkku_admin_remove_member(p_trip uuid, p_member uuid)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
  if not public.tripkku_is_admin() then raise exception 'NOT_ADMIN'; end if;
  if exists (select 1 from public.tripkku_trips where id = p_trip and owner_id = p_member) then
    raise exception 'CANNOT_REMOVE_OWNER';
  end if;
  delete from public.tripkku_private_files    where trip_id = p_trip and user_id = p_member;
  delete from public.tripkku_private_expenses where trip_id = p_trip and user_id = p_member;
  delete from public.tripkku_trip_preferences where trip_id = p_trip and user_id = p_member;
  delete from public.tripkku_trip_members     where trip_id = p_trip and user_id = p_member;
  return true;
end $$;
revoke all on function public.tripkku_admin_remove_member(uuid, uuid) from public, anon;
grant execute on function public.tripkku_admin_remove_member(uuid, uuid) to authenticated;

-- 2) 여행 삭제: 만든 사람 또는 관리자
create or replace function public.tripkku_delete_trip(p_trip uuid)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'LOGIN_REQUIRED'; end if;
  if not exists (select 1 from public.tripkku_trips where id = p_trip and owner_id = v_uid)
     and not public.tripkku_is_admin() then
    raise exception 'NOT_OWNER';
  end if;
  begin
    delete from storage.objects
     where bucket_id = 'tripkku-next-files'
       and (storage.foldername(name))[1] = p_trip::text;
  exception when others then null;
  end;
  delete from public.tripkku_trips where id = p_trip;
  return true;
end $$;
revoke all on function public.tripkku_delete_trip(uuid) from public, anon;
grant execute on function public.tripkku_delete_trip(uuid) to authenticated;

select proname from pg_proc
 where proname in ('tripkku_is_admin','tripkku_admin_remove_member','tripkku_delete_trip');
