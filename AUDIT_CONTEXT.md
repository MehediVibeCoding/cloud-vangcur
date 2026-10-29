# AUDIT_CONTEXT — রিপোর্ট/অডিট চালানোর আগে এটা পড়ুন

AI Studio বা অন্য কোনো টুল দিয়ে কোড-রিপোর্ট বানালে এই ফাইলটা প্রম্পটের সাথে দিন। নিচের বিষয়গুলো বারবার ভুয়া ফ্ল্যাগ হয়েছে।

## স্ট্যাক (যা সত্য)
- **Next.js 16** (`package-lock.json`-এ আসল ভার্সন)। `revalidateTag('catalog', { expire: 0 })` Next 16-এ বৈধ।
- হোস্টিং **Cloudflare Workers** (OpenNext)। Vercel ব্যবহার হয় না। রিকোয়েস্ট সবসময় Cloudflare এজ দিয়ে আসে, তাই `cf-connecting-ip` নির্ভরযোগ্য।
- ডাটাবেজ **Supabase**। নিরাপত্তার আসল স্তর **DB-তে**: RLS, trigger ও RPC। শুধু রুট/ক্লায়েন্ট কোড দেখে "সুরক্ষা নেই" বলা ভুল হবে।

## DB-তে সুরক্ষিত (কোডে আলাদা চেক নেই, থাকার কথাও না)
- **গেম স্কোর:** `submit_game_score` স্কোর ক্যাপ করে (১০০০), শুধু service-role চালাতে পারে।
- **bKash ম্যাচিং:** `match_bkash_payment` — TrxID ইউনিক; শেষ-৪-ডিজিট পথে একই last4 বা TrxID-সংঘর্ষের অন্য পেন্ডিং অর্ডার থাকলে স্বয়ংক্রিয় ম্যাচ হয় না।
- **কুপন:** `validate_and_apply_coupon` ক্যাপ-সহ ছাড় ও `max_discount_amount` ফেরত দেয়। চূড়ান্ত দাম সার্ভার চেকআউটে `custom_products` থেকে আবার হিসাব হয়, ক্লায়েন্টের দাম বিশ্বাস করা হয় না।
- **অ্যাডমিন/রিভিউ/গেস্ট অর্ডার/স্টক:** trigger ও RLS দিয়ে সুরক্ষিত। `is_admin_user` anon-এ `false` দেয়; `get_guest_order`-এ UUID ও ফোন দুটোই মিলতে হয়।
- কিছু টেবিলে (`bkash_inbox`, `order_private`, `order_risk` ইত্যাদি) RLS চালু কিন্তু policy নেই — এটা ইচ্ছাকৃত deny-all, শুধু service-role পারে।

## ইচ্ছাকৃত সিদ্ধান্ত (বাগ না)
- গেস্টদের জন্য ডার্ক মোড বন্ধ (`themeStore.ts`)।
- Analytics/ট্র্যাকার ৩.৫ সেকেন্ড দেরিতে লোড (LCP-র জন্য)।
- `/checkout/status` রিফ্রেশে হোমে পাঠানো (অর্ডার হারায় না, `softenPendingOrder()`)।
- `HeroSlider`-এ `flushSync` একবার চলে; এটা deprecated না।
- সার্চে URL শুধু `history.replaceState` দিয়ে আপডেট হয়।
- `lib/telegram.ts`-এ `const e = escapeTelegramHtml` শুধু অ্যালিয়াস; সংখ্যা মান escape ছাড়াই ঠিক।
- `subscribe*`/Realtime: কনট্যাক্ট ও ফুটার সেটিংস স্ট্যাটিক; অর্ডার স্ট্যাটাসের Realtime শুধু লগইন ইউজারের জন্য (গেস্টে পোলিং)।
- সাইটে ডার্ক মোড `globals.css`-এর `.dark …` ওভাররাইড দিয়ে চলে, Tailwind `dark:` ভ্যারিয়েন্ট দিয়ে নয়।
- ইনভয়েসের দুই ফাইল (`renderInvoiceHtml`/`renderInvoiceSvg`) Satori-র সীমাবদ্ধতায় আলাদা, হাতে মেলাতে হয়।
- `getClientIp`-এর `x-forwarded-for` শুধু লোকাল `next dev`-এর ফলব্যাক।

## কোডে `INTENTIONAL` মার্কার খুঁজুন
`grep -rn INTENTIONAL app lib` — এই জায়গাগুলো ইচ্ছাকৃত, বাগ হিসেবে ধরবেন না।
