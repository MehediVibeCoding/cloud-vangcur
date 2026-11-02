# 🔐 Vangcur — Environment Variables & Configuration Registry
**সর্বশেষ অডিট তারিখ:** অক্টোবর ২০২৬  
**ফ্রেমওয়ার্ক:** Next.js 16 (App Router, Server Actions, Route Handlers)  
**ডিপ্লয়মেন্ট প্ল্যাটফর্ম:** Cloudflare Workers (@opennextjs/cloudflare)

---

## 📌 ১. ওভারভিউ ও সিকিউরিটি আর্কিটেকচার (Overview & Security Model)

Vangcur প্ল্যাটফর্মের এনভায়রনমেন্ট ভেরিয়েবল আর্কিটেকচারটি Next.js 16-এর কঠোর নিরাপত্তা মডেল মেনে চলে। সিস্টেমে ব্যবহৃত ভেরিয়েবলগুলোকে প্রধানত দুটি স্তরে ভাগ করা হয়েছে:

1. **ক্লায়েন্ট-সাইড পাবলিক ভেরিয়েবলস (`NEXT_PUBLIC_*`):**
   - এই ভেরিয়েবলগুলো বিল্ড টাইমে ব্রাউজার বান্ডেলে এমবেড হয়।
   - এগুলো শুধুমাত্র পাবলিক এপিআই এন্ডপয়েন্ট, পাবলিক অ্যানন কী এবং ক্লায়েন্ট উইজেটের জন্য ব্যবহৃত হয়।
   - **নিয়ম:** কোনো সংবেদনশীল মাস্টার কী বা সিক্রেট টোকেন কখনো `NEXT_PUBLIC_` প্রিফিক্স দিয়ে রাখা যাবে না।

2. **সার্ভার-সাইড প্রাইভেট সিক্রেটস (Server-Only Secrets):**
   - এই ভেরিয়েবলগুলো `server-only` মডিউল, Server Actions (`app/actions/checkout.ts`) এবং Route Handlers (`app/api/*`)-এ সীমাবদ্ধ।
   - ব্রাউজারে এগুলো কখনো এক্সপোজ হয় না।
   - **নিয়ম:** `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TURNSTILE_SECRET_KEY`, `RECOVERY_HUB_HMAC_SECRET` ইত্যাদি কখনোই গিটহাবে কমিট করা যাবে না। এগুলো শুধুমাত্র Cloudflare Dashboard-এর Runtime Environment Variables/Secrets-এ কনফিগার করতে হবে।

---

## 📋 ২. এনভায়রনমেন্ট ভেরিয়েবল রেজিস্ট্রি টেবিল (Master Variable Registry)

