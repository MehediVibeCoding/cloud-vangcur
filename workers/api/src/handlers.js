// 🧰 vangcur-api-র সব রুটের লজিক। `cloudflare:workers`-এর ওপর নির্ভর করে না, তাই Node-এ সরাসরি টেস্ট করা যায় (test.mjs)।
// আচরণ হুবহু আগের app/api/{order-email,lead,device-id,search-index}/route.ts-এর মতো — কোনো রুটের লজিক বদলাতে হলে
// আগে সেই পুরনো রুট দেখে নিন (ওগুলো রোলব্যাকের জন্য রিপোতে রাখা আছে, মুছবেন না)।
//

import { buildHtml, buildText, buildSubject } from '../../../lib/orderEmailTemplate.ts';

const NO_STORE = 'no-store';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const enc = new TextEncoder();

function json(body, status = 200, cacheControl = NO_STORE, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      'x-served-by': 'vangcur-api',
      ...extraHeaders,
    },
  });
}

/** সময়-নিরপেক্ষ তুলনা (Workers-এর crypto.subtle.timingSafeEqual); দৈর্ঘ্য আলাদা হলে সরাসরি false */
async function safeEqual(a, b) {
  if (!a || !b) return false;
  const A = enc.encode(String(a));
  const B = enc.encode(String(b));
  if (A.byteLength !== B.byteLength) return false;
  return crypto.subtle.timingSafeEqual(A, B);
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** lib/limiter.ts-এর getClientIp-এর হুবহু একই নিয়ম */
function getClientIp(headers) {
  const cf = headers.get('cf-connecting-ip');
  const fwd = headers.get('x-forwarded-for');
  return (cf ? cf.trim() : '') || (fwd ? fwd.split(',')[0].trim() : '') || '127.0.0.1';
}

const SLIDING_LUA = `
local curr = KEYS[1]
local prev = KEYS[2]
local limit = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local frac = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local c = tonumber(redis.call('GET', curr) or '0')
local p = tonumber(redis.call('GET', prev) or '0')
local used = p * (1 - frac) + c
local over
if cost == 0 then over = (used >= limit) else over = (used + cost > limit) end
if over then
  return {0, 0}
end
if cost > 0 then
  c = redis.call('INCRBY', curr, cost)
  if c == cost then redis.call('PEXPIRE', curr, windowMs * 2) end
  used = p * (1 - frac) + c
end
return {1, math.max(0, math.floor(limit - used))}
`;

const rl = { fails: 0, openUntil: 0, mem: new Map() };

function memSliding(key, limit, windowSec) {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  if (rl.mem.size > 4000) for (const [k, v] of rl.mem) if (now > v.resetAt) rl.mem.delete(k);
  const rec = rl.mem.get(key);
  if (!rec || now > rec.resetAt) {
    rl.mem.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (rec.count >= limit) return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((rec.resetAt - now) / 1000)) };
  rec.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

async function slidingWindowLimit(env, key, limit, windowSec) {
  const k = String(key).replace(/[\s\r\n]+/g, '_').slice(0, 160);
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || '';
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || '';
  if (url && token && Date.now() >= rl.openUntil) {
    try {
      const now = Date.now();
      const windowMs = windowSec * 1000;
      const id = Math.floor(now / windowMs);
      const frac = (now % windowMs) / windowMs;
      const keys = [`vc:rl:sw:{${k}}:${id}`, `vc:rl:sw:{${k}}:${id - 1}`];
      const args = [limit, windowMs, frac.toFixed(6), 1].map(String);
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['EVAL', SLIDING_LUA, String(keys.length), ...keys, ...args]),
        signal: AbortSignal.timeout(1200),
      });
      const data = await res.json();
      if (!res.ok || data.error || !Array.isArray(data.result)) throw new Error(data.error || `redis http ${res.status}`);
      rl.fails = 0;
      const ok = Number(data.result[0]) === 1;
      return { allowed: ok, retryAfterSec: ok ? 0 : Math.max(1, Math.ceil((windowMs - (now % windowMs)) / 1000)) };
    } catch {
      rl.fails += 1;
      if (rl.fails >= 3) rl.openUntil = Date.now() + 20000;
    }
  }
  return memSliding(k, limit, windowSec);
}

