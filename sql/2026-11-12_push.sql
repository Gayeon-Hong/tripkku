-- ─────────────────────────────────────────────────────────────
-- 트립꾸 · 푸시 알림 (2026-11-12) — 4단계
-- Supabase Dashboard → SQL Editor 에 붙여넣고 한 번 실행. 여러 번 실행해도 안전.
--
-- 기기마다 "알림 받기"를 누르면 그 기기의 수신 주소가 여기에 저장된다.
-- 보내는 일은 Edge Function(tripkku-push)만 한다.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.tripkku_push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists tripkku_push_user_idx on public.tripkku_push_subscriptions(user_id);
alter table public.tripkku_push_subscriptions enable row level security;
drop policy if exists tripkku_push_read_own on public.tripkku_push_subscriptions;
create policy tripkku_push_read_own on public.tripkku_push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.tripkku_push_subscriptions from anon, authenticated;

-- 같은 알림이 너무 자주 가지 않게 기록
create table if not exists public.tripkku_push_log (
  id         bigint generated always as identity primary key,
  kind       text not null,
  trip_id    uuid,
  sender     uuid,
  created_at timestamptz not null default now()
);
create index if not exists tripkku_push_log_idx on public.tripkku_push_log(kind, trip_id, created_at desc);
alter table public.tripkku_push_log enable row level security;  -- 정책 없음: 서버만 사용

create or replace function public.tripkku_push_subscribe(p_endpoint text, p_p256dh text, p_auth text)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'LOGIN_REQUIRED'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then raise exception 'BAD_SUBSCRIPTION'; end if;
  -- 한 사람당 기기 10대까지
  if (select count(*) from public.tripkku_push_subscriptions where user_id = v_uid and endpoint <> p_endpoint) >= 10 then
    delete from public.tripkku_push_subscriptions where endpoint = (select endpoint from public.tripkku_push_subscriptions where user_id = v_uid order by created_at limit 1);
  end if;
  insert into public.tripkku_push_subscriptions(endpoint, user_id, p256dh, auth) values (p_endpoint, v_uid, p_p256dh, p_auth)
    on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
  return true;
end $$;
revoke all on function public.tripkku_push_subscribe(text, text, text) from public, anon;
grant execute on function public.tripkku_push_subscribe(text, text, text) to authenticated;

create or replace function public.tripkku_push_unsubscribe(p_endpoint text)
returns boolean
language sql security definer set search_path = public, pg_temp as $$
  delete from public.tripkku_push_subscriptions where endpoint = p_endpoint and user_id = auth.uid() returning true;
$$;
revoke all on function public.tripkku_push_unsubscribe(text) from public, anon;
grant execute on function public.tripkku_push_unsubscribe(text) to authenticated;

select proname from pg_proc where proname in ('tripkku_push_subscribe','tripkku_push_unsubscribe');
