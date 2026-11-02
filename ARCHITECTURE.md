# 🏛️ Vangcur — System Architecture & Technical Specifications
**তারিখ:** সেপ্টেম্বর ২০২৬  
**স্ট্যাক:** Next.js 16 (App Router, Server Actions) + React 19 + TypeScript (Strict) + Motion (v13) + Tailwind CSS + Supabase (PostgreSQL, RLS) + Cloudinary + Zustand

---

## 📌 ১. উচ্চ-পর্যায়ের সিস্টেম ওভারভিউ (High-Level System Overview)

Vangcur একটি আধুনিক, উচ্চ-পারফরম্যান্স ই-কমার্স প্ল্যাটফর্ম যা টেক গ্যাজেট ও লাইফস্টাইল অ্যাক্সেসরিজ বিক্রির জন্য ডিজাইন করা হয়েছে। প্ল্যাটফর্মটি সার্ভার-সাইড রেন্ডারিং (SSR/ISR), হাইব্রিড ক্লায়েন্ট হাইড্রেশন, জিরো-ট্রাস্ট সিকিউরিটি আর্কিটেকচার এবং মেমোরি-দক্ষ রিয়েল-টাইম স্টেট ম্যানেজমেন্টের সমন্বয়ে গঠিত।

```
                       [ Client Devices / Browsers ]
                                     │
                                     ▼
                [ Cloudflare CDN / Next.js Edge Middleware ]
                   ├── Rate Limiting (IP/Window)
                   ├── Malicious Probe Blocking
                   └── Security Headers & Cookie Sync
                                     │
                   ┌─────────────────┴─────────────────┐
                   ▼                                   ▼
        [ Next.js Server (RSC) ]            [ Server Actions / APIs ]
         ├── app/page.tsx                    ├── app/actions/checkout.ts
         ├── app/product/[slug]/page.tsx     ├── app/api/lead/route.ts
         └── React cache() + ISR (120s-300s) └── app/api/verify-turnstile/route.ts
                   │                                   │
                   ├───────────────────────────────────┤
                   ▼                                   ▼
          [ Supabase Service Client / Anon Client ]  [ External Services ]
           ├── Database (PostgreSQL with RLS)         ├── Cloudinary CDN (Media)
           ├── Auth (Email / Google OAuth)            ├── Telegram Bot API
           ├── Realtime Channels (WebSockets)         ├── Google Sheets (Leads)
           └── Stored RPCs (Stock/RateLimit/Coupons)  └── Open-Meteo Weather API
```

---

## 🏗️ ২. সার্ভার বনাম ক্লায়েন্ট কম্পোনেন্ট আর্কিটেকচার (RSC Layering)

Next.js 16 App Router আর্কিটেকচারে পারফরম্যান্স এবং এসইও (SEO) অপ্টিমাইজ করতে **সার্ভার-ফার্স্ট হাইব্রিড রেন্ডারিং প্যাটার্ন** অনুসরণ করা হয়:

### ১. সার্ভার কম্পোনেন্টস (Server Components - RSC)
- **রুট এন্ট্রি পয়েন্টসমূহ:** `app/page.tsx`, `app/product/[slug]/page.tsx`, `app/category/[slug]/page.tsx`, `app/search/page.tsx`, `app/offers/page.tsx`।
- **দায়িত্ব:**
  - ডাটাবেজ থেকে ডাটা সরাসরি সার্ভার মেমোরিতে ফেচ করা (`fetchCustomProducts`, `fetchProductById`, `fetchCategories`)।
  - React `cache()` ও Edge ISR (`revalidate = 120` / `300`) ব্যবহার করে একাধিক ফেচ কল একত্রিত ও ক্যাশ করা।
  - ডায়নামিক এসইও মেটাডেটা (`generateMetadata`) এবং JSON-LD স্কিমা ইনজেকশন।
  - ক্লায়েন্ট হাইড্রেশন ফ্ল্যাশ বা লেআউট শিফট (CLS) রোধে ক্লায়েন্ট কম্পোনেন্টকে `initialProducts`, `initialCategories`, `initialHeroCards` প্রপ হিসেবে পাঠানো।

### ২. ক্লায়েন্ট লিফ কম্পোনেন্টস (Client Leaf Components)
- **ইন্টারেক্টিভ শেলসমূহ:** `ClientHome.tsx`, `ProductDetailClient.tsx`, `AccountClient.tsx`, `OffersClient.tsx`।
- **দায়িত্ব:**
  - ইউজার ইন্টারঅ্যাকশন (কার্ট, উইশলিস্ট, ইমেজ গ্যালারি জুম, কুপন অ্যাপ্লাই, টোস্ট)।
  - Zustand স্টোরের সাথে লাইভ সিঙ্ক।
  - সুপাবেস রিয়েল-টাইম সাবস্ক্রিপশন (`postgres_changes`) শোনা।

