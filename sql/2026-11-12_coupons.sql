-- ─────────────────────────────────────────────────────────────
-- 트립꾸 · 영상 저장 쿠폰 (2026-11-12) — 수익화 1단계
-- Supabase Dashboard → SQL Editor 에 붙여넣고 한 번 실행. 여러 번 실행해도 안전.
-- 먼저 sql/2026-11-12_admin_powers.sql 이 실행되어 있어야 한다(tripkku_is_admin 사용).
--
-- 규칙
--   · 영상 만들기·미리보기는 무료. 저장(파일 만들기)·공유할 때 쿠폰 1장.
--   · 가입하면 1장, 내가 만든 여행에 "새로 가입한 사람"이 초대로 들어오면 1장.
--   · 한 번 쿠폰을 쓴 영상(같은 여행·같은 범위)은 다시 받아도 무료.
--   · 트립꾸 관리자는 쿠폰 없이 무제한.
--   · 쿠폰 내역은 서버에만 있고, 앱은 읽기만 한다(직접 넣거나 고칠 수 없음).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.tripkku_coupon_ledger (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  delta      int  not null,                 -- +1 지급, -1 사용
  reason     text not null,                 -- signup | invite | video | purchase | admin
  ref        text not null default '',      -- invite: 초대받은 사람 id, video: 영상 키
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)             -- 같은 이유로 두 번 지급·차감되지 않게
);
create index if not exists tripkku_coupon_user_idx on public.tripkku_coupon_ledger(user_id);

create table if not exists public.tripkku_video_grants (
  user_id    uuid not null references auth.users(id) on delete cascade,
  video_key  text not null,                 -- '<trip_id>|trip' 또는 '<trip_id>|day|<날짜>'
  created_at timestamptz not null default now(),
  primary key (user_id, video_key)
);

alter table public.tripkku_coupon_ledger enable row level security;
alter table public.tripkku_video_grants  enable row level security;
drop policy if exists tripkku_coupon_read_own on public.tripkku_coupon_ledger;
create policy tripkku_coupon_read_own on public.tripkku_coupon_ledger for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists tripkku_grant_read_own on public.tripkku_video_grants;
create policy tripkku_grant_read_own on public.tripkku_video_grants for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.tripkku_coupon_ledger, public.tripkku_video_grants from anon, authenticated;

-- 잔액 보기(처음 부를 때 가입 쿠폰 1장을 준다)
create or replace function public.tripkku_coupon_balance()
returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_bal int;
begin
  if v_uid is null then raise exception 'LOGIN_REQUIRED'; end if;
  insert into public.tripkku_coupon_ledger(user_id, delta, reason, ref) values (v_uid, 1, 'signup', '')
    on conflict (user_id, reason, ref) do nothing;
  select coalesce(sum(delta), 0) into v_bal from public.tripkku_coupon_ledger where user_id = v_uid;
  return json_build_object('balance', v_bal, 'admin', public.tripkku_is_admin());
end $$;
revoke all on function public.tripkku_coupon_balance() from public, anon;
grant execute on function public.tripkku_coupon_balance() to authenticated;

-- 영상 저장 허가: 관리자·이미 받은 영상은 무료, 아니면 쿠폰 1장 차감
create or replace function public.tripkku_video_unlock(p_trip uuid, p_key text)
returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_bal int; v_key text;
begin
  if v_uid is null then raise exception 'LOGIN_REQUIRED'; end if;
  if p_key is null or length(p_key) > 40 or p_key !~ '^(trip|day\|[0-9]{4}-[0-9]{2}-[0-9]{2})$' then raise exception 'BAD_KEY'; end if;
  if not exists (select 1 from public.tripkku_trips t where t.id = p_trip and (t.owner_id = v_uid
       or exists (select 1 from public.tripkku_trip_members m where m.trip_id = t.id and m.user_id = v_uid)))
     and not public.tripkku_is_admin() then
    raise exception 'NOT_MEMBER';
  end if;
  v_key := p_trip::text || '|' || p_key;
  if public.tripkku_is_admin() then return json_build_object('ok', true, 'why', 'admin'); end if;
  if exists (select 1 from public.tripkku_video_grants where user_id = v_uid and video_key = v_key) then
    return json_build_object('ok', true, 'why', 'again');
  end if;
  insert into public.tripkku_coupon_ledger(user_id, delta, reason, ref) values (v_uid, 1, 'signup', '')
    on conflict (user_id, reason, ref) do nothing;
  -- 같은 사람이 동시에 여러 번 눌러도 한 번씩만 처리
  perform pg_advisory_xact_lock(hashtext(v_uid::text));
  select coalesce(sum(delta), 0) into v_bal from public.tripkku_coupon_ledger where user_id = v_uid;
  if v_bal < 1 then return json_build_object('ok', false, 'why', 'no_coupon', 'balance', v_bal); end if;
  insert into public.tripkku_coupon_ledger(user_id, delta, reason, ref) values (v_uid, -1, 'video', v_key);
  insert into public.tripkku_video_grants(user_id, video_key) values (v_uid, v_key) on conflict do nothing;
  return json_build_object('ok', true, 'why', 'coupon', 'balance', v_bal - 1);
end $$;
revoke all on function public.tripkku_video_unlock(uuid, text) from public, anon;
grant execute on function public.tripkku_video_unlock(uuid, text) to authenticated;

-- 초대 보상: 내가 만든 여행에 "가입한 지 7일 안 된 새 계정"이 들어오면 만든 사람에게 1장.
-- 같은 사람으로는 한 번만, 하루 3장·한 달 10장까지.
create or replace function public.tripkku_invite_reward()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_owner uuid; v_new boolean; v_day int; v_month int;
begin
  select owner_id into v_owner from public.tripkku_trips where id = new.trip_id;
  if v_owner is null or v_owner = new.user_id then return new; end if;
  select (created_at > now() - interval '7 days') into v_new from auth.users where id = new.user_id;
  if not coalesce(v_new, false) then return new; end if;
  select count(*) filter (where created_at > now() - interval '1 day'),
         count(*) filter (where created_at > now() - interval '30 days')
    into v_day, v_month
    from public.tripkku_coupon_ledger where user_id = v_owner and reason = 'invite';
  if v_day >= 3 or v_month >= 10 then return new; end if;
  insert into public.tripkku_coupon_ledger(user_id, delta, reason, ref) values (v_owner, 1, 'invite', new.user_id::text)
    on conflict (user_id, reason, ref) do nothing;
  return new;
exception when others then return new;  -- 보상 계산이 실패해도 여행 참여는 막지 않는다
end $$;
drop trigger if exists tripkku_invite_reward_trg on public.tripkku_trip_members;
create trigger tripkku_invite_reward_trg after insert on public.tripkku_trip_members
  for each row execute function public.tripkku_invite_reward();

select proname from pg_proc where proname in ('tripkku_coupon_balance','tripkku_video_unlock','tripkku_invite_reward');
