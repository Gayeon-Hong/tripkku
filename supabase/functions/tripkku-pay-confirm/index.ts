// 트립꾸 · 토스페이먼츠 결제 승인 (Supabase Edge Function)
// 비밀 값(Supabase → Edge Functions → Secrets): TOSS_SECRET_KEY  ← 토스페이먼츠 시크릿 키. 저장소에는 절대 넣지 않는다.
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY 는 Supabase 가 자동으로 넣어 준다.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const ALLOW = ['https://gayeon-hong.github.io'];
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOW.includes(origin) ? origin : ALLOW[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});
const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return json({ ok: false, why: 'method' }, 405, origin);
  try {
    const secret = Deno.env.get('TOSS_SECRET_KEY');
    if (!secret) return json({ ok: false, why: 'not_configured' }, 500, origin);
    const url = Deno.env.get('SUPABASE_URL')!;
    // 1) 누가 요청했는지 확인(로그인 토큰)
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: who } = await asUser.auth.getUser();
    if (!who?.user) return json({ ok: false, why: 'login' }, 401, origin);
    const { paymentKey, orderId, amount } = await req.json();
    if (typeof paymentKey !== 'string' || typeof orderId !== 'string' || !/^tk_[0-9a-f]{32}$/.test(orderId)) return json({ ok: false, why: 'bad_request' }, 400, origin);
    // 2) 서버에 저장해 둔 주문과 비교(주문자·금액). 결제창에서 금액이 바뀌었으면 여기서 막힌다.
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: order } = await admin.from('tripkku_orders').select('order_id,user_id,amount,status').eq('order_id', orderId).maybeSingle();
    if (!order || order.user_id !== who.user.id) return json({ ok: false, why: 'no_order' }, 404, origin);
    if (Number(amount) !== order.amount) return json({ ok: false, why: 'amount_mismatch' }, 400, origin);
    // 3) 아직 승인 전이면 토스페이먼츠에 승인 요청
    if (order.status !== 'paid') {
      const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa(secret + ':'), 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentKey, orderId, amount: order.amount }),
      });
      const pay = await res.json().catch(() => ({}));
      if (!res.ok || pay.status !== 'DONE' || pay.totalAmount !== order.amount) {
        await admin.from('tripkku_orders').update({ status: 'failed' }).eq('order_id', orderId).eq('status', 'ready');
        return json({ ok: false, why: 'confirm_failed', code: pay.code ?? null, message: pay.message ?? null }, 402, origin);
      }
    }
    // 4) 쿠폰 넣기(같은 주문으로 두 번 들어가지 않는다)
    const { data: done, error } = await admin.rpc('tripkku_order_fulfill', { p_order: orderId, p_payment_key: paymentKey });
    if (error) return json({ ok: false, why: 'fulfill_failed', message: error.message }, 500, origin);
    return json(done, 200, origin);
  } catch (e) {
    return json({ ok: false, why: 'error', message: String((e as Error)?.message ?? e) }, 500, origin);
  }
});