---

## 🔒 ৩. জিরো-ট্রাস্ট অর্ডার ও সার্ভার অ্যাকশন লাইফসাইকেল (`app/actions/checkout.ts`)

অর্ডার প্রসেসিং ১০০% সার্ভার-অথরিটেটিভ এবং জিরো-ট্রাস্ট মডেল মেনে চলে। ক্লায়েন্ট থেকে পণ্যের দাম বা অগ্রিম ফি-র কোনো হিসাব সার্ভার গ্রহণ করে না।

```
[ ইউজার "অর্ডার কনফার্ম" বাটনে ক্লিক করে ]
                  │
                  ▼
   [ Server Action: createOrder(payload) ]
                  │
  ├── ১. ইনপুট স্যানিটাইজেশন ও রিজেক্স ভ্যালিডেশন (Name, Phone, District, Address, TxnID)
  ├── ২. ইউজার অথেন্টিকেশন ও মডারেটর রোল চেক (mehedivibecoding@gmail.com bypass)
  ├── ৩. রেট লিমিট ভেরিফিকেশন (Phone & Fingerprint RPCs)
  ├── ৪. ডাটাবেজ থেকে আসল প্রোডাক্ট প্রাইস ও শিপিং কনফিগ ফেচ
  ├── ৫. সার্ভার-সাইড কুপন ভ্যালিডেশন RPC (validate_and_apply_coupon)
  ├── ৬. ৩-টায়ার ডায়নামিক অগ্রিম পেমেন্ট ও ১.৫% বিকাশ ফি হিসাব
  ├── ৭. ২০,০০০ টাকার সীমা যাচাই (টায়ার ৩ WhatsApp গার্ড)
  ├── ৮. অটোমিক স্টক ডিক্রিমেন্ট RPC (decrement_product_stock)
  ├── ৯. সুপাবেস `orders` টেবিলে সুরক্ষিত ইনসার্ট (Service Role Client)
  └── ১০. Next.js 16 `after()` ব্যাকগ্রাউন্ড টাস্ক
           ├── কুপন ব্যবহার কাউন্টার আপডেট (increment_coupon_usage)
           └── টেলিগ্রাম বটের মাধ্যমে এডমিনকে বিস্তারিত অর্ডার অ্যালার্ট প্রেরণ
```

---

## 🛡️ ৪. এজ মিডলওয়্যার ও সিকিউরিটি আর্কিটেকচার (`middleware.ts`)

1. **ক্ষতিকর বট প্রোব ড্রপ:** `.env`, `.git`, `wp-admin`, `phpmyadmin` ইত্যাদি সন্দেহজনক রুটে রিকোয়েস্ট আসতেই সাথে সাথে এজেই `404` রিটার্ন করে ব্লক করা হয়।
2. **ইন-মেমোরি এজ রেট লিমিটিং:**
   - সাধারণ পেজ রুটে: ১০ সেকেন্ডে সর্বোচ্চ ১২০টি রিকোয়েস্ট প্রতি আইপি।
   - API রুটে: ১০ সেকেন্ডে সর্বোচ্চ ৩০টি রিকোয়েস্ট প্রতি আইপি।
   - সীমা অতিক্রম করলে তাৎক্ষণিক `429 Too Many Requests` হেডার সহ ব্লক হয়।
3. **ক্লিকজ্যাকিং ও ব্রাউজার সুরক্ষা হেডার্স:**
   - `X-Frame-Options: SAMEORIGIN`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
4. **সুপাবেস কুকি সেশন রিফ্রেশ:** `@supabase/ssr` ব্যবহার করে প্রতি রিকোয়েস্টে নিরাপদে কুকি বেসড সেশন রিফ্রেশ করা হয়।

---

## ⚡ ৫. স্টেট ম্যানেজমেন্ট ও পারসিস্টেন্স আর্কিটেকচার (Zustand)

অ্যাপ্লিকেশন স্টেট ম্যানেজমেন্টের জন্য ৪টি নিবেদিত Zustand স্টোর ব্যবহার করা হয়েছে (`lib/store/`):

1. **`useCartStore` (`lib/store/cartStore.ts`):**  
   কার্টের পণ্য তালিকা, পরিমাণ (+/-), স্টক সীমা যাচাই এবং `vc_cart` লোকাল স্টোরেজে ডিবউন্সড পারসিস্টেন্স।
2. **`useWishlistStore` (`lib/store/wishlistStore.ts`):**  
   পছন্দের পণ্য সংরক্ষণ, টগল অ্যাকশন, `vc_wish` লোকাল স্টোরেজ এবং লগইন করা ইউজারের ক্ষেত্রে সুপাবেস `profiles` টেবিলের সাথে দ্বি-মুখী ক্লাউড সিঙ্ক।
