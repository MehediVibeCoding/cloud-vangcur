// ফাইলের পাথ: lib/edgeCache.ts
// Workers Caching (wrangler.jsonc `cache.enabled`) এর HTML ক্যাশ মোছার শেয়ার্ড হেল্পার —
// revalidate-catalog ও revalidate-guide দুটোই ব্যবহার করে। এটা না করলে ISR মুছলেও এজে পুরনো
// পেজ `s-maxage` পর্যন্ত থেকে যেত। ব্যর্থ হলে রিকোয়েস্ট ভাঙে না, শুধু false ফেরত দেয়।

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { logWarn } from '@/lib/logger';

// ctx.cache (Workers Caching) এর ন্যূনতম টাইপ — প্রজেক্টে workers-types নেই, তাই এখানেই সংজ্ঞা।
type WorkerCachePurger = {
  purge: (opts: { purgeEverything: true }) => Promise<{ success: boolean; errors?: unknown }>;
};

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
