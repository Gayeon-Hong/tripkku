-- ─────────────────────────────────────────────────────────────
-- 트립꾸 · 쿠폰 결제 (2026-11-12) — 수익화 3단계 (토스페이먼츠, 웹·MS 앱)
-- Supabase Dashboard → SQL Editor 에 붙여넣고 한 번 실행. 여러 번 실행해도 안전.
-- 먼저 sql/2026-11-12_coupons.sql 이 실행되어 있어야 한다.
--
-- 흐름: 앱이 tripkku_order_create 로 주문을 만든다(가격은 서버가 정함)
--      → 토스페이먼츠 결제창 → 돌아오면 Edge Function(tripkku-pay-confirm)이
--        금액을 확인하고 토스에 승인을 요청한 뒤 tripkku_order_fulfill 로 쿠폰을 넣는다.
-- 쿠폰을 넣는 함수는 서버(service_role)만 부를 수 있다.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.tripkku_orders (
  order_id    text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  product     text not null,
  amount      int  not null,
  coupons     int  not null,
  status      text not null default 'ready',   -- ready | paid | failed
  payment_key text,
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);
create index if not exists tripkku_orders_user_idx on public.tripkku_orders(user_id);
alter table public.tripkku_orders enable row level security;
drop policy if exists tripkku_orders_read_own on public.tripkku_orders;
create policy tripkku_orders_read_own on public.tripkku_orders for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.tripkku_orders from anon, authenticated;

-- 주문 만들기: 상품과 가격은 여기(서버)에서만 정한다
create or replace function public.tripkku_order_create(p_product text)
returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_amount int; v_coupons int; v_name text; v_id text;
begin
  if v_uid is null then raise exception 'LOGIN_REQUIRED'; end if;
  if p_product = 'coupon1' then v_amount := 1000; v_coupons := 1; v_name := '트립꾸 영상 저장 쿠폰 1장';
  elsif p_product = 'coupon3' then v_amount := 3000; v_coupons := 3; v_name := '트립꾸 영상 저장 쿠폰 3장';
  else raise exception 'BAD_PRODUCT'; end if;
  -- 한 사람이 1시간에 주문을 20개 넘게 만들 수 없다
  if (select count(*) from public.tripkku_orders where user_id = v_uid and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'TOO_MANY_ORDERS';
  end if;
  v_id := 'tk_' || replace(gen_random_uuid()::text, '-', '');
  insert into public.tripkku_orders(order_id, user_id, product, amount, coupons) values (v_id, v_uid, p_product, v_amount, v_coupons);
  return json_build_object('orderId', v_id, 'amount', v_amount, 'orderName', v_name);
end $$;
revoke all on function public.tripkku_order_create(text) from public, anon;
grant execute on function public.tripkku_order_create(text) to authenticated;

-- 결제 승인 뒤 쿠폰 넣기: Edge Function(service_role)만 호출
create or replace function public.tripkku_order_fulfill(p_order text, p_payment_key text)
returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare o public.tripkku_orders; v_bal int;
begin
  select * into o from public.tripkku_orders where order_id = p_order for update;
  if not found then raise exception 'NO_ORDER'; end if;
  if o.status <> 'paid' then
    update public.tripkku_orders set status = 'paid', payment_key = p_payment_key, paid_at = now() where order_id = p_order;
    insert into public.tripkku_coupon_ledger(user_id, delta, reason, ref) values (o.user_id, o.coupons, 'purchase', o.order_id)
      on conflict (user_id, reason, ref) do nothing;
  end if;
  select coalesce(sum(delta), 0) into v_bal from public.tripkku_coupon_ledger where user_id = o.user_id;
  return json_build_object('ok', true, 'balance', v_bal, 'coupons', o.coupons);
end $$;
revoke all on function public.tripkku_order_fulfill(text, text) from public, anon, authenticated;
grant execute on function public.tripkku_order_fulfill(text, text) to service_role;

select proname from pg_proc where proname in ('tripkku_order_create','tripkku_order_fulfill');
