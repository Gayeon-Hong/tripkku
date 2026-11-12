// 트립꾸 · 푸시 알림 보내기 (Supabase Edge Function)
// 비밀 값(Supabase → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  ← next/vapid.html 에서 만든 한 쌍. 비밀 키는 저장소·채팅에 올리지 않는다.
//   VAPID_SUBJECT                        ← 'mailto:문의 이메일'
// 앱은 "무슨 일이 있었는지(kind)"와 여행 id 만 보낸다. 누구에게 무슨 글을 보낼지는 여기(서버)에서 정한다
// → 앱을 고쳐서 아무에게나 아무 글을 보내는 것을 막는다.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import webpush from 'npm:web-push@3.6.7';

const ALLOW = ['https://gayeon-hong.github.io'];
const APP = 'https://gayeon-hong.github.io/tripkku/next/';
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOW.includes(origin) ? origin : ALLOW[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});
const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } });
// kind 별: 받는 사람, 같은 알림 사이 최소 간격(분)
const KINDS: Record<string, { to: 'admins' | 'members' | 'owner'; gap: number }> = {
  new_trip: { to: 'admins', gap: 0 },          // 새 여행이 등록됨 → 관리자
  detail_request: { to: 'admins', gap: 0 },    // 디테일 제작 요청 → 관리자
  member_joined: { to: 'owner', gap: 0 },      // 초대로 새 일행이 들어옴 → 여행 만든 사람
  trip_update: { to: 'members', gap: 30 },     // 일정이 바뀜 → 다른 일행 (30분에 한 번)
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return json({ ok: false, why: 'method' }, 405, origin);
  try {
    const pub = Deno.env.get('VAPID_PUBLIC_KEY'), priv = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!pub || !priv) return json({ ok: false, why: 'not_configured' }, 500, origin);
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:000000000078@naver.com', pub, priv);
    const url = Deno.env.get('SUPABASE_URL')!;
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: who } = await asUser.auth.getUser();
    if (!who?.user) return json({ ok: false, why: 'login' }, 401, origin);
    const me = who.user.id;
    const { kind, tripId } = await req.json();
    const rule = KINDS[kind];
    if (!rule || typeof tripId !== 'string' || !/^[0-9a-f-]{36}$/.test(tripId)) return json({ ok: false, why: 'bad_request' }, 400, origin);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: trip } = await admin.from('tripkku_trips').select('id,title,owner_id').eq('id', tripId).maybeSingle();
    if (!trip) return json({ ok: false, why: 'no_trip' }, 404, origin);
    const { data: members } = await admin.from('tripkku_trip_members').select('user_id,display_name').eq('trip_id', tripId);
    const ids = new Set<string>([trip.owner_id, ...(members ?? []).map((m) => m.user_id)]);
    if (!ids.has(me)) return json({ ok: false, why: 'not_member' }, 403, origin);   // 그 여행 사람만 알림을 일으킬 수 있다
    const myName = (members ?? []).find((m) => m.user_id === me)?.display_name || '일행';

    // 너무 자주 보내지 않기: 한 사람이 1시간에 30번까지, kind 별 최소 간격
    const hourAgo = new Date(Date.now() - 3600e3).toISOString();
    const { count: mine } = await admin.from('tripkku_push_log').select('id', { count: 'exact', head: true }).eq('sender', me).gt('created_at', hourAgo);
    if ((mine ?? 0) >= 30) return json({ ok: true, sent: 0, why: 'rate' }, 200, origin);
    if (rule.gap) {
      const since = new Date(Date.now() - rule.gap * 60e3).toISOString();
      const { count } = await admin.from('tripkku_push_log').select('id', { count: 'exact', head: true }).eq('kind', kind).eq('trip_id', tripId).gt('created_at', since);
      if ((count ?? 0) > 0) return json({ ok: true, sent: 0, why: 'recent' }, 200, origin);
    }

    let to: string[] = [];
    if (rule.to === 'admins') { const { data } = await admin.from('tripkku_beta_admins').select('user_id'); to = (data ?? []).map((r) => r.user_id); }
    else if (rule.to === 'owner') to = [trip.owner_id];
    else to = [...ids];
    to = to.filter((id) => id !== me);
    await admin.from('tripkku_push_log').insert({ kind, trip_id: tripId, sender: me });
    if (!to.length) return json({ ok: true, sent: 0 }, 200, origin);

    const title = String(trip.title || '여행').slice(0, 40);
    const msg = {
      new_trip: { title: '새 여행이 등록됐어요', body: `${myName} · ${title}` },
      detail_request: { title: '디테일 제작 요청이 왔어요', body: `${myName} · ${title}` },
      member_joined: { title: '새 일행이 들어왔어요', body: `${myName}님이 "${title}"에 참여했어요` },
      trip_update: { title: `"${title}" 일정이 바뀌었어요`, body: `${myName}님이 일정을 고쳤어요` },
    }[kind as string]!;
    const payload = JSON.stringify({ ...msg, url: APP, tag: kind + ':' + tripId });

    const { data: subs } = await admin.from('tripkku_push_subscriptions').select('endpoint,p256dh,auth').in('user_id', to);
    let sent = 0;
    await Promise.all((subs ?? []).map(async (s) => {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 }); sent++; }
      catch (e) { const code = (e as { statusCode?: number })?.statusCode; if (code === 404 || code === 410) await admin.from('tripkku_push_subscriptions').delete().eq('endpoint', s.endpoint); }
    }));
    return json({ ok: true, sent }, 200, origin);
  } catch (e) {
    return json({ ok: false, why: 'error', message: String((e as Error)?.message ?? e) }, 500, origin);
  }
});
