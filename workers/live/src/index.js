// 🏷️ vangcur-live — শুধু `/api/live-products` চালানোর ছোট Worker।
//
// কেন আলাদা: প্রোডাক্ট-পেজ প্রতি ১০ মিনিটে এই এন্ডপয়েন্ট ডাকে (দাম/স্টক/ব্যাজ রিফ্রেশ)। আগে এটা মূল Worker-এর
// (Next.js/OpenNext, বড় বান্ডল) ভেতর দিয়ে যেত — কোল্ড-স্টার্ট ও CPU মূল Worker-এর ঘাড়ে। এখন এটা নিজের ছোট
// Worker-এ (কোনো ফ্রেমওয়ার্ক/লাইব্রেরি নেই, শুধু fetch), মূল Worker এই রিকোয়েস্টে জাগেই না।
//
// 🔌 সংযোগ: Cloudflare Route `vangcur.com/api/live-products*` → এই Worker (Route Custom Domain-এর ওপরে প্রাধান্য পায়)।
//    ফ্রন্টএন্ডের URL অপরিবর্তিত। রোলব্যাক: ওই Route মুছলেই রিকোয়েস্ট আবার মূল Worker-এর পুরনো রুটে যায়।
//
// ⚡ ক্যাশ: Workers Caching (wrangler `cache.enabled`) — `Cache-Control: s-maxage=300` দেখে Cloudflare নিজেই ৫ মিনিট রাখে,
//    ক্যাশ-হিটে এই কোড চলেই না। ক্যাশ-মিসে সবার আগে Worker-এর মেমরির (১৫ সেকেন্ড) ডেটা, না থাকলে Supabase REST।
//    ক্যাশ-কী ঘেঁটে দেওয়ার (random `?x=`) আক্রমণে তাই ডাটাবেজে চাপ পড়ে না।
// 🧹 পার্জ: মূল Worker অ্যাডমিন-বদলে `env.LIVE_WORKER.purge()` (Service Binding RPC) ডাকে — এটা পাবলিক URL নয়,
//    বাইরে থেকে কেউ ডাকতে পারে না। (RPC না পৌঁছালেও সর্বোচ্চ ৫ মিনিটে নিজে ঠিক হয়।)
// 🛡️ আসল দাম/স্টক চেকআউটে সার্ভার-সাইডে ডাটাবেজ থেকেই যাচাই হয় — এটা শুধু পেজের UI তাজা রাখে।
//
// আচরণ হুবহু আগের app/api/live-products/route.ts + lib/liveProducts.ts-এর মতো (JSON আকার, ক্যাটাগরি-নিয়ম, ইনপুট যাচাই)।

import { WorkerEntrypoint } from 'cloudflare:workers';

const PAGE = 1000; // PostgREST-এর একবারে সর্বোচ্চ সারি
const MAX_ROWS = 50000; // অসীম লুপের বিরুদ্ধে সুরক্ষা
const MEMORY_FRESH_MS = 15000;
const FETCH_TIMEOUT_MS = 4000;
const CAT_RE = /^[a-z0-9_-]{1,40}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const ALLOWED_PARAMS = new Set(['cat', 'ids']);

const CACHEABLE = 'public, max-age=60, s-maxage=300';
const NO_STORE = 'no-store';

// Worker-আইসোলেটের মেমরি (একই আইসোলেটে পরপর রিকোয়েস্টের মধ্যে ভাগ হয়)
const mem = { rows: null, at: 0, inflight: null };

/** lib/liveProducts.ts-এর রূপান্তরের হুবহু একই: দাম/স্টক সংখ্যা, old না থাকলে দাম, cat ফাঁকা হলে 'rgb' */
function normalize(r) {
  const cat = r.cat || 'rgb';
  return {
    id: r.id,
    price: Number(r.price) || 0,
    old: Number(r.old) || Number(r.price) || 0,
    stock: r.stock !== undefined && r.stock !== null ? Number(r.stock) : 0,
    badge: r.badge || '',
    cat,
    cats: Array.isArray(r.cats) && r.cats.length ? r.cats : [cat],
  };
}

/** lib/productData.ts-এর prodInCat-এর হুবহু একই নিয়ম */
function inCat(row, catId) {
  const target = String(catId || '').trim().toLowerCase();
  if (!target || target === 'all') return true;
  if (Array.isArray(row.cats) && row.cats.length) {
    return row.cats.some((c) => String(c || '').trim().toLowerCase() === target);
  }
  return String(row.cat || '').trim().toLowerCase() === target;
}

