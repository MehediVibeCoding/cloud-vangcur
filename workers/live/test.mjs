// স্থানীয় যাচাই: `node workers/live/test.mjs` — Supabase নকল করে Worker-এর আচরণ মেলায়।
// (cloudflare:workers মডিউল নকল করা হয়েছে; আসল রানটাইম নয়, শুধু যুক্তি যাচাই।)
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('./src/index.js', import.meta.url), 'utf8').replace(
  "import { WorkerEntrypoint } from 'cloudflare:workers';",
  'class WorkerEntrypoint { constructor(ctx, env){ this.ctx = ctx; this.env = env; } }',
);
const tmp = new URL('./.test-tmp.mjs', import.meta.url);
writeFileSync(tmp, src);
const mod = await import(tmp.href);
const Live = mod.default;

let calls = 0;
let fail = false;
let rows = [
  { id: 1, price: '100', old: null, stock: 5, badge: 'hot', cat: 'rgb', cats: ['rgb', 'lamp'] },
  { id: 2, price: 250, old: 300, stock: 0, badge: null, cat: 'lamp', cats: null },
  { id: 3, price: null, old: null, stock: null, badge: '', cat: null, cats: [] },
];
globalThis.fetch = async (url) => {
  calls++;
  if (fail) return new Response('x', { status: 500 });
  const u = new URL(url);
  const off = Number(u.searchParams.get('offset'));
  return new Response(JSON.stringify(off === 0 ? rows : []), { status: 200 });
};

const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k' };
const call = async (path) => {
  const w = new Live({ cache: { purge: async () => ({}) } }, env);
  const res = await w.fetch(new Request('https://vangcur.com' + path));
  return { res, body: await res.json() };
};

// ১) সব প্রোডাক্ট + রূপান্তর
let r = await call('/api/live-products');
assert.equal(r.res.status, 200);
assert.equal(r.body.total, 3);
assert.deepEqual(r.body.items[0], { id: 1, price: 100, old: 100, stock: 5, badge: 'hot' });
assert.deepEqual(r.body.items[1], { id: 2, price: 250, old: 300, stock: 0, badge: '' });
assert.deepEqual(r.body.items[2], { id: 3, price: 0, old: 0, stock: 0, badge: '' });
assert.match(r.res.headers.get('cache-control'), /s-maxage=300/);
assert.equal(r.res.headers.get('x-served-by'), 'vangcur-live');

// ২) ক্যাটাগরি: cats থাকলে cats দিয়ে, না থাকলে cat দিয়ে; cat ফাঁকা হলে 'rgb'
r = await call('/api/live-products?cat=lamp');
assert.deepEqual(r.body.items.map((i) => i.id), [1, 2]);
r = await call('/api/live-products?cat=rgb');
assert.deepEqual(r.body.items.map((i) => i.id), [1, 3]);
assert.equal(r.body.total, 2);

// ৩) অজানা ক্যাটাগরি → ফাঁকা + no-store; অবৈধ → ৪০০
r = await call('/api/live-products?cat=nope');
assert.equal(r.body.items.length, 0);
assert.equal(r.res.headers.get('cache-control'), 'no-store');
r = await call('/api/live-products?cat=BAD%20CAT');
assert.equal(r.res.status, 400);

// ৪) ids (পুরনো ক্লায়েন্ট)
r = await call('/api/live-products?ids=2,3');
assert.deepEqual(r.body.items.map((i) => i.id), [2, 3]);
assert.equal(r.body.total, 3);
r = await call('/api/live-products?ids=%24%24');
assert.equal(r.res.status, 400);

// ৫) অচেনা প্যারামিটার → ক্যাশে বসে না
r = await call('/api/live-products?x=1');
assert.equal(r.res.headers.get('cache-control'), 'no-store');

// ৬) ভুল পাথ/মেথড
r = await call('/api/live-products-x');
assert.equal(r.res.status, 404);
{
  const w = new Live({}, env);
  const res = await w.fetch(new Request('https://vangcur.com/api/live-products', { method: 'POST' }));
  assert.equal(res.status, 405);
}

// ৭) মেমরি-ক্যাশ: এতগুলো রিকোয়েস্টে Supabase কল ১টাই (+ঝুঁকি নেই)
assert.equal(calls, 1, `Supabase কল ১টা হওয়ার কথা, হয়েছে ${calls}`);

// ৮) ব্যর্থতা: মেমরি পুরনো হলে ব্যর্থ-ফলব্যাকে পুরনো সারি + no-store
{
  const w = new Live({ cache: { purge: async () => ({}) } }, env);
  await w.purge(); // মেমরি পুরনো ঘোষণা
  fail = true;
  const res = await w.fetch(new Request('https://vangcur.com/api/live-products'));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
}

// ৯) purge()
{
  let purged = null;
  const w = new Live({ cache: { purge: async (o) => { purged = o; return { success: true }; } } }, env);
  const out = await w.purge();
  assert.equal(out.ok, true);
  assert.deepEqual(purged, { purgeEverything: true });
}

console.log('✅ সব যাচাই পাস');