3. **`useAuthStore` (`lib/store/authStore.ts`):**  
   বর্তমান লগইন থাকা ইউজারের অবজেক্ট (`CurrentUser`), গুগল সাইন-ইন স্টেট এবং `vc_user` লোকাল পারসিস্টেন্স।
4. **`useLanguageStore` (`lib/store/languageStore.ts`):**  
   ভাষা নির্বাচন (`bn` / `en`), `vc_lang` লোকাল স্টোরেজ এবং সার্ভার সাইডে মেটাডেটা রেন্ডারিংয়ের সুবিধার্থে ১ বছরের মেয়াদী `vc_lang` কুকি রিফ্লেকশন।

---

## 🌐 ৬. থার্ড-পার্টি ইন্টিগ্রেশন ও সার্ভিস আর্কিটেকচার

| সার্ভিস | ভূমিকা ও আর্কিটেকচারাল বাস্তবায়ন |
| :--- | :--- |
| **Supabase (PostgreSQL & Auth)** | ডাটাবেজ স্টোরেজ, RLS নিরাপত্তা, গুগল OAuth, রিয়েল-টাইম লাইভ ব্রডকাস্ট এবং সংরক্ষিত RPCs। |
| **Cloudinary (CDN & Upload)** | প্রোডাক্ট ইমেজ ডেলিভারি (`optimizeCloudinaryUrl`) এবং কাস্টমার রিভিউতে ক্লায়েন্ট-সাইড ক্যানভাস WebP কম্প্রেশন আপলোড। |
| **Cloudflare Turnstile** | ফর্ম ও অথেনটিকেশনে অদৃশ্য স্মার্ট ক্যাপচা বট প্রোটেকশন (`/api/verify-turnstile`)। |
| **Telegram Bot API** | অর্ডার সাবমিট হওয়ামাত্র এডমিন ও সাপোর্ট টিমকে রিয়েল-টাইম অ্যালার্ট পাঠানো (`lib/telegram.ts`)। |
| **Google Sheets Integration** | এবানডনড চেকআউট ড্রাফট ও স্টক নোটিফিকেশন ব্যাকগ্রাউন্ডে গুগল শিটে রেকর্ড করা (`/api/lead`)। |
| **Open-Meteo Weather API** | কাস্টমারের জেলা বা অক্ষাংশ অনুযায়ী লাইভ আবহাওয়া ফেচ করে প্রোফাইলে রিয়েল-টাইম বৃষ্টি অ্যানিমেশন নিয়ন্ত্রণ (`lib/accountData.ts`)। |
| **Google Tag Manager (GTM)** | ই-কমার্স ইভেন্টস (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`) ডাটা-লেয়ারে পুশ (`lib/analytics.ts`)। |

---

## 📱 ৭. ব্রাউজার হিস্ট্রি ও মডাল ট্রানজিশন ইঞ্জিন (`lib/useHistoryModal.ts`)

- **সমস্যা সমাধান:** মোবাইলের ফিজিক্যাল বা জেসচার ব্যাক বাটন চাপলে ওয়েবসাইট ব্যাকে না গিয়ে ওপেন থাকা ড্রয়ার/মডাল যাতে বন্ধ হয়, তার জন্য সেন্ট্রালাইজড হিস্ট্রি ইঞ্জিন।
- **পপস্টেট রেস-কন্ডিশন সমাধান (`suppressHistoryCleanup`):** কোনো মডাল বা ড্রয়ার থেকে সরাসরি চেকআউট বা অন্য পেজে নেভিগেট করার সময় (`router.push`) হিস্ট্রি ক্লিনিংয়ের বিলম্বিত `window.history.back()` কলকে ওভাররাইড করে নিশ্চিত নেভিগেশন কার্যকর করা হয়েছে।

---

## 🔤 ৮. টাইপোগ্রাফি ও ইউনিকোড-রেঞ্জ আর্কিটেকচার

- **বেস ফন্ট:** ইংরেজি টেক্সটের জন্য `DM Sans` এবং বাংলা কন্টেন্টের জন্য `Hind Siliguri` (`app/fonts.ts`)।
- **ডিজিট-অনলি ইউনিকোড-রেঞ্জ ইঞ্জিন (`app/layout.tsx`):**  
  `Noto Sans Bengali` ফন্টটিকে শুধুমাত্র বাংলা সংখ্যার ইউনিকোড-রেঞ্জ (`০-৯`) সীমাবদ্ধ করে লোড করা হয়েছে। এর ফলে সাইটের সমস্ত সংখ্যা (মূল্য, তারিখ, ফোন নম্বর) সর্বত্র সমানুপাতিক ও অত্যন্ত স্পষ্ট রেন্ডার হয়।