function toLive(r) {
  return { id: r.id, price: r.price, old: r.old, stock: r.stock, badge: r.badge };
}

async function fetchAllRows(env) {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error('supabase env missing');
  const out = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const url = `${base}/rest/v1/custom_products?select=id,price,old,stock,badge,cat,cats&order=id.asc&limit=${PAGE}&offset=${from}`;
    const res = await fetch(url, {
      headers: { apikey: key, authorization: `Bearer ${key}`, accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`supabase ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('bad payload');
    for (const r of data) out.push(normalize(r));
    if (data.length < PAGE) return out;
  }
  throw new Error('too many rows');
}

/** ব্যর্থ হলে আগের (পুরনো) সারি থাকলে সেটা দিয়ে `stale: true`; কিছুই না থাকলে throw */
async function loadRows(env) {
  if (mem.rows && Date.now() - mem.at < MEMORY_FRESH_MS) return { rows: mem.rows, stale: false };
  if (!mem.inflight) {
    mem.inflight = fetchAllRows(env)
      .then((rows) => {
        mem.rows = rows;
        mem.at = Date.now();
        return rows;
      })
      .finally(() => {
        mem.inflight = null;
      });
  }
  try {
    return { rows: await mem.inflight, stale: false };
  } catch (err) {
    if (mem.rows) return { rows: mem.rows, stale: true };
    throw err;
  }
}

function json(body, status, cacheControl) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      'x-served-by': 'vangcur-live',
    },
  });
}

async function handle(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ items: [], total: 0 }, 405, NO_STORE);
  }
  const url = new URL(request.url);
  if (url.pathname !== '/api/live-products' && url.pathname !== '/api/live-products/') {
    return json({ items: [], total: 0 }, 404, NO_STORE);
  }

  const params = url.searchParams;
  // অচেনা প্যারামিটার (`?x=random`) দিয়ে ক্যাশ-এন্ট্রি বাড়ানো ঠেকাতে: উত্তর ঠিকই যায়, কিন্তু ক্যাশে বসে না
  let unknownParam = false;
  for (const k of params.keys()) if (!ALLOWED_PARAMS.has(k)) unknownParam = true;

  const idsParam = params.get('ids') || '';
  const catParam = (params.get('cat') || '').trim().toLowerCase();
  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter((s) => ID_RE.test(s))
    .slice(0, 60);

  // `ids` দেওয়া হয়েছে কিন্তু একটাও বৈধ নয় → ৪০০
  if (idsParam && !ids.length) return json({ items: [], total: 0 }, 400, NO_STORE);
  if (catParam && !CAT_RE.test(catParam)) return json({ items: [], total: 0 }, 400, NO_STORE);

  let loaded;
  try {
    loaded = await loadRows(env);
  } catch {
    return json({ items: [], total: 0 }, 503, NO_STORE);
  }
  const { rows, stale } = loaded;
  const ok = (unknownParam || stale) ? NO_STORE : CACHEABLE; // পুরনো-ফলব্যাক উত্তর কখনো ক্যাশে বসে না

  if (catParam) {
    const items = rows.filter((r) => inCat(r, catParam)).map(toLive);
    // অজানা/খালি ক্যাটাগরিতে no-store — ইচ্ছেমতো `?cat=` বানিয়ে ক্যাশ ভরানো যাবে না
    return json({ items, total: items.length }, 200, items.length ? ok : NO_STORE);
  }

  const all = rows.map(toLive);
  const wanted = new Set(ids);
  const items = ids.length ? all.filter((p) => wanted.has(String(p.id))) : all;
  return json({ items, total: all.length }, 200, ok);
}

export default class extends WorkerEntrypoint {
  async fetch(request) {
    return handle(request, this.env);
  }

  /**
   * মূল Worker `env.LIVE_WORKER.purge()` দিয়ে ডাকে (Service Binding RPC — পাবলিক HTTP-তে পৌঁছায় না)।
   * এই Worker-এর পুরো এজ-ক্যাশ মোছে। সারি-মেমরি ১৫ সেকেন্ডের বেশি টেকে না, তাই আলাদা করে মোছা হয় না।
   */
  async purge() {
    mem.at = 0;
    try {
      await this.ctx.cache.purge({ purgeEverything: true });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }
}
