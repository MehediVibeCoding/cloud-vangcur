import type { SupabaseClient } from '@supabase/supabase-js';

// ⚡ ব্যাচ ৪গ: Supabase lazy-facade।
//
// আগে: `@supabase/ssr` (→ supabase-js, ~৬৪.৫ KiB gzip) সরাসরি ইমপোর্ট হতো, তাই ৩২টা ফাইলের জন্য এটা
// প্রতিটা পেজের প্রথম JS-এ ঢুকত এবং মোবাইলে ~১৪৬ms (৪× CPU) পার্স/এক্সিকিউট হতো।
// এখন: `createClient()` সাথে সাথে একটা হালকা মোড়ক ফেরত দেয়, যার API আসল ক্লায়েন্টের মতোই
// (`.from().select().eq()`, `.rpc()`, `.auth.*`, `.channel().on().subscribe()`, `.removeChannel()`)।
// মোড়ক কলগুলো মনে রাখে; আসল লাইব্রেরি `import()` দিয়ে দেরিতে নামিয়ে সেগুলো হুবহু একই ক্রমে চালায়।
//
// কখন আসল লাইব্রেরি নামে:
//  • পাবলিক ব্রাউজ পেজে (হোম, প্রোডাক্ট, ক্যাটাগরি, কালেকশন, /products): পেজ লোড শেষ + idle হলে (সর্বোচ্চ ~২.৫s),
//    অথবা ব্যবহারকারীর প্রথম ইন্টারঅ্যাকশনে (ট্যাপ/স্ক্রল/কিবোর্ড) — যেটা আগে।
//  • অন্য সব পেজে (checkout, account, track-order, login ইত্যাদি) এবং সার্ভার-প্রিরেন্ডারে: সঙ্গে সঙ্গে,
//    আগের মতো কোনো অপেক্ষা ছাড়া।
// নতুন কোনো রিকোয়েস্ট যোগ হয় না — শুধু একই চাঙ্ক প্রথম পেইন্টের পরে নামে।
//
// ⚠ নিয়ম: এই ফাইলে `@supabase/ssr` বা `@supabase/supabase-js`-এর রানটাইম (non-type) স্ট্যাটিক ইমপোর্ট
// কখনো যোগ করা যাবে না — করলে চাঙ্ক আবার প্রথম JS-এ ফিরে আসবে। শুধু `import type` চলবে।

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// যেসব পাথে আসল ক্লায়েন্ট পেইন্টের পরে নামানো নিরাপদ (পাবলিক ব্রাউজ পেজ)।
const DEFERRABLE_PATH = /^\/(?:$|product\/|products(?:\/|$)|category\/|collection\/)/;

let realPromise: Promise<SupabaseClient> | null = null;
function loadReal(): Promise<SupabaseClient> {
  if (!realPromise) {
    const url = SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = SUPABASE_ANON_KEY || 'placeholder-anon-key';
    realPromise = import('@supabase/ssr').then(
      (m) => m.createBrowserClient(url, key) as unknown as SupabaseClient
    );
    // লোড ব্যর্থ হলে (নেটওয়ার্ক) পরের কলে আবার চেষ্টা হবে।
    realPromise.catch(() => {
      realPromise = null;
    });
  }
  return realPromise;
}

let gate: Promise<void> | null = null;
function ready(): Promise<void> {
  if (gate) return gate;
  gate = new Promise<void>((resolve) => {
    if (typeof window === 'undefined' || !DEFERRABLE_PATH.test(window.location.pathname)) {
      resolve();
      return;
    }
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'focusin'];
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      events.forEach((e) => window.removeEventListener(e, go, true));
      resolve();
    };
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true, capture: true }));
    const afterLoad = () => {
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void })
        .requestIdleCallback;
      if (ric) ric(go, { timeout: 2500 });
      else setTimeout(go, 2500);
    };
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
  });
  return gate;
}