async function orderEmail(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405, NO_STORE, { allow: 'POST' });
  if (!(await safeEqual(request.headers.get('x-webhook-secret'), env.WEBHOOK_SECRET))) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  let o;
  try {
    o = (await request.json())?.record;
  } catch {
    return json({ ok: false, error: 'Bad request' }, 400);
  }
  if (!o) return json({ ok: false, error: 'record নেই' }, 400);

  const to = String(o.customer_email || '').trim();
  if (!to || !EMAIL_RE.test(to)) return json({ ok: true, skipped: 'no valid email' });

  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) return json({ ok: false, error: 'BREVO_API_KEY সেট করা নেই' }, 500);
  if (String(apiKey).startsWith('xsmtpsib-')) {
    console.error('BREVO_API_KEY হলো SMTP কী। Brevo → SMTP & API → API Keys থেকে নতুন API কী (xkeysib-...) বানান।');
    return json({ ok: false, error: 'BREVO_API_KEY SMTP কী — API কী লাগবে' }, 500);
  }

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Vangcur - ভাঙচুর', email: env.BREVO_INVOICE_SENDER || 'invoice@vangcur.com' },
        to: [{ email: to, name: o.customer_name || undefined }],
        replyTo: { email: env.BREVO_SUPPORT_SENDER || 'support@vangcur.com', name: 'Vangcur Support' },
        subject: buildSubject(o),
        htmlContent: buildHtml(o),
        textContent: buildText(o),
        tags: ['order-confirmation'],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      console.error('Brevo error', r.status, (await r.text().catch(() => '')).slice(0, 400));
      return json({ ok: false, status: r.status }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    console.error('Brevo fetch failed', e);
    return json({ ok: false, error: 'Brevo কল ব্যর্থ' }, 502);
  }
}

function bnDigitsToEn(value) {
  return value.replace(/[০-৯]/g, (ch) => String(ch.charCodeAt(0) - 0x09e6));
}
export function normalizeBdPhone(value) {
  let d = bnDigitsToEn(String(value ?? '')).replace(/\D/g, '');
  if (d.startsWith('00880')) d = d.slice(2);
  if (d.startsWith('8800') && d.length === 14) d = d.slice(3);
  else if (d.startsWith('880') && d.length === 13) d = d.slice(2);
  return d;
}
export function validatePhone(ph) {
  const phoneRegex = /^01[3-9]\d{8}$/;
  if (!phoneRegex.test(ph)) return false;
  const last8 = ph.slice(3);
  const allSame = last8.split('').every((c) => c === last8[0]);
  const isSeq = last8 === '12345678' || last8 === '87654321';
  return !(allSame || isSeq);
}

function sanitizeValue(val, maxLen = 100) {
  if (val === null || val === undefined) return '';
  return String(val).trim().slice(0, maxLen).replace(/[\t\r\n]/g, ' ');
}

let warnedHubUnconfigured = false;

