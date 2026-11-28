# 💳 `vangcur-api`-র বিকাশ-ওয়েবহুক ও গেম-স্কোর

মূল README-র চারটা রুটের সাথে আরও দুটো: `POST /api/bkash-webhook`, `GET|POST /api/game-score`। আচরণ পুরনো `app/api/<রুট>/route.ts`-এর হুবহু (ওগুলো রোলব্যাকের জন্য রাখা — মুছবেন না)।

## ⚠️ বাড়তি সিক্রেট (`npx wrangler secret put <NAME>`; মান মূল সাইটের সাথে এক)
`BKASH_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`। (ঐচ্ছিক ভ্যার `BKASH_MAX_AMOUNT`, ডিফল্ট ৬০০০।)
**`SUPABASE_SERVICE_ROLE_KEY` সব ক্ষমতা দেয়** — এখন দুই Worker-এ থাকবে। কোথাও কমিট/লগ/স্ক্রিনশট করবেন না (রিপো পাবলিক)। কী বদলালে দুই জায়গাতেই বদলান।

## bkash-webhook
SMS-ফরওয়ার্ডার অ্যাপ → `x-bkash-secret` যাচাই → `bkash_inbox`-এ লেখা → TrxID/শেষ-৪-ডিজিট দিয়ে পেন্ডিং অর্ডার খোঁজা → DB-র `match_bkash_payment` RPC → ম্যাচ হলে Telegram। DB এরর হলে `500` (ফরওয়ার্ডার পরে আবার পাঠায়); একই TrxID আবার এলে `ok+duplicate`।
**চালুর আগে:** ফরওয়ার্ডারের URL একই (`https://vangcur.com/api/bkash-webhook`) থাকে — শুধু Route বসে। একটা ছোট টাকার টেস্ট-SMS/`curl` দিয়ে `bkash_inbox`-এ সারি এল কিনা দেখুন। টাকার পথ — শান্ত সময়ে চালু করুন; সমস্যা হলে Route মুছলেই পুরনো রুটে ফেরত।

## game-score — "দ্রুত পথ + মূল Worker-এ ছেড়ে দেওয়া"
ছোট Worker নিজে সামলায়: (ক) টপ-৩ পড়া, (খ) অর্ডার-ভিত্তিক খেলা যেখানে `phone` আছে ও `get_guest_order` ফোন মেলায়।
**বাকি সব মূল Worker-এ যায়** (Service Binding `MAIN_WORKER`, বডি/কুকি হুবহু): `source:'account'`, `?me=1`, ফোন নেই, ফোন না মিললে। কারণ লগইন-কুকি/টোকেন-রিফ্রেশ/RLS-মালিকানা Next.js-এর `@supabase/ssr`-এ — ছোট Worker-এ নকল করলে লগইন-ইউজারের খেলা ভাঙার ঝুঁকি।
⚠️ এই "ছেড়ে দেওয়া" পথ **আসল Cloudflare-এ এখনো পরীক্ষা হয়নি** (শুধু মক-টেস্ট)। Route বসিয়ে আগে এটা দেখুন: লগইন অবস্থায় অ্যাকাউন্ট-পেজের গেম খেলে স্কোর উঠছে কিনা; ওয়েটিং-পেজের গেম খেলা। কিছু ভাঙলে Route মুছুন।
