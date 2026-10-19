// ফাইলের পাথ: lib/limiter.ts
// [NEW] সব সার্ভার-সাইড রেট লিমিটের জন্য একটাই শেয়ার্ড মডিউল।
//
// কেন দরকার: আগে প্রতিটা রুটে আলাদা `new Map()` ছিল। Vercel-এ সাইট অনেকগুলো ছোট সার্ভার
// ইনস্ট্যান্সে চলে — প্রতিটার মেমোরি আলাদা এবং ঠান্ডা হলে মুছে যায়, তাই সেই লিমিট সহজেই
// এড়ানো যেত। এখন কাউন্টার থাকে Upstash Redis-এ (সব ইনস্ট্যান্সের জন্য এক), আর Upstash-এর
// env না থাকলে বা সাময়িক ব্যর্থ হলে আগের মতো ইনস্ট্যান্স-মেমোরিতে নেমে যায় (কখনো সাইট আটকায় না)।
//
// দুই ধরনের অ্যালগরিদম:
//  • slidingWindowLimit — "গত N সেকেন্ডে সর্বোচ্চ M বার"। ফিক্সড-উইন্ডোর সেই সমস্যা নেই যেখানে
//    মিনিটের শেষে ১০ + পরের মিনিটের শুরুতে ১০ = কয়েক সেকেন্ডে ২০ বার হয়ে যেত।
//  • tokenBucketLimit   — বালতিতে ক্যাপাসিটি-সংখ্যক টোকেন; প্রতিবার ১টা খরচ; সময়ের সাথে
//    ধীরে ধীরে ফেরত আসে। ছোট বার্স্ট চলে, কিন্তু লাগাতার স্প্যাম আটকায়।
//
// কোনো npm প্যাকেজ লাগে না (Upstash REST API সরাসরি fetch দিয়ে) — তাই package.json /
// package-lock.json বদলাতে হয় না। Edge (middleware) ও Node দুই জায়গাতেই চলে।
//
// env (Vercel → Storage → Upstash Redis যুক্ত করলে নিজে থেকেই সেট হয়):
//   UPSTASH_REDIS_REST_URL ও UPSTASH_REDIS_REST_TOKEN  (অথবা KV_REST_API_URL / KV_REST_API_TOKEN)

export interface RateLimitOutcome {
  allowed: boolean;
  remaining: number;
  /** ব্লক হলে কত সেকেন্ড পরে আবার চেষ্টা করা যাবে */
  retryAfterSec: number;
}

const PREFIX = 'vc:rl:';

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
  return url && token ? { url, token } : null;
}

function safeKey(key: string): string {
  return String(key).replace(/[\s\r\n]+/g, '_').slice(0, 160);
}

// 🔒 ফিক্স (C5): এই একটাই IP-এক্সট্র্যাক্ট ফাংশন — আগে middleware.ts, checkout.ts,
// app/api/meta-capi/route.ts-এ হুবহু এই লজিকের আলাদা কপি ছিল (৪+ জায়গা), সবগুলোই
// cf-connecting-ip উপেক্ষা করত। এখন cf-connecting-ip সবার আগে ট্রাই হয় (Cloudflare প্রক্সি
// অন থাকলে Vercel-এ Cloudflare-এরই এজ IP পৌঁছাতে পারে — x-vercel-forwarded-for তখন ভুল
// হতে পারে)। সতর্কতা: cf-connecting-ip তখনই নিরাপদ যখন অরিজিন (Vercel) শুধু Cloudflare-এর
// IP-রেঞ্জ থেকে রিকোয়েস্ট নেয়, নইলে যেকেউ সরাসরি Vercel-কে কল করে এই হেডার জাল করতে
// পারবে — সেই ফায়ারওয়াল-নিয়ম কোডের বাইরে, Vercel/Cloudflare ড্যাশবোর্ডে বসাতে হয় (V2/V13)।
// Cloudflare প্রক্সি অফ থাকলে (এখনকার মতো) এই হেডার কখনো আসবে না, তাই বর্তমান আচরণ অপরিবর্তিত।
export function getClientIp(headers: { get(name: string): string | null }): string {
  const cf = headers.get('cf-connecting-ip');
  const vercel = headers.get('x-vercel-forwarded-for');
  const real = headers.get('x-real-ip');
  const fwd = headers.get('x-forwarded-for');
  return (
    (cf ? cf.trim() : '') ||
    (vercel ? vercel.split(',')[0].trim() : '') ||
    (real ? real.trim() : '') ||
    (fwd ? fwd.split(',')[0].trim() : '') ||
    '127.0.0.1'
  );
}

// ───────────────────────── Lua (Redis-এর ভেতরে অ্যাটমিকভাবে চলে) ─────────────────────────

