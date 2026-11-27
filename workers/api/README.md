# 🧰 vangcur-api

ছোট, হালকা API-গুলোর আলাদা Worker। মূল সাইট (Next.js/OpenNext) প্রায় ১৩ MB — কোল্ড-স্টার্টে ১০০–৪০০ ms CPU লাগে (Cloudflare ডেটা, ৭ দিন)। এই Worker **~৩০ KB (gzip ~৯ KB)**; তাই এই ট্রাফিক মূল Worker জাগায় না। ছোট Worker `vangcur-live`-এর ৭ দিনের ডেটা: P99 ~৩.৮ ms — এটাও সেই ধরনের, কিন্তু **এই Worker-এর আসল CPU ডিপ্লয়ের পর মাপা বাকি** (বিশেষ করে order-email-এর ১২ KB ইমেইল-টেমপ্লেট)।

## কোন রুট
| রুট | কাজ | সিক্রেট |
|---|---|---|
| `POST /api/order-email` | Supabase DB webhook → Brevo (অর্ডার কনফার্মেশন ইমেইল) | `WEBHOOK_SECRET`, `BREVO_API_KEY` |
| `POST /api/lead` | চেকআউট-ড্রাফট ও স্টক-নোটিফাই → Recovery Hub (Upstash রেট-লিমিটসহ) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RECOVERY_HUB_BASE_URL`, `RECOVERY_HUB_INGEST_KEY`, `RECOVERY_HUB_HMAC_SECRET` |
| `GET /api/device-id` | টেকসই ডিভাইস-আইডি কুকি | নেই |
| `GET /api/search-index` | হালকা ক্যাটালগ ইনডেক্স (সার্চ-ড্রপডাউন, কার্ট, কুইক-অর্ডার) | নেই (anon key পাবলিক) |

আচরণ আগের `app/api/<রুট>/route.ts`-এর **হুবহু মতো**। ওই পুরনো রুটগুলো **রোলব্যাকের জন্য রিপোতে রাখা — মুছবেন না**।
ইমেইল ডিজাইন আলাদা কপি নয়: সরাসরি `lib/orderEmailTemplate.ts` থেকে ইমপোর্ট (ডিজাইন বদলালে এখানে হাত দিতে হয় না — তবে `workers/api` আবার ডিপ্লয় করতে হবে)।

## ⚠️ ডিপ্লয়ের ক্রম (এই ক্রম না মানলে ভাঙতে পারে)
1. **Worker ডিপ্লয়** (রুট ছাড়া — এখনো লাইভ ট্রাফিক আসবে না): `cd workers/api && npx wrangler deploy` (wrangler ≥ 4.69)।
2. **সিক্রেট বসান** (ওপরের টেবিলের নামগুলো; মান মূল সাইটের Cloudflare সিক্রেটের সাথে হুবহু এক): `npx wrangler secret put WEBHOOK_SECRET` ইত্যাদি। কিছুই কমিট করবেন না (রিপো পাবলিক)।
3. **মূল সাইট ডিপ্লয়** (এই PR মার্জ → Workers Builds)। এতে `API_WORKER` Service Binding ও পার্জ-হুক যোগ হয় — `vangcur-api` আগে থেকে না থাকলে ডিপ্লয় "service not found"-এ ব্যর্থ হবে (তাই ধাপ ১ আগে)। এই ধাপ রুটের আগে, যাতে `search-index` চালুর মুহূর্ত থেকেই অ্যাডমিন-বদলে ক্যাশ মোছা কাজ করে।
4. **এক-এক করে Route চালু করুন** (Cloudflare → Websites → vangcur.com → Workers Routes → Add route, Worker = `vangcur-api`), প্রতিটার পর যাচাই:
   1. `vangcur.com/api/device-id*`
   2. `vangcur.com/api/search-index*` — সাইটে সার্চ করে দেখুন; `curl -sI https://vangcur.com/api/search-index` → `x-served-by: vangcur-api`; অ্যাডমিনে একটা দাম বদলে সার্চে নতুন দাম এল কিনা দেখুন
   3. `vangcur.com/api/lead*` — চেকআউটে ফোন লিখে ড্রাফট যায় কিনা Recovery Hub-এ দেখুন
   4. `vangcur.com/api/order-email*` — **শেষে**; একটা টেস্ট অর্ডার দিয়ে ইমেইল এল কিনা দেখুন (Workers → vangcur-api → Logs)

