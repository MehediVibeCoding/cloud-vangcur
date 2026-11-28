// 🧪 vangcur-api টেস্ট (বিকাশ-ওয়েবহুক ও গেম-স্কোর) — চালান: `node --test workers/api/test.mjs workers/api/test.payments.mjs` (Node ≥ 22.18; সব fetch মক)।
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { handle, resetMemory } from './src/handlers.js';

if (!crypto.subtle.timingSafeEqual) crypto.subtle.timingSafeEqual = (a, b) => timingSafeEqual(Buffer.from(a), Buffer.from(b));
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ctxOf = () => { const pending = []; return { waitUntil: (p) => pending.push(p), settle: () => Promise.all(pending), pending }; };
const req = (path, init = {}) => new Request(`https://vangcur.com${path}`, init);
const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; resetMemory(); });

// ── bkash-webhook ──
const BK_ENV = { BKASH_WEBHOOK_SECRET: 'bk', SUPABASE_URL: 'https://s.example', SUPABASE_SERVICE_ROLE_KEY: 'svc', TELEGRAM_BOT_TOKEN: 'tg', TELEGRAM_CHAT_ID: 'c1' };
const SMS = 'You have received Tk 1,200.00 from 01712349876. Fee Tk 0.00. TrxID ABC12345XY at 27/11/2026';
const bk = (body, headers = { 'x-bkash-secret': 'bk' }) => req('/api/bkash-webhook', { method: 'POST', headers, body: JSON.stringify(body) });
test('bkash: সিক্রেট ভুল → 401; GET → 405; খারাপ বডি → 400', async () => {
  assert.equal((await handle(bk({ from: 'bKash', text: SMS }, {}), BK_ENV, ctxOf())).status, 401);
  assert.equal((await handle(bk({ from: 'bKash', text: SMS }, { 'x-bkash-secret': 'no' }), BK_ENV, ctxOf())).status, 401);
  assert.equal((await handle(req('/api/bkash-webhook'), BK_ENV, ctxOf())).status, 405);
  assert.equal((await handle(req('/api/bkash-webhook', { method: 'POST', headers: { 'x-bkash-secret': 'bk' }, body: 'zz' }), BK_ENV, ctxOf())).status, 400);
});
test('bkash: বিকাশ নয়/টাকা বেশি/প্যাটার্ন না মিললে ignored (DB-তে কিছু যায় না)', async () => {
  let called = 0;
  globalThis.fetch = async () => { called++; return new Response('{}'); };
  for (const b of [{ from: 'Nagad', text: SMS }, { from: 'bKash', text: 'hello' }, { from: 'bKash', text: SMS.replace('1,200.00', '9,000.00') }, { from: 'bKash', text: 'You have received Tk 100 from abc' }]) {
    assert.deepEqual(await (await handle(bk(b), BK_ENV, ctxOf())).json(), { ok: true, ignored: true });
  }
  assert.equal(called, 0);
});
test('bkash: inbox-এ ঢোকে → TrxID ও last4 দিয়ে অর্ডার খোঁজে → ম্যাচ হলে RPC + Telegram', async () => {
  const log = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    log.push({ m: init.method || 'GET', path: u.pathname, q: u.searchParams, body: init.body, h: init.headers });
    if (u.pathname === '/rest/v1/bkash_inbox') return new Response('', { status: 201 });
    if (u.pathname === '/rest/v1/orders') {
      return new Response(JSON.stringify(u.searchParams.get('payment_txn') ? [{ id: 'o2', order_num: 'VC-2', created_at: '2026-11-27T02:00:00Z', total: 2000, advance_paid: 1200, customer_name: 'রাফি', customer_phone: '017' }]
        : [{ id: 'o1', order_num: 'VC-1', created_at: '2026-11-27T01:00:00Z', total: 900, advance_paid: 300 }, { id: 'o2', order_num: 'VC-2', created_at: '2026-11-27T02:00:00Z', total: 2000, advance_paid: 1200, customer_name: 'রাফি', customer_phone: '017' }]), { status: 200 });
    }
    if (u.pathname === '/rest/v1/rpc/match_bkash_payment') {
      const id = JSON.parse(init.body).p_order_id;
      return new Response(JSON.stringify(id === 'o1' ? { success: false } : { success: true, method: 'auto_trxid', amount: 1200, overpaid: 0, sender: '01712349876', trx_id: 'ABC12345XY' }), { status: 200 });
    }
    if (u.hostname === 'api.telegram.org') return new Response('{}', { status: 200 });
    throw new Error('অপ্রত্যাশিত ' + url);
  };
  const res = await handle(bk({ from: 'bKash', text: SMS }), BK_ENV, ctxOf());
  assert.deepEqual(await res.json(), { ok: true, recorded: true });
  const ins = log.find((l) => l.path === '/rest/v1/bkash_inbox');
  assert.deepEqual(JSON.parse(ins.body), { trx_id: 'ABC12345XY', sender_number: '01712349876', sender_last4: '9876', amount: 1200, raw_sms: SMS, is_used: false });
  assert.equal(ins.h.apikey, 'svc');
  const orders = log.filter((l) => l.path === '/rest/v1/orders');
  assert.equal(orders.length, 2);
  assert.equal(orders[0].q.get('payment_txn'), 'ilike.ABC12345XY');
  assert.equal(orders[0].q.get('status'), 'eq.pending');
  assert.equal(orders[0].q.get('payment_verified'), 'eq.false');
  assert.ok(orders[0].q.get('created_at').startsWith('gte.'));
  assert.equal(orders[1].q.get('payment_last4'), 'eq.9876');
  const rpcs = log.filter((l) => l.path.endsWith('match_bkash_payment')).map((l) => JSON.parse(l.body).p_order_id);
  assert.deepEqual(rpcs, ['o1', 'o2']); // পুরনো আগে; o2 মিলতেই থামে (একই অর্ডার দুবার নয়)
  const tg = log.find((l) => l.path.includes('/sendMessage'));
  const msg = JSON.parse(tg.body);
  assert.equal(msg.chat_id, 'c1');
  assert.ok(msg.text.includes('Tnx Confirm') && msg.text.includes('VC-2') && msg.text.includes('৳800')); // বাকি COD = 2000 − 1200
});
test('bkash: ডুপ্লিকেট TrxID (23505) → ok+duplicate; অন্য DB এরর → 500 (ফরওয়ার্ডার রিট্রাই করবে)', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ code: '23505' }), { status: 409 });
  assert.deepEqual(await (await handle(bk({ from: 'bKash', text: SMS }), BK_ENV, ctxOf())).json(), { ok: true, duplicate: true });
  globalThis.fetch = async () => new Response(JSON.stringify({ code: 'XX', message: 'boom' }), { status: 500 });
  assert.equal((await handle(bk({ from: 'bKash', text: SMS }), BK_ENV, ctxOf())).status, 500);
  assert.equal((await handle(bk({ from: 'bKash', text: SMS }), { ...BK_ENV, SUPABASE_SERVICE_ROLE_KEY: '' }, ctxOf())).status, 500);
});