| ভেরিয়েবলের নাম | স্কোপ (Scope) | ক্যাটাগরি ও সার্ভিস | আবশ্যক? (Required) | কনজিউমার ফাইলসমূহ (Usage Files) | উদ্দেশ্য ও ভূমিকা |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client/Server) | ডাটাবেজ ও অথ | **REQUIRED** | `lib/supabase/*.ts`<br>`app/page.tsx`<br>`app/sitemap.ts`<br>`app/product/[slug]/page.tsx`<br>`app/category/[slug]/page.tsx` | সুপাবেস প্রজেক্টের প্রধান HTTPS ইউআরএল। |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client/Server) | ডাটাবেজ ও অথ | **REQUIRED** | `lib/supabase/*.ts`<br>`app/page.tsx`<br>`app/sitemap.ts`<br>`app/product/[slug]/page.tsx`<br>`app/category/[slug]/page.tsx` | ক্লায়েন্ট এবং সাধারণ এসএসআর রিডের জন্য RLS-সুরক্ষিত পাবলিক অ্যানন কী। |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only (Private) | ডাটাবেজ সিকিউরিটি | **REQUIRED** | `lib/supabase/serviceClient.ts`<br>`app/actions/checkout.ts` | RLS বাইপাস করে সুরক্ষিতভাবে অর্ডার ইনসার্ট ও স্টক আপডেটের মাস্টার অ্যাডমিন কী। |
| `TELEGRAM_BOT_TOKEN` | Server-Only (Private) | অ্যাডমিন অ্যালার্টস | **REQUIRED** | `lib/telegram.ts`<br>`app/actions/checkout.ts` | অর্ডার সাবমিট হওয়ামাত্র টেলিগ্রাম বটের মাধ্যমে তাৎক্ষণিক নোটিফিকেশন পাঠানোর API টোকেন। |
| `TELEGRAM_CHAT_ID` | Server-Only (Private) | অ্যাডমিন অ্যালার্টস | **REQUIRED** | `lib/telegram.ts`<br>`app/actions/checkout.ts` | যে টেলিগ্রাম চ্যানেল/গ্রুপ বা অ্যাডমিনের চ্যাটে অর্ডারের বিস্তারিত বার্তা যাবে তার চ্যাট আইডি। |
| `TURNSTILE_SECRET_KEY` | Server-Only (Private) | বট প্রোটেকশন | Optional | `app/api/verify-turnstile/route.ts` | ক্লাউডফ্লেয়ার টার্নস্টাইল স্মার্ট ক্যাপচা টোকেন সার্ভার-সাইডে ভ্যালিডেট করার সিক্রেট কী। |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public (Client-Side) | বট প্রোটেকশন | Optional | `app/components/auth/TurnstileWidget.tsx` | ব্রাউজারে টার্নস্টাইল অদৃশ্য ক্যাপচা উইজেট মাউন্ট করার পাবলিক সাইট কী। |
| `RECOVERY_HUB_BASE_URL` | Server-Only (Private) | Abandoned-cart recovery | Optional | `lib/recoveryHub.ts`<br>`app/api/lead/route.ts` | Recovery Hub (Cloudflare Worker)-এর বেস URL — checkout draft ও stock-notification request দুটোই এখান থেকে `/api/ingest/draft` ও `/api/ingest/stock`-এ পাঠানো হয়। |
| `RECOVERY_HUB_INGEST_KEY` | Server-Only (Private) | Abandoned-cart recovery | Optional | `lib/recoveryHub.ts` | Recovery Hub-এর `api_keys` টেবিলে রেজিস্টার করা ingest API কী (prefix)। |
| `RECOVERY_HUB_HMAC_SECRET` | Server-Only (Private) | Abandoned-cart recovery | Optional | `lib/recoveryHub.ts` | Recovery Hub-এর সাথে শেয়ার করা HMAC সাইনিং সিক্রেট — দুই পাশেই (store + hub) একই value হতে হবে। |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Public (Client-Side) | মিডিয়া ডেলিভারি | Optional | `lib/cloudinaryUpload.ts` | ক্লাউডিনারি ক্লাউড নাম (না থাকলে ডিফল্ট `dkjzleczw` ফলব্যাক ব্যবহৃত হয়)। |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Public (Client-Side) | মিডিয়া ডেলিভারি | Optional | `lib/cloudinaryUpload.ts` | কাস্টমার রিভিউ ইমেজ আপলোডের আনসাইনড প্রিসেট (ডিফল্ট `vangcur_reviews`)। |
| `NEXT_PUBLIC_GTM_ID` | Public (Client-Side) | অ্যানালিটিক্স ও ট্র্যাকিং | Optional | `app/layout.tsx` | গুগল ট্যাগ ম্যানেজার কন্টেইনার আইডি (যেমন: `GTM-XXXXXXX`)। |

---

## 🛡️ ৩. নিরাপত্তা ও ফলব্যাক আচরণ (Security Rules & Graceful Fallback)

### ১. `SUPABASE_SERVICE_ROLE_KEY` (সর্বোচ্চ সংবেদনশীল)
- **কোড নিরাপত্তা:** এই কী-টি শুধুমাত্র `lib/supabase/serviceClient.ts` ফাইলে ইমপোর্ট হয় যা শীর্ষ লাইনে `'server-only'` প্রিমিটিভ দিয়ে লক করা। ক্লায়েন্ট কম্পোনেন্টে এটি কোনোভাবে ইমপোর্ট হলে নেক্সট.জেএস বিল্ড টাইমে এরর দেবে।
- **অনুপস্থিত থাকার প্রভাব:** অনুপস্থিত থাকলে চেকআউট সার্ভার অ্যাকশন (`createOrder`) তাৎক্ষণিকভাবে `ok: false, error: 'সার্ভার কনফিগারেশন সমস্যা, একটু পরে চেষ্টা করুন'` রিটার্ন করবে এবং কোনো ভুয়া বা আনঅথরাইজড অর্ডার ডাটাবেজে যাবে না (Fail-Closed Architecture)।

### ২. `NEXT_PUBLIC_SUPABASE_URL` ও `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **হোমপেজ ও এসএসআর রেজিলিয়েন্স:** `app/page.tsx` ও `app/category/[slug]/page.tsx`-এ সার্ভার ফেচ করার সময় এই ভেরিয়েবলগুলো মিসিং বা সাময়িক আনরিচেবল থাকলে সার্ভার ক্র্যাশ না করে নিরাপদে ডিফল্ট ক্যাটালগ ও ক্যাটাগরি ডাটা (`DEFAULT_CATEGORIES`, `DEFAULT_HERO_CARDS`) প্রদর্শন করে।

