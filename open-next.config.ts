import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';
import memoryQueue from '@opennextjs/cloudflare/overrides/queue/memory-queue';
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';

// ISR cache (revalidate, revalidateTag, revalidatePath — lib/catalogIndex.ts)
// Workers KV-তে রাখা হচ্ছে, নাহলে Cloudflare-এ ISR কাজ করবে না।
//
// 🔧 ফিক্স ১ (ISR রিফ্রেশ): আগে `queue` বলা ছিল না, তাই OpenNext-এর ডিফল্ট "dummy" queue
// বসত — যার send() সবসময় "Dummy queue is not implemented" এরর দেয়। ফলে পেজ-গুলো
// `revalidate` সময় পেরোলেও নিজে নতুন হতো না (লগে "Failed to revalidate stale page ...")।
// এখন memory-queue: পুরনো পেজ পেলে Worker নিজেকে (service binding `WORKER_SELF_REFERENCE`,
// wrangler.jsonc) HEAD রিকোয়েস্ট পাঠিয়ে পেজটা নতুন করে বানায়।
//
// 🔧 ফিক্স ২ (KV-রিড কমানো): `withRegionalCache` KV-র সামনে এজ-লোকাল (Cache API) ক্যাশ বসায় —
// একই ডেটা সেন্টারে বারবার একই পেজ চাইলে প্রতিবার KV পড়তে হয় না। Free KV সীমা মাত্র
// ১ লাখ রিড/দিন, তাই ট্রাফিক বাড়লে এটা জরুরি।
//
// 🔧 ফিক্স ৩ (তাৎক্ষণিক পার্জ): আগে `tagCache` বলা ছিল না, তাই ডিফল্ট "dummy" বসত — ফলে
// এডমিনের সিগন্যালে (/api/revalidate-catalog → revalidatePath/revalidateTag) কোনো পেজই মুছত না।
// এখন D1 ডাটাবেজ `vangcur-tags` (wrangler.jsonc-এর `NEXT_TAG_CACHE_D1` binding) টাইমস্ট্যাম্প
// রাখে — কোন পেজ কখন "পুরনো" ঘোষণা হয়েছে। KV-এর বদলে D1 নেওয়ার কারণ: ট্যাগ প্রতিটি
// পেজ-ভিউতে ৫–৬ বার দেখা হয়; KV-র ফ্রি সীমা মাত্র ১ লাখ রিড/দিন, D1-এ ৫০ লাখ রো/দিন।
// (এটা শুধু ক্যাশ-মেটাডেটা; আপনার আসল ডেটা সব Supabase-এই থাকে।)
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(kvIncrementalCache, { mode: 'long-lived' }),
  tagCache: d1NextTagCache,
  queue: memoryQueue,
});