/** lib/recoveryHub.ts-এর postToHub-এর মতোই: HMAC-SHA256(secret, `${timestamp}.${body}`) — best-effort, কখনো throw করে না */
async function postToHub(env, path, body, label) {
  const baseUrl = env.RECOVERY_HUB_BASE_URL;
  const apiKey = env.RECOVERY_HUB_INGEST_KEY;
  const secret = env.RECOVERY_HUB_HMAC_SECRET;
  if (!baseUrl || !apiKey || !secret) {
    if (!warnedHubUnconfigured) {
      warnedHubUnconfigured = true;
      console.warn(`[RecoveryHub] ${label} পাঠানো হয়নি — RECOVERY_HUB_BASE_URL / RECOVERY_HUB_INGEST_KEY / RECOVERY_HUB_HMAC_SECRET-এর কোনো একটা সেট করা নেই।`);
    }
    return;
  }
  const timestamp = String(Math.floor(Date.now() / 1000));
  try {
    const signature = await hmacHex(secret, `${timestamp}.${body}`);
    const res = await fetch(`${String(baseUrl).replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'x-timestamp': timestamp, 'x-signature': signature },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[RecoveryHub] ${label} হাব প্রত্যাখ্যান করেছে: HTTP ${res.status} ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn(`[RecoveryHub] ${label} forward error:`, String(err));
  }
}

/** বাংলাদেশ = UTC+6 (ডে-লাইট-সেভিং নেই) — আগের `toLocaleString('Asia/Dhaka')`-এর বদলে সস্তা হিসাব */
function hourOfDayDhaka() {
  return (new Date().getUTCHours() + 6) % 24;
}

async function lead(request, env, ctx) {
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405, NO_STORE, { allow: 'POST' });
  try {
    const clientIp = getClientIp(request.headers);
    const limit = await slidingWindowLimit(env, `lead:${clientIp}`, 20, 600);
    if (!limit.allowed) {
      return json({ ok: false, error: 'Too many requests. Please try again later.' }, 429, NO_STORE, { 'retry-after': String(limit.retryAfterSec) });
    }

    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== 'object') return json({ ok: false, error: 'Invalid payload' }, 400);

    const action = String(payload.action || 'addLead').trim();

    if (action === 'addStockRequest') {
      const phoneStr = normalizeBdPhone(String(payload.mobileNumber || payload.phone || '').trim());
      if (!validatePhone(phoneStr)) return json({ ok: false, error: 'Invalid phone format' }, 400);

      const productId = sanitizeValue(payload.productId, 30);
      const productName = sanitizeValue(payload.productName, 80);
      const customerName = sanitizeValue(payload.customerName, 30);
      const body = JSON.stringify({
        product_id: productId,
        product_name: productName || undefined,
        customer_name: customerName || undefined,
        phone: phoneStr,
      });
      ctx.waitUntil(postToHub(env, '/api/ingest/stock', body, 'stock-request'));
      return json({ ok: true });
    }

    const phoneStr = normalizeBdPhone(String(payload.phone || '').trim());
    if (!validatePhone(phoneStr)) return json({ ok: false, error: 'Invalid phone format' }, 400);

    const leadId = sanitizeValue(payload.leadId, 35);
    const name = sanitizeValue(payload.name, 30);
    const dist = sanitizeValue(payload.dist, 30);
    const addr = sanitizeValue(payload.addr, 200);
    const email = sanitizeValue(payload.email, 100);
    const items = sanitizeValue(payload.items, 300);
    const total = Number(payload.total) || 0;

    const body = JSON.stringify({
      session_id: leadId || `LD-${Date.now()}`,
      customer_name: name || undefined,
      phone: phoneStr,
      email: email || undefined,
      address: addr || undefined,
      district: dist || undefined,
      notes: items || undefined,
      cart_total: typeof total === 'number' ? total : undefined,
      currency: 'BDT',
      hour_of_day: hourOfDayDhaka(),
    });
    ctx.waitUntil(postToHub(env, '/api/ingest/draft', body, 'draft'));
    return json({ ok: true });
  } catch {
    return json({ ok: false }, 500);
  }
}

const DEVICE_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;

function readCookie(header, name) {
  const m = (header || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!m) return '';
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return '';
  }
}

function deviceId(request) {
  const existing = readCookie(request.headers.get('cookie'), 'vc_device_id');
  const proposed = new URL(request.url).searchParams.get('id') || '';
  const id = DEVICE_ID_RE.test(existing) ? existing : DEVICE_ID_RE.test(proposed) ? proposed : crypto.randomUUID().replace(/-/g, '');
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': NO_STORE, 'x-served-by': 'vangcur-api' };
  const res = new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  if (id !== existing) {
    res.headers.append('set-cookie', `vc_device_id=${id}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
  }
  return res;
}

const PAGE = 1000;
const MAX_ROWS = 50000;
const INDEX_COLS = 'id,cat,cats,name,name_bn,price,old,stock,badge,warranty,rating,specs,brand,img0:imgs->0';
const MEMORY_FRESH_MS = 15000;
const CACHEABLE = 'public, max-age=60, s-maxage=3600, stale-while-revalidate=300';
const idx = { products: null, at: 0, inflight: null };

function parseJsonish(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export function toIndexProduct(r) {
  const parsed = parseJsonish(r.specs, r.specs || {});
  const rawSpecs = parsed && typeof parsed === 'object' ? parsed : {};
  const discountColor = rawSpecs._discount_color || '';
  const specs = {};
  for (const [k, v] of Object.entries(rawSpecs)) if (!k.startsWith('_')) specs[k] = v; // `_profit` ইত্যাদি ইন্টারনাল কী কখনো বাইরে যায় না (audit P0-01)
  const img0 = typeof r.img0 === 'string' && r.img0 ? r.img0 : '📦';
  return {
    id: r.id,
    cat: r.cat || 'rgb',
    cats: r.cats || [r.cat || 'rgb'],
    name: r.name || '',
    nameBn: r.name_bn || '',
    brand: r.brand || '',
    price: Number(r.price) || 0,
    old: Number(r.old) || Number(r.price) || 0,
    stock: r.stock !== undefined && r.stock !== null ? Number(r.stock) : 0,
    badge: r.badge || '',
    rating: Number(r.rating) || 4.5,
    warranty: (r.warranty || '').trim(),
    discountColor,
    specs,
    desc: '',
    imgs: [img0],
    _detailLoaded: false,
  };
}

async function fetchAllIndexRows(env) {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error('supabase env missing');
  const out = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const qs = new URLSearchParams({ select: INDEX_COLS, order: 'sort_order.asc,id.asc', limit: String(PAGE), offset: String(from) });
    const res = await fetch(`${base}/rest/v1/custom_products?${qs}`, {
      headers: { apikey: key, authorization: `Bearer ${key}`, accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`supabase ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('bad payload');
    for (const r of data) out.push(toIndexProduct(r));
    if (data.length < PAGE) return out;
  }
  throw new Error('too many rows');
}

/** আগের fetchCatalogIndexRows-এর মতো: ব্যর্থ হলে ৪০০ ms পরে একবার আবার চেষ্টা */
async function fetchWithRetry(env) {
  try {
    return await fetchAllIndexRows(env);
  } catch {
    await new Promise((r) => setTimeout(r, 400));
    return fetchAllIndexRows(env);
  }
}

async function loadIndex(env) {
  if (idx.products && Date.now() - idx.at < MEMORY_FRESH_MS) return { products: idx.products, stale: false };
  if (!idx.inflight) {
    idx.inflight = fetchWithRetry(env)
      .then((p) => {
        idx.products = p;
        idx.at = Date.now();
        return p;
      })
      .finally(() => {
        idx.inflight = null;
      });
  }
  try {
    return { products: await idx.inflight, stale: false };
  } catch (err) {
    if (idx.products) return { products: idx.products, stale: true };
    throw err;
  }
}

async function searchIndex(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ products: [] }, 405, NO_STORE, { allow: 'GET, HEAD' });
  const hasParams = [...new URL(request.url).searchParams.keys()].length > 0;
  let loaded;
  try {
    loaded = await loadIndex(env);
  } catch {
    return json({ products: [] }, 200, NO_STORE); // আগের রুটের মতোই: ব্যর্থ হলে খালি + no-store (ক্লায়েন্ট Supabase-ফলব্যাকে যায়)
  }
  const cc = hasParams || loaded.stale || !loaded.products.length ? NO_STORE : CACHEABLE; // খালি/পুরনো-ফলব্যাক উত্তর কখনো ক্যাশে বসে না
  return json({ products: loaded.products }, 200, cc);
}

export async function handle(request, env, ctx) {
  const { pathname } = new URL(request.url);
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  switch (path) {
    case '/api/order-email':
      return orderEmail(request, env);
    case '/api/lead':
      return lead(request, env, ctx);
    case '/api/device-id':
      return deviceId(request);
    case '/api/search-index':
      return searchIndex(request, env);
    default:
      return json({ ok: false, error: 'Not found' }, 404);
  }
}

/** পাবলিক RPC `purge()`-এর জন্য: সারি-মেমরি মুছে দেয় (এজ-ক্যাশ মোছে index.js) */
export function resetMemory() {
  idx.products = null;
  idx.at = 0;
}
