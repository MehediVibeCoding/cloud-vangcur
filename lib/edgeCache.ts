// ফাইলের পাথ: lib/edgeCache.ts
// Workers Caching (wrangler.jsonc `cache.enabled`) এর HTML ক্যাশ মোছার শেয়ার্ড হেল্পার —
// revalidate-catalog ও revalidate-guide দুটোই ব্যবহার করে। এটা না করলে ISR মুছলেও এজে পুরনো
// পেজ `s-maxage` পর্যন্ত থেকে যেত। ব্যর্থ হলে রিকোয়েস্ট ভাঙে না, শুধু false ফেরত দেয়।

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { logWarn } from '@/lib/logger';

// ctx.cache (Workers Caching) এর ন্যূনতম টাইপ — প্রজেক্টে workers-types নেই, তাই এখানেই সংজ্ঞা।
type WorkerCachePurger = {
  purge: (
    opts: { purgeEverything: true } | { pathPrefixes: string[] },
  ) => Promise<{ success: boolean; errors?: unknown }>;
};

/**
 * `vangcur-live` Worker-এর (workers/live/, `/api/live-products`) এজ-ক্যাশ মোছে — Service Binding RPC (`LIVE_WORKER.purge()`)।
 * অ্যাডমিনের দাম/স্টক/ব্যাজ বদলে ('live' ট্যাগ) এটা ডাকা হয়, যাতে ৫ মিনিট অপেক্ষা ছাড়াই নতুন মান দেখা যায়।
 * ব্যর্থ হলে/binding না থাকলে (লোকাল dev) রিকোয়েস্ট ভাঙে না, শুধু false — তখনো ক্যাশ সর্বোচ্চ ৫ মিনিটে নিজে ঠিক হয়।
 */
export async function purgeLiveWorkerCache(logPrefix: string): Promise<boolean> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const live = (env as unknown as { LIVE_WORKER?: { purge?: () => Promise<{ ok?: boolean }> } }).LIVE_WORKER;
    if (!live || typeof live.purge !== 'function') {
      logWarn(`[${logPrefix}] LIVE_WORKER binding পাওয়া যায়নি — লাইভ-ক্যাশ মোছা হয়নি`);
      return false;
    }
    const out = await live.purge();
    if (!out?.ok) logWarn(`[${logPrefix}] লাইভ-ক্যাশ পার্জ ব্যর্থ`, { out });
    return !!out?.ok;
  } catch (err) {
    logWarn(`[${logPrefix}] লাইভ-ক্যাশ পার্জে এরর`, { err: String(err) });
    return false;
  }
}

export async function purgeEdgeCache(logPrefix: string): Promise<boolean> {
  try {
    const { ctx } = await getCloudflareContext({ async: true });
    const cache = (ctx as unknown as { cache?: WorkerCachePurger }).cache;
    if (!cache) {
      logWarn(`[${logPrefix}] ctx.cache পাওয়া যায়নি — এজ ক্যাশ মোছা হয়নি`);
      return false;
    }
    const result = await cache.purge({ purgeEverything: true });
    if (!result.success) {
      logWarn(`[${logPrefix}] এজ ক্যাশ পার্জ ব্যর্থ`, { errors: result.errors });
    }
    return result.success;
  } catch (err) {
    logWarn(`[${logPrefix}] এজ ক্যাশ পার্জে এরর`, { err: String(err) });
    return false;
  }
}

/**
 * শুধু নির্দিষ্ট পাথগুলোর এজ-ক্যাশ মোছে (Workers Cache `pathPrefixes`) — বাকি পেজের ক্যাশ অক্ষত।
 * ⚠️ `pathPrefixes` প্রিফিক্স-মিল: `/product/foo-5` মুছলে `/product/foo-55`-এর মতো একই-প্রিফিক্স পাথও যায়
 * (শুধু বাড়তি মোছা, ভুল নয়)। ব্যর্থ হলে false — কলার তখন পুরো-পার্জে ফিরে যায়, যাতে পুরনো পেজ আটকে না থাকে।
 */
export async function purgeEdgeCachePaths(logPrefix: string, pathPrefixes: string[]): Promise<boolean> {
  if (!pathPrefixes.length) return true;
  try {
    const { ctx } = await getCloudflareContext({ async: true });
    const cache = (ctx as unknown as { cache?: WorkerCachePurger }).cache;
    if (!cache) {
      logWarn(`[${logPrefix}] ctx.cache পাওয়া যায়নি — এজ ক্যাশ মোছা হয়নি`);
      return false;
    }
    const result = await cache.purge({ pathPrefixes });
    if (!result.success) {
      logWarn(`[${logPrefix}] এজ ক্যাশ পাথ-পার্জ ব্যর্থ`, { errors: result.errors });
    }
    return result.success;
  } catch (err) {
    logWarn(`[${logPrefix}] এজ ক্যাশ পাথ-পার্জে এরর`, { err: String(err) });
    return false;
  }
}
