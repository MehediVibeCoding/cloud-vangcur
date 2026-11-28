// 🧪 vangcur-api টেস্ট — চালান: `node workers/api/test.mjs` (Node ≥ 22.18; নেটওয়ার্ক/সিক্রেট লাগে না, সব fetch মক করা)।
// মূল ফাইলের সাথে মিল: ফোন-ফাংশন দুটো মূল lib/security.ts ও lib/checkoutData.ts থেকে সোর্স-টেক্সট বের করে তুলনা করা হয়।
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { handle, normalizeBdPhone, validatePhone, toIndexProduct, resetMemory } from './src/handlers.js';

if (!crypto.subtle.timingSafeEqual) crypto.subtle.timingSafeEqual = (a, b) => timingSafeEqual(Buffer.from(a), Buffer.from(b));

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function extractFn(file, name) {
  const src = readFileSync(join(root, file), 'utf8');
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} পাওয়া যায়নি ${file}-এ`);
  const open = src.indexOf('{', src.indexOf(')', start));
  let depth = 0, end = open;
  for (; end < src.length; end++) {
    if (src[end] === '{') depth++;
    else if (src[end] === '}' && --depth === 0) break;
  }
  const js = src.slice(start, end + 1)
    .replace(/\(([^)]*)\)\s*:\s*[A-Za-z<>\[\]| ]+\s*\{/, (_, a) => `(${a.replace(/:\s*[A-Za-z<>\[\]| ]+/g, '')}) {`);
  return js;
}
const origBn = new Function(`${extractFn('lib/security.ts', 'bnDigitsToEn')}; return bnDigitsToEn;`)();
const origNorm = new Function('bnDigitsToEn', `${extractFn('lib/security.ts', 'normalizeBdPhone')}; return normalizeBdPhone;`)(origBn);
const origValid = new Function(`${extractFn('lib/checkoutData.ts', 'validatePhone')}; return validatePhone;`)();

const PHONES = ['01712345678', '+8801712345678', '8801712345678', '008801712345678', '+880 01712345678', '০১৭১২৩৪৫৬৭৮', '01712-345678', '01111111111', '01700000000', '0171234567', '1712345678', '017123456789', '', 'abc', '01812345678', '01388888888', '01787654321'];
test('ফোন নর্মালাইজ/ভ্যালিডেট মূল কোডের সাথে হুবহু মেলে', () => {
  for (const p of PHONES) {
    assert.equal(normalizeBdPhone(p), origNorm(p), `normalize ${p}`);
    const n = origNorm(p);
    assert.equal(validatePhone(n), origValid(n), `validate ${n}`);
  }
});

const ctxOf = () => { const pending = []; return { waitUntil: (p) => pending.push(p), settle: () => Promise.all(pending), pending }; };
const req = (path, init = {}) => new Request(`https://vangcur.com${path}`, init);
const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; resetMemory(); });

