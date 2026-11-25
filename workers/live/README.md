# 🏷️ vangcur-live

`/api/live-products` (দাম, আগের দাম, স্টক, ব্যাজ) চালানোর আলাদা ছোট Worker। মূল সাইটের (Next.js/OpenNext) ভেতর দিয়ে না গিয়ে সরাসরি এখানে — তাই মূল Worker-এর CPU/কোল্ড-স্টার্টে এই ট্রাফিক পড়ে না।

## কীভাবে কাজ করে
- Cloudflare **Route** `vangcur.com/api/live-products*` → এই Worker। (Route Custom Domain-এর ওপরে প্রাধান্য পায়, তাই URL অপরিবর্তিত; ফ্রন্টএন্ড বদলাতে হয়নি।)
- **Workers Caching** (`cache.enabled`): উত্তরে `s-maxage=300` → Cloudflare ৫ মিনিট রাখে, ক্যাশ-হিটে এই কোড চলেই না।
- মিসে: Worker-মেমরি (১৫ সে) → না থাকলে Supabase REST (anon key, `custom_products`)। অচেনা `?x=` প্যারামিটার/অজানা `?cat=` ক্যাশে বসে না।
- **পার্জ:** মূল সাইট অ্যাডমিন-বদলে `env.LIVE_WORKER.purge()` (Service Binding RPC; পাবলিক URL নয়) ডাকে → এখানকার এজ-ক্যাশ মোছে। না পৌঁছালে সর্বোচ্চ ৫ মিনিটে নিজে ঠিক হয়।
- ব্যর্থ হলে: ৫০৩ (ক্লায়েন্ট তখন আগের মতো সরাসরি Supabase-এ ফিরে যায়)। Supabase-এ সমস্যা হলে আগের মেমরি-ডেটা `no-store` দিয়ে।
- কোনো সিক্রেট নেই; `SUPABASE_ANON_KEY` পাবলিক (ব্রাউজারেও যায়)।

## রোলব্যাক (এক মিনিটে)
Cloudflare → Workers Routes → `vangcur.com/api/live-products*` মুছুন। রিকোয়েস্ট আবার মূল Worker-এর (অপরিবর্তিত) `app/api/live-products` রুটে যাবে।

## যাচাই
`node workers/live/test.mjs` — নকল Supabase দিয়ে আচরণ (ক্যাটাগরি-নিয়ম, ইনপুট যাচাই, ক্যাশ-হেডার, ব্যর্থতা) মেলায়।

## ডিপ্লয় (মূল সাইটের Workers Builds-এর অংশ নয়)
কোড বদলালে: `cd workers/live && npx wrangler deploy` (Cloudflare লগইন লাগে; wrangler ≥ 4.69 — Workers Caching-এর জন্য)।
⚠️ মূল সাইটের Workers Builds-এর ভেতর থেকে চালাবেন না — ওখানে `wrangler deploy` জোর করে মূল Worker-এর নামে বসে (scripts/deploy-static.mjs-এর মন্তব্য দেখুন)।