// ── game-score ──
const OID = '11111111-1111-4111-8111-111111111111';
const RUN = '22222222-2222-4222-8222-222222222222';
const GENV = { SUPABASE_URL: 'https://s.example', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'svc' };
const gs = (body, extra = {}) => req('/api/game-score', { method: 'POST', headers: { 'cf-connecting-ip': '5.5.5.' + (Math.random() * 200 | 0), ...extra }, body: JSON.stringify(body) });
const mainCalls = [];
const withMain = (extra = {}) => ({ ...GENV, ...extra, MAIN_WORKER: { fetch: async (r) => { mainCalls.push({ url: r.url, method: r.method, body: await r.text(), cookie: r.headers.get('cookie') }); return new Response('{"from":"main"}', { status: 200 }); } } });
test('game-score: GAME_IDS মূল lib/games.ts-এর সাথে মেলে', () => {
  const src = readFileSync(join(root, 'lib/games.ts'), 'utf8');
  const ids = [...src.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['stack-tower']);
});
test('game-score GET: টপ-৩ (service RPC); অচেনা গেম → 400; DB ব্যর্থ → 503; me=1 → মূল Worker', async () => {
  globalThis.fetch = async (url, init) => {
    assert.ok(String(url).endsWith('/rest/v1/rpc/get_leaderboard'));
    assert.deepEqual(JSON.parse(init.body), { p_game_id: 'stack-tower', p_limit: 3 });
    assert.equal(init.headers.apikey, 'svc');
    return new Response(JSON.stringify([{ rank: 1, player_name: 'রাফি', score: 90 }]), { status: 200 });
  };
  const r = await handle(req('/api/game-score?game=stack-tower', { headers: { 'cf-connecting-ip': '6.6.6.1' } }), GENV, ctxOf());
  assert.deepEqual(await r.json(), { ok: true, top: [{ rank: 1, name: 'রাফি', score: 90 }], me: null });
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal((await handle(req('/api/game-score?game=x', { headers: { 'cf-connecting-ip': '6.6.6.2' } }), GENV, ctxOf())).status, 400);
  globalThis.fetch = async () => new Response('x', { status: 500 });
  assert.equal((await handle(req('/api/game-score?game=stack-tower', { headers: { 'cf-connecting-ip': '6.6.6.3' } }), GENV, ctxOf())).status, 503);
  mainCalls.length = 0;
  const me = await handle(req('/api/game-score?game=stack-tower&me=1', { headers: { cookie: 'sb=1' } }), withMain(), ctxOf());
  assert.deepEqual(await me.json(), { from: 'main' });
  assert.equal(mainCalls[0].cookie, 'sb=1');
});
test('game-score POST: account/ফোন-নেই → মূল Worker-এ হুবহু বডি-কুকিসহ (ছোট Worker নিজে কিছু করে না)', async () => {
  globalThis.fetch = async () => { throw new Error('Supabase ডাকা উচিত না'); };
  mainCalls.length = 0;
  const b1 = { source: 'account', game: 'stack-tower', action: 'start' };
  assert.deepEqual(await (await handle(gs(b1, { cookie: 'sb=tok' }), withMain(), ctxOf())).json(), { from: 'main' });
  assert.equal(mainCalls[0].method, 'POST');
  assert.deepEqual(JSON.parse(mainCalls[0].body), b1);
  assert.equal(mainCalls[0].cookie, 'sb=tok');
  assert.deepEqual(await (await handle(gs({ game: 'stack-tower', orderId: OID, action: 'start' }), withMain(), ctxOf())).json(), { from: 'main' }); // ফোন নেই
  assert.equal((await handle(gs({ source: 'account' }), GENV, ctxOf())).status, 503); // MAIN_WORKER binding না থাকলে নিরাপদ 503
});
test('game-score POST: অর্ডার+ফোন মিললে start → run; submit → rank/top; ফোন না মিললে মূল Worker', async () => {
  const seen = [];
  globalThis.fetch = async (url, init) => {
    const name = new URL(url).pathname.split('/').pop();
    const args = JSON.parse(init.body);
    seen.push({ name, args, key: init.headers.apikey });
    if (name === 'get_guest_order') return new Response(JSON.stringify(args.p_phone === '01719876543' ? [{ id: OID }] : []), { status: 200 });
    if (name === 'start_game_run') return new Response(JSON.stringify(RUN), { status: 200 });
    if (name === 'submit_game_score_v2') return new Response(JSON.stringify([{ accepted: true, rank: 2, best: 70, is_world_record: false }]), { status: 200 });
    if (name === 'get_leaderboard') return new Response(JSON.stringify([{ rank: 1, player_name: 'A', score: 99 }]), { status: 200 });
    throw new Error('অপ্রত্যাশিত ' + name);
  };
  const start = await handle(gs({ action: 'start', game: 'stack-tower', orderId: OID, phone: '01719876543' }), withMain(), ctxOf());
  assert.deepEqual(await start.json(), { ok: true, run: RUN });
  const own = seen.find((s) => s.name === 'get_guest_order');
  assert.deepEqual(own.args, { p_id: OID, p_phone: '01719876543' });
  assert.equal(own.key, 'anon');
  assert.equal(seen.find((s) => s.name === 'start_game_run').key, 'svc');
  const sub = await handle(gs({ game: 'stack-tower', orderId: OID, phone: '01719876543', score: 70.9, run: RUN }), withMain(), ctxOf());
  assert.deepEqual(await sub.json(), { ok: true, accepted: true, rank: 2, best: 70, worldRecord: false, top: [{ rank: 1, name: 'A', score: 99 }] });
  assert.equal(seen.find((s) => s.name === 'submit_game_score_v2').args.p_score, 70);
  mainCalls.length = 0;
  const wrong = await handle(gs({ action: 'start', game: 'stack-tower', orderId: OID, phone: '01811111111' }), withMain(), ctxOf());
  assert.deepEqual(await wrong.json(), { from: 'main' });
});
test('game-score POST: খারাপ ইনপুট → 400; স্কোর-জমায় DB ব্যর্থ → 503; রেট-লিমিট → 429', async () => {
  globalThis.fetch = async (url) => {
    const name = new URL(url).pathname.split('/').pop();
    if (name === 'get_guest_order') return new Response(JSON.stringify([{ id: OID }]), { status: 200 });
    return new Response('x', { status: 500 });
  };
  const ok = { game: 'stack-tower', orderId: OID, phone: '01719876543' };
  assert.equal((await handle(gs({ ...ok, game: 'zzz' }), withMain(), ctxOf())).status, 400);
  assert.equal((await handle(gs({ ...ok, orderId: 'nope' }), withMain(), ctxOf())).status, 400);
  assert.equal((await handle(gs({ ...ok, score: 0, run: RUN }), withMain(), ctxOf())).status, 400);
  assert.equal((await handle(gs({ ...ok, score: 10, run: 'bad' }), withMain(), ctxOf())).status, 400);
  assert.equal((await handle(gs({ ...ok, score: 10, run: RUN }), withMain(), ctxOf())).status, 503);
  assert.equal((await handle(gs({ ...ok, action: 'start' }), withMain(), ctxOf())).status, 503);
  let last;
  for (let i = 0; i < 61; i++) last = await handle(req('/api/game-score', { method: 'POST', headers: { 'cf-connecting-ip': '7.7.7.7' }, body: JSON.stringify({ ...ok, action: 'start' }) }), withMain(), ctxOf());
  assert.equal(last.status, 429);
});