const ORDER = { record: { order_num: 'VC-1001', customer_name: 'রাফি', customer_email: 'a@b.com', customer_phone: '01712345678', items: [{ name: 'Lamp', qty: 2, price: 500 }], shipping_cost: 70, total: 1070, advance_paid: 200, created_at: '2026-11-27T00:00:00Z' } };
test('order-email: সিক্রেট ভুল/নেই → 401', async () => {
  const env = { WEBHOOK_SECRET: 'sss', BREVO_API_KEY: 'xkeysib-1' };
  assert.equal((await handle(req('/api/order-email', { method: 'POST', body: '{}' }), env, ctxOf())).status, 401);
  assert.equal((await handle(req('/api/order-email', { method: 'POST', body: '{}', headers: { 'x-webhook-secret': 'wrong' } }), env, ctxOf())).status, 401);
  assert.equal((await handle(req('/api/order-email', { method: 'POST', body: '{}', headers: { 'x-webhook-secret': 'sss' } }), { BREVO_API_KEY: 'k' }, ctxOf())).status, 401); // সার্ভারে সিক্রেট নেই
});
test('order-email: GET → 405; বডি খারাপ → 400; record নেই → 400', async () => {
  const env = { WEBHOOK_SECRET: 'sss', BREVO_API_KEY: 'xkeysib-1' };
  const h = { 'x-webhook-secret': 'sss' };
  assert.equal((await handle(req('/api/order-email'), env, ctxOf())).status, 405);
  assert.equal((await handle(req('/api/order-email', { method: 'POST', body: 'xx', headers: h }), env, ctxOf())).status, 400);
  assert.equal((await handle(req('/api/order-email', { method: 'POST', body: '{}', headers: h }), env, ctxOf())).status, 400);
});
test('order-email: ইমেইল না থাকলে skipped; SMTP কী হলে 500; সফলে Brevo-তে সঠিক পেলোড', async () => {
  const h = { 'x-webhook-secret': 'sss' };
  const noEmail = await handle(req('/api/order-email', { method: 'POST', headers: h, body: JSON.stringify({ record: { id: 1 } }) }), { WEBHOOK_SECRET: 'sss' }, ctxOf());
  assert.deepEqual(await noEmail.json(), { ok: true, skipped: 'no valid email' });
  const smtp = await handle(req('/api/order-email', { method: 'POST', headers: h, body: JSON.stringify(ORDER) }), { WEBHOOK_SECRET: 'sss', BREVO_API_KEY: 'xsmtpsib-1' }, ctxOf());
  assert.equal(smtp.status, 500);
  let sent;
  globalThis.fetch = async (url, init) => { sent = { url, init }; return new Response('{}', { status: 201 }); };
  const ok = await handle(req('/api/order-email', { method: 'POST', headers: h, body: JSON.stringify(ORDER) }), { WEBHOOK_SECRET: 'sss', BREVO_API_KEY: 'xkeysib-1' }, ctxOf());
  assert.deepEqual(await ok.json(), { ok: true });
  assert.equal(sent.url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(sent.init.headers['api-key'], 'xkeysib-1');
  const body = JSON.parse(sent.init.body);
  assert.equal(body.to[0].email, 'a@b.com');
  assert.equal(body.sender.email, 'invoice@vangcur.com');
  assert.ok(body.subject.includes('VC-1001'));
  assert.ok(body.htmlContent.includes('Balance Amount') && body.htmlContent.includes('870৳')); // 1070 − 200
  assert.ok(body.textContent.includes('Balance Amount: 870৳'));
  globalThis.fetch = async () => new Response('err', { status: 400 });
  const bad = await handle(req('/api/order-email', { method: 'POST', headers: h, body: JSON.stringify(ORDER) }), { WEBHOOK_SECRET: 'sss', BREVO_API_KEY: 'xkeysib-1' }, ctxOf());
  assert.equal(bad.status, 502);
});

test('lead: খারাপ ফোন → 400; বডি নেই → 400', async () => {
  const c = ctxOf();
  const bad = await handle(req('/api/lead', { method: 'POST', body: JSON.stringify({ phone: '123' }), headers: { 'cf-connecting-ip': '1.1.1.1' } }), {}, c);
  assert.equal(bad.status, 400);
  const none = await handle(req('/api/lead', { method: 'POST', body: 'nope', headers: { 'cf-connecting-ip': '1.1.1.2' } }), {}, c);
  assert.equal(none.status, 400);
});
test('lead: সফল ড্রাফট → Hub-এ সঠিক HMAC ও ফিল্ডসহ forward', async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return new Response('{}', { status: 200 }); };
  const env = { RECOVERY_HUB_BASE_URL: 'https://hub.example/', RECOVERY_HUB_INGEST_KEY: 'ik', RECOVERY_HUB_HMAC_SECRET: 'hs' };
  const c = ctxOf();
  const res = await handle(req('/api/lead', { method: 'POST', headers: { 'cf-connecting-ip': '2.2.2.2' }, body: JSON.stringify({ phone: '+8801719876543', name: 'রাফি', dist: 'ঢাকা', total: 999, items: 'Lamp x1\n', leadId: 'L1' }) }), env, c);
  assert.deepEqual(await res.json(), { ok: true });
  await c.settle();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://hub.example/api/ingest/draft');
  const h = calls[0].init.headers;
  const expectSig = createHmac('sha256', 'hs').update(`${h['x-timestamp']}.${calls[0].init.body}`).digest('hex');
  assert.equal(h['x-signature'], expectSig);
  assert.equal(h['x-api-key'], 'ik');
  const b = JSON.parse(calls[0].init.body);
  assert.equal(b.phone, '01719876543');
  assert.equal(b.session_id, 'L1');
  assert.equal(b.notes, 'Lamp x1');
  assert.equal(b.cart_total, 999);
  assert.equal(b.currency, 'BDT');
  assert.ok(Number.isInteger(b.hour_of_day) && b.hour_of_day >= 0 && b.hour_of_day < 24);
});
test('lead: স্টক-রিকোয়েস্ট → /api/ingest/stock', async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return new Response('{}'); };
  const env = { RECOVERY_HUB_BASE_URL: 'https://hub.example', RECOVERY_HUB_INGEST_KEY: 'ik', RECOVERY_HUB_HMAC_SECRET: 'hs' };
  const c = ctxOf();
  await handle(req('/api/lead', { method: 'POST', headers: { 'cf-connecting-ip': '3.3.3.3' }, body: JSON.stringify({ action: 'addStockRequest', mobileNumber: '01719876543', productId: '5', productName: 'P' }) }), env, c);
  await c.settle();
  assert.equal(calls[0].url, 'https://hub.example/api/ingest/stock');
  assert.deepEqual(calls[0].body, { product_id: '5', product_name: 'P', phone: '01719876543' });
});
test('lead: একই আইপি থেকে ২১তম রিকোয়েস্ট → 429 (Upstash ছাড়া মেমোরি-ফলব্যাকে)', async () => {
  const c = ctxOf();
  let last;
  for (let i = 0; i < 21; i++) last = await handle(req('/api/lead', { method: 'POST', headers: { 'cf-connecting-ip': '9.9.9.9' }, body: JSON.stringify({ phone: '123' }) }), {}, c);
  assert.equal(last.status, 429);
  assert.ok(Number(last.headers.get('retry-after')) >= 1);
});
test('lead: Upstash চালু থাকলে Lua EVAL ডাকে ও allowed=0 হলে 429', async () => {
  const seen = [];
  globalThis.fetch = async (url, init) => { seen.push({ url, body: JSON.parse(init.body) }); return new Response(JSON.stringify({ result: [0, 0] }), { status: 200 }); };
  const res = await handle(req('/api/lead', { method: 'POST', headers: { 'cf-connecting-ip': '8.8.8.8' }, body: '{}' }), { UPSTASH_REDIS_REST_URL: 'https://r.example', UPSTASH_REDIS_REST_TOKEN: 't' }, ctxOf());
  assert.equal(res.status, 429);
  assert.equal(seen[0].body[0], 'EVAL');
  assert.ok(seen[0].body[3].startsWith('vc:rl:sw:{lead:8.8.8.8}:'));
});