## রোলব্যাক (এক মিনিটে, প্রতিটা রুট আলাদা)
Workers Routes থেকে ওই রুটের Route মুছুন → রিকোয়েস্ট আবার মূল Worker-এর অপরিবর্তিত `app/api/<রুট>`-এ যাবে।

## কীভাবে কাজ করে (সংক্ষেপে)
- **search-index:** `s-maxage=3600` → Workers Caching এজে ১ ঘণ্টা রাখে (হিটে কোড চলে না)। মিসে Worker-মেমরি (১৫ সে) → Supabase REST (`custom_products`, হালকা কলাম)। ব্যর্থ হলে `{products: []}` + `no-store` (ক্লায়েন্ট আগের মতো সরাসরি Supabase-ফলব্যাকে যায়)।
  **পার্জ:** অ্যাডমিন বদলালে `revalidate-catalog` → `lib/edgeCache.ts`-এর `purgeEdgeCache()` (পুরো-পার্জ ও 'search'-ট্যাগওয়ালা সব বদল এই পথে আসে) ভেতরে `purgeApiWorkerCache()` → `env.API_WORKER.purge()` (Service Binding RPC; পাবলিক URL নয়)। `revalidate-catalog/route.ts` অপরিবর্তিত। না পৌঁছালে সর্বোচ্চ ১ ঘণ্টায় নিজে ঠিক হয়।
  ⚠️ `/search` পেজ (সার্ভার) একই ডেটা আলাদা ক্যাশ (`unstable_cache`) থেকে পড়ে — অ্যাডমিন-বদলে দুটোই মোছা হয়; আগে দুটোই একই ক্যাশ ছিল; এখন আলাদা। তাই শুধু স্টক/বিবরণ বদলে ('search' ট্যাগ মোছে না) /api/search-index সর্বোচ্চ ১ ঘণ্টা আর /search পেজ সর্বোচ্চ ২৪ ঘণ্টা পুরনো থাকতে পারে। দাম/ব্যাজ/নতুন/মোছা/ক্রম বদল দুটোতেই তাৎক্ষণিক।
- **lead:** Upstash Lua স্লাইডিং-উইন্ডো (`lead:<ip>`, ২০ / ১০ মিনিট; মূল `lib/limiter.ts`-এর হুবহু একই কী-ফরম্যাট); Upstash না থাকলে/ব্যর্থ হলে আইসোলেট-মেমোরি। মূল সাইটের middleware-এর বাড়তি `mw:api:` লিমিট (১০ সেকেন্ডে ৩০) এখানে নেই — রুটের নিজের লিমিটই কড়া।
- **order-email:** `x-webhook-secret` সময়-নিরপেক্ষ তুলনা; Brevo-তে পাঠানো; Brevo ব্যর্থ হলে ৫০২ (আগের রুটের মতোই)।

## যাচাই
`node --test workers/api/test.mjs` (Node ≥ 22.18; নেটওয়ার্ক/সিক্রেট ছাড়া, সব fetch মক)। ফোন-ফাংশন দুটো মূল `lib/security.ts` ও `lib/checkoutData.ts`-এর সোর্স থেকে বের করে তুলনা করা হয় — ওই ফাংশন বদলালে এই টেস্ট ফেল করে মনে করিয়ে দেবে।

## ⚠️ মনে রাখবেন
- `lib/orderEmailTemplate.ts` বা `lib/security.ts`/`lib/checkoutData.ts`-এর ফোন-নিয়ম বদলালে এই Worker আবার ডিপ্লয় করুন।
- নতুন `/api/xyz` যোগ করলে `middleware.ts`-এর `KNOWN_API_ROOTS`-এ নাম দিতে হয় (এই Worker-এর রুট হলেও রোলব্যাকের জন্য মূল রুট রাখলে)।