type Step = { kind: 'get'; key: PropertyKey } | { kind: 'call'; args: unknown[] };
type Holder = { v: unknown };

const NODE = Symbol('vc-lazy-node');
interface LazyNode {
  [NODE]: { run: () => Promise<Holder> };
}
const isNode = (x: unknown): x is LazyNode =>
  (typeof x === 'object' || typeof x === 'function') && x !== null && (x as Record<symbol, unknown>)[NODE] !== undefined;

// root: আসল ক্লায়েন্ট পাওয়ার প্রতিশ্রুতি; parent: আগের ধাপের ফল (memoized — প্রতিটা ধাপ ঠিক একবারই চলে)।
function makeNode(parentRun: () => Promise<Holder>, step: Step, eager: boolean): unknown {
  let memo: Promise<Holder> | null = null;
  const run = (): Promise<Holder> => {
    if (!memo) {
      memo = parentRun().then(async (p) => {
        const target = p.v as Record<PropertyKey, unknown>;
        if (step.kind === 'get') {
          const val = target[step.key];
          // মেথড হলে `this` ঠিক রাখতে পরের `call` ধাপ ধরার জন্য parent-সহ বেঁধে রাখি।
          return { v: typeof val === 'function' ? (val as (...a: unknown[]) => unknown).bind(target) : val };
        }
        const args = await Promise.all(
          step.args.map(async (a) => (isNode(a) ? (await a[NODE].run()).v : a))
        );
        return { v: (target as unknown as (...a: unknown[]) => unknown)(...args) };
      });
    }
    return memo;
  };

  const handler: ProxyHandler<() => void> = {
    get(_t, key) {
      if (key === NODE) return { run };
      // await / .then() / .catch() / .finally() — এখানেই আসল কাজ শুরু হয়।
      if (key === 'then' || key === 'catch' || key === 'finally') {
        const exec = () => run().then((h) => h.v);
        return (...a: unknown[]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (exec() as any)[key](...a);
        };
      }
      if (typeof key === 'symbol') return undefined;
      return makeNode(run, { kind: 'get', key }, eager);
    },
    apply(_t, _this, args) {
      return makeNode(run, { kind: 'call', args }, eager);
    },
  };
  const proxy = new Proxy(function () {} as () => void, handler);
  // channel()/removeChannel()/auth.* চেইন অনেক সময় কেউ await করে না — তাই তৈরির সঙ্গে সঙ্গে চালু করে দিই
  // (ধাপগুলো memoized, তাই আসল ক্লায়েন্টে প্রতিটা ঠিক একবারই চলে)।
  if (eager) run().catch(() => undefined);
  return proxy;
}

function makeRoot(): SupabaseClient {
  const rootRun = (): Promise<Holder> => ready().then(loadReal).then((c) => ({ v: c }));
  const handler: ProxyHandler<object> = {
    get(_t, key) {
      if (typeof key === 'symbol' || key === 'then') return undefined; // root নিজে await করা যায় না
      // auth.* মেথড আসল ক্লায়েন্টে কল করার সঙ্গে সঙ্গেই চলে (await না করলেও, যেমন signOut()) — তাই সেটাও eager।
      const eager = key === 'channel' || key === 'removeChannel' || key === 'auth';
      return makeNode(rootRun, { kind: 'get', key }, eager);
    },
  };
  return new Proxy({}, handler) as unknown as SupabaseClient;
}

let browserSingleton: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  // ব্রাউজারে env না থাকলে আগের মতোই স্পষ্ট এরর (misconfiguration যেন চোখ না এড়ায়)।
  if (typeof window !== 'undefined' && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
    throw new Error(
      'Supabase env var পাওয়া যায়নি — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ব্রাউজার বান্ডলে সেট করা নেই।'
    );
  }
  if (typeof window === 'undefined') return makeRoot();
  if (!browserSingleton) browserSingleton = makeRoot();
  return browserSingleton;
}