test('device-id: কুকি না থাকলে নতুন সেট; থাকলে সেট করে না; ?id= গ্রহণ', async () => {
  const a = await handle(req('/api/device-id'), {}, ctxOf());
  const sc = a.headers.get('set-cookie');
  assert.match(sc, /^vc_device_id=[a-f0-9]{32}; Path=\/; Max-Age=31536000; SameSite=Lax; Secure$/);
  assert.equal(a.headers.get('cache-control'), 'no-store');
  const id = 'abcdefghijklmnop1234';
  const b = await handle(req('/api/device-id', { headers: { cookie: `x=1; vc_device_id=${id}` } }), {}, ctxOf());
  assert.equal(b.headers.get('set-cookie'), null);
  const c = await handle(req(`/api/device-id?id=${id}`), {}, ctxOf());
  assert.ok(c.headers.get('set-cookie').startsWith(`vc_device_id=${id};`));
  const d = await handle(req('/api/device-id?id=short'), {}, ctxOf());
  assert.ok(!d.headers.get('set-cookie').includes('short'));
});

const ROW = (i, extra = {}) => ({ id: i, cat: 'rgb', cats: ['rgb', 'lamps'], name: `P${i}`, name_bn: 'প', price: '500', old: null, stock: 3, badge: 'new', warranty: ' 1y ', rating: null, brand: 'B', specs: JSON.stringify({ Power: '5W', _profit: '120', _discount_color: 'red' }), img0: i === 2 ? null : `https://img/${i}.jpg`, ...extra });
test('search-index: ম্যাপিং (প্রাইভেট _কী বাদ, ডিফল্ট মান, ছবি ফলব্যাক) ও ক্যাশ-হেডার', async () => {
  const urls = [];
  globalThis.fetch = async (url) => { urls.push(String(url)); return new Response(JSON.stringify([ROW(1), ROW(2)]), { status: 200 }); };
  const res = await handle(req('/api/search-index'), { SUPABASE_URL: 'https://s.example', SUPABASE_ANON_KEY: 'k' }, ctxOf());
  assert.equal(res.headers.get('cache-control'), 'public, max-age=60, s-maxage=3600, stale-while-revalidate=300');
  const { products } = await res.json();
  assert.equal(products.length, 2);
  const p = products[0];
  assert.deepEqual(p.specs, { Power: '5W' });
  assert.ok(!JSON.stringify(p).includes('_profit'));
  assert.equal(p.discountColor, 'red');
  assert.equal(p.price, 500);
  assert.equal(p.old, 500);       // old নেই → price
  assert.equal(p.rating, 4.5);    // rating নেই → ৪.৫
  assert.equal(p.warranty, '1y');
  assert.deepEqual(p.imgs, ['https://img/1.jpg']);
  assert.deepEqual(products[1].imgs, ['📦']);
  assert.equal(p.desc, '');
  assert.equal(p._detailLoaded, false);
  assert.ok(!('tags' in p));
  const u = new URL(urls[0]);
  assert.equal(u.pathname, '/rest/v1/custom_products');
  assert.equal(u.searchParams.get('select'), 'id,cat,cats,name,name_bn,price,old,stock,badge,warranty,rating,specs,brand,img0:imgs->0');
  assert.equal(u.searchParams.get('order'), 'sort_order.asc,id.asc');
});
test('search-index: ১০০০-এর বেশি সারিতে পাতা ধরে আনে; ?প্যারাম থাকলে no-store', async () => {
  const offsets = [];
  globalThis.fetch = async (url) => {
    const o = Number(new URL(url).searchParams.get('offset'));
    offsets.push(o);
    const n = o === 0 ? 1000 : 5;
    return new Response(JSON.stringify(Array.from({ length: n }, (_, i) => ROW(o + i))), { status: 200 });
  };
  const env = { SUPABASE_URL: 'https://s.example', SUPABASE_ANON_KEY: 'k' };
  const res = await handle(req('/api/search-index?x=1'), env, ctxOf());
  assert.equal((await res.json()).products.length, 1005);
  assert.deepEqual(offsets, [0, 1000]);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});
test('search-index: Supabase ব্যর্থ → খালি + no-store; আগের মেমোরি থাকলে পুরনোটা + no-store', async () => {
  globalThis.fetch = async () => new Response('x', { status: 500 });
  const env = { SUPABASE_URL: 'https://s.example', SUPABASE_ANON_KEY: 'k' };
  const r1 = await handle(req('/api/search-index'), env, ctxOf());
  assert.deepEqual(await r1.json(), { products: [] });
  assert.equal(r1.headers.get('cache-control'), 'no-store');
});

test('অন্য পাথ → 404 JSON', async () => {
  assert.equal((await handle(req('/api/other'), {}, ctxOf())).status, 404);
});