### ৩. `TELEGRAM_BOT_TOKEN` ও `TELEGRAM_CHAT_ID`
- **ব্যাকগ্রাউন্ড এক্সিকিউশন:** এই ভেরিয়েবল দুটি মিসিং থাকলে অর্ডার সফলভাবে ডাটাবেজে সেভ হবে, কিন্তু টেলিগ্রাম অ্যালার্ট প্রেরণ নিঃশব্দে স্কিপ হবে (চেকআউট ফ্লো আটকে থাকবে না)।

### ৪. `TURNSTILE_SECRET_KEY` ও `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- **গ্রেসফুল ডিগ্রেডেশন:** টার্নস্টাইল সাইট কী বা সিক্রেট কী কনফিগার করা না থাকলে `TurnstileWidget` কিছুই রেন্ডার করবে না এবং লগইন/রেজিস্ট্রেশন স্বাভাবিকভাবে কাজ করবে।

### ৫. `RECOVERY_HUB_BASE_URL` / `RECOVERY_HUB_INGEST_KEY` / `RECOVERY_HUB_HMAC_SECRET`
- **গ্রেসফুল ডিগ্রেডেশন:** তিনটার যেকোনো একটা মিসিং থাকলে `/api/lead` ব্যাকগ্রাউন্ড ফরওয়ার্ড চুপচাপ স্কিপ হয়ে যায়, ক্লায়েন্টকে তাৎক্ষণাৎ `{ ok: true }` রিটার্ন হয় — চেকআউট/স্টক-নোটিফাই ফ্লো কখনো আটকায় না।
- **নোট:** আগে এই একই জায়গায় `GOOGLE_APPS_SCRIPT_LEAD_URL` দিয়ে Google Sheets-এ পাঠানো হতো (checkout draft + stock notification দুটোই) — সেই পাইপলাইন সম্পূর্ণ সরিয়ে Recovery Hub (নিজস্ব Supabase + Cloudflare Worker) দিয়ে প্রতিস্থাপিত হয়েছে।

---

## 📝 ৪. প্রোডাকশন `.env.example` টেমপ্লেট

নতুন ডেভেলপার বা নতুন পরিবেশে প্রজেক্ট সেটআপ করার সময় নিচের টেমপ্লেটটি `.env.local` ফাইলে কপি করে মানগুলো বসাতে হবে:

```bash
# ==============================================================================
# 🗄️ SUPABASE DATABASE & AUTH CONFIGURATION (REQUIRED)
# ==============================================================================
# Supabase Project Dashboard -> Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ⚠️ CRITICAL SECRET: Never prefix with NEXT_PUBLIC_ / Never commit to GitHub
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==============================================================================
# 🤖 TELEGRAM BOT ORDER NOTIFICATIONS (REQUIRED FOR ADMIN ALERTS)
# ==============================================================================
# Created via @BotFather
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
# Admin Chat ID or Channel ID obtained via @userinfobot
TELEGRAM_CHAT_ID=123456789

# ==============================================================================
# 🛡️ CLOUDFLARE TURNSTILE CAPTCHA (OPTIONAL / ANTI-SPAM)
# ==============================================================================
# Cloudflare Dashboard -> Turnstile -> Add Site
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAAx...
TURNSTILE_SECRET_KEY=0x4AAAAAAAx...

# ==============================================================================
# 🔄 RECOVERY HUB — ABANDONED-CART + STOCK-NOTIFICATION FORWARDING (OPTIONAL)
# ==============================================================================
# Recovery Hub Cloudflare Worker-এর বেস URL (trailing slash ছাড়া)
RECOVERY_HUB_BASE_URL=https://recovery-hub.mehedivibecoding.workers.dev
# Recovery Hub-এর api_keys টেবিলে রেজিস্টার করা ingest key prefix
RECOVERY_HUB_INGEST_KEY=rhk_xxxxxxxxxxxxxxxx
# Recovery Hub-এর INGEST_HMAC_SECRET-এর সাথে হুবহু মিলতে হবে
RECOVERY_HUB_HMAC_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ==============================================================================
# ☁️ CLOUDINARY MEDIA CDN CONFIGURATION (OPTIONAL / DEFAULTS INCLUDED)
# ==============================================================================
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dkjzleczw
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=vangcur_reviews

# ==============================================================================
# 📈 GOOGLE TAG MANAGER CONTAINER ID (OPTIONAL)
# ==============================================================================
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```
