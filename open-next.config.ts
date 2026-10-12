import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';

// ISR cache (revalidate, revalidateTag, revalidatePath — lib/catalogIndex.ts)
// Workers KV-তে রাখা হচ্ছে, নাহলে Cloudflare-এ ISR কাজ করবে না।
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