// Sliding-window counter: আগের উইন্ডোর গণনাকে বাকি সময়ের অনুপাতে যোগ করে — দুই উইন্ডোর
// সীমানায় বার্স্ট ধরা পড়ে। ব্লক হওয়া রিকোয়েস্ট গণনায় যোগ হয় না (ব্লক অকারণে বাড়ে না)।
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

// Token bucket
const BUCKET_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local cap = tonumber(ARGV[2])
local refillPerMs = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])
local d = redis.call('HMGET', key, 't', 'ts')
local tokens = tonumber(d[1])
local ts = tonumber(d[2])
if tokens == nil or ts == nil then
  tokens = cap
  ts = now
end
tokens = math.min(cap, tokens + math.max(0, now - ts) * refillPerMs)
local allowed = 0
local retryMs = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
else
  retryMs = math.ceil((cost - tokens) / refillPerMs)
end
redis.call('HSET', key, 't', tostring(tokens), 'ts', tostring(now))
redis.call('PEXPIRE', key, ttl)
return {allowed, math.floor(tokens), retryMs}
`;

async function redisEval(script: string, keys: string[], args: (string | number)[]): Promise<number[]> {
  const cfg = redisConfig();
  if (!cfg) throw new Error('redis not configured');
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['EVAL', script, String(keys.length), ...keys, ...args.map(String)]),
    cache: 'no-store',
    signal: AbortSignal.timeout(1200),
  });
  const json = (await res.json()) as { result?: number[]; error?: string };
  if (!res.ok || json.error || !Array.isArray(json.result)) {
    throw new Error(json.error || `redis http ${res.status}`);
  }
  return json.result.map(Number);
}

// ───────────────────── সার্কিট ব্রেকার (Upstash টানা ব্যর্থ হলে সাময়িক বাইপাস) ─────────────────────
// কেন দরকার: আগে Redis কল ব্যর্থ/স্লো হলেও প্রতিটা আলাদা রিকোয়েস্ট নিজে থেকে নতুন করে
// Redis-এ চেষ্টা করত এবং সর্বোচ্চ ১.২ সেকেন্ড (AbortSignal.timeout) অপেক্ষা করে তারপর
// মেমোরি-ফলব্যাকে যেত। Upstash কয়েক মিনিটের জন্য ডাউন/স্লো থাকলে checkout/coupon/
// lead-capture-এর মতো একাধিক পথের প্রতিটা রিকোয়েস্ট আলাদাভাবে এই ১.২ সেকেন্ড গুনত —
// আসল সমস্যা Redis-এ না হলেও পুরো সাইট স্লো অনুভূত হতো। এখন পরপর কয়েকবার ব্যর্থ হলে
// ব্রেকার কিছু সময়ের জন্য খুলে যায়: ততক্ষণ Redis-এ হাতই দেওয়া হয় না, সরাসরি
// মেমোরি-ফলব্যাকে চলে যাওয়া হয় (তাৎক্ষণিক)। সময় শেষ হলে একটা ট্রায়াল কল যেতে দেওয়া হয়
// (half-open) — Redis ফিরে এসেছে কিনা যাচাই করতে।
const BREAKER_FAIL_THRESHOLD = 3; // টানা এতবার ব্যর্থ হলে ব্রেকার খোলে
const BREAKER_OPEN_MS = 20_000; // এই সময় পর্যন্ত Redis স্কিপ করে সরাসরি ফলব্যাকে যাওয়া হয়
let breakerFailCount = 0;
let breakerOpenUntil = 0; // 0 মানে ব্রেকার বন্ধ (Redis স্বাভাবিকভাবে ট্রাই হবে)

function breakerIsOpen(): boolean {
  if (breakerOpenUntil === 0) return false;
  if (Date.now() >= breakerOpenUntil) {
    // half-open: একটা ট্রায়াল কল যেতে দাও, Redis ফিরেছে কিনা যাচাই করতে
    breakerOpenUntil = 0;
    return false;
  }
  return true;
}

function breakerRecordSuccess(): void {
  breakerFailCount = 0;
  breakerOpenUntil = 0;
}

function breakerRecordFailure(): void {
  breakerFailCount += 1;
  if (breakerFailCount >= BREAKER_FAIL_THRESHOLD) {
    breakerOpenUntil = Date.now() + BREAKER_OPEN_MS;
  }
}

// ───────────────────── ফলব্যাক: ইনস্ট্যান্স-মেমোরি (Upstash না থাকলে/ব্যর্থ হলে) ─────────────────────

const memWindows = new Map<string, number>(); // `${key}:${windowId}` -> count
const memBuckets = new Map<string, { tokens: number; ts: number }>();

function memCleanup(now: number) {
  if (memWindows.size > 6000) {
    const keep = Math.floor(now / 1000);
    for (const k of Array.from(memWindows.keys())) {
      const exp = Number(k.split('|').pop());
      if (!Number.isFinite(exp) || exp < keep) memWindows.delete(k);
    }
  }
  if (memBuckets.size > 6000) {
    for (const [k, v] of Array.from(memBuckets.entries())) {
      if (now - v.ts > 3600_000) memBuckets.delete(k);
    }
  }
}

function memSliding(key: string, limit: number, windowSec: number, cost: number): RateLimitOutcome {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const id = Math.floor(now / windowMs);
  const frac = (now % windowMs) / windowMs;
  const expSec = Math.floor(((id + 2) * windowMs) / 1000);
  memCleanup(now);
  const cKey = `${key}:${id}|${expSec}`;
  const pKey = `${key}:${id - 1}|${expSec - windowSec}`;
  const c = memWindows.get(cKey) ?? 0;
  const p = memWindows.get(pKey) ?? 0;
  const used = p * (1 - frac) + c;
  const over = cost === 0 ? used >= limit : used + cost > limit;
  const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now % windowMs)) / 1000));
  if (over) return { allowed: false, remaining: 0, retryAfterSec };
  if (cost > 0) memWindows.set(cKey, c + cost);
  return { allowed: true, remaining: Math.max(0, Math.floor(limit - used - cost)), retryAfterSec: 0 };
}

function memBucket(key: string, capacity: number, refillPerSec: number, cost: number): RateLimitOutcome {
  const now = Date.now();
  memCleanup(now);
  const b = memBuckets.get(key) ?? { tokens: capacity, ts: now };
  const tokens = Math.min(capacity, b.tokens + Math.max(0, now - b.ts) * (refillPerSec / 1000));
  if (tokens >= cost) {
    memBuckets.set(key, { tokens: tokens - cost, ts: now });
    return { allowed: true, remaining: Math.floor(tokens - cost), retryAfterSec: 0 };
  }
  memBuckets.set(key, { tokens, ts: now });
  return {
    allowed: false,
    remaining: 0,
    retryAfterSec: Math.max(1, Math.ceil((cost - tokens) / refillPerSec)),
  };
}

// ───────────────────────────────────── পাবলিক API ─────────────────────────────────────

/**
 * স্লাইডিং-উইন্ডো: `windowSec` সেকেন্ডের মধ্যে সর্বোচ্চ `limit` বার।
 * `cost = 0` দিলে কিছু গণনা না করে শুধু দেখা যায় সীমা পার হয়েছে কিনা (peek)।
 */
export async function slidingWindowLimit(
  key: string,
  limit: number,
  windowSec: number,
  cost = 1,
): Promise<RateLimitOutcome> {
  const k = safeKey(key);
  if (redisConfig() && !breakerIsOpen()) {
    try {
      const now = Date.now();
      const windowMs = windowSec * 1000;
      const id = Math.floor(now / windowMs);
      const frac = (now % windowMs) / windowMs;
      const [ok, remaining] = await redisEval(
        SLIDING_LUA,
        [`${PREFIX}sw:${k}:${id}`, `${PREFIX}sw:${k}:${id - 1}`],
        [limit, windowMs, frac.toFixed(6), cost],
      );
      breakerRecordSuccess();
      return {
        allowed: ok === 1,
        remaining,
        retryAfterSec: ok === 1 ? 0 : Math.max(1, Math.ceil((windowMs - (now % windowMs)) / 1000)),
      };
    } catch {
      // Upstash সাময়িক ব্যর্থ — নিচে মেমোরি-ফলব্যাক; সাইট কখনো আটকায় না
      breakerRecordFailure();
    }
  }
  return memSliding(k, limit, windowSec, cost);
}

/**
 * টোকেন-বাকেট: বালতিতে সর্বোচ্চ `capacity`টা টোকেন, প্রতি সেকেন্ডে `refillPerSec`টা করে ফেরত আসে।
 * উদাহরণ: capacity=5, refillPerSec=0.1 → একবারে ৫টা চেষ্টা চলে, তারপর প্রতি ১০ সেকেন্ডে ১টা।
 */
export async function tokenBucketLimit(
  key: string,
  capacity: number,
  refillPerSec: number,
  cost = 1,
): Promise<RateLimitOutcome> {
  const k = safeKey(key);
  if (redisConfig() && !breakerIsOpen()) {
    try {
      const ttlMs = Math.max(60_000, Math.ceil((capacity / refillPerSec) * 1000) * 2);
      const [ok, remaining, retryMs] = await redisEval(
        BUCKET_LUA,
        [`${PREFIX}tb:${k}`],
        [Date.now(), capacity, refillPerSec / 1000, cost, ttlMs],
      );
      breakerRecordSuccess();
      return {
        allowed: ok === 1,
        remaining,
        retryAfterSec: ok === 1 ? 0 : Math.max(1, Math.ceil(retryMs / 1000)),
      };
    } catch {
      // ফলব্যাক
      breakerRecordFailure();
    }
  }
  return memBucket(k, capacity, refillPerSec, cost);
}
