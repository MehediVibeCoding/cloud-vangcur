# 📐 Vangcur — Official Coding Conventions & Developer Standards
**সর্বশেষ অডিট তারিখ:** সেপ্টেম্বর ২০২৬  
**প্রযোজ্য পরিবেশ:** Next.js 16 (App Router), React 19, TypeScript (Strict), Tailwind CSS v3, Zustand v5, Supabase, Cloudinary  
**উদ্দেশ্য:** প্ল্যাটফর্মের ব্যবসায়িক স্থায়িত্ব, জিরো-বাগ ডিপ্লয়মেন্ট, কোড কনসিস্টেন্সি এবং জিরো-রিগ্রেশন নিশ্চিত করা।

---

## 📌 ১. ফাইল, ডিরেক্টরি ও আইডেন্টিফায়ার নেমিং স্ট্যান্ডার্ডস (Naming Conventions)

### ১. ফাইল ও ফোল্ডার নেমিং
- **React UI কম্পোনেন্টস:** PascalCase (যেমন: `Navbar.tsx`, `ProductCard.tsx`, `CartSidebar.tsx`, `BulkOrderModal.tsx`)।
- **ক্লায়েন্ট রাউট র্যাপার কম্পোনেন্টস:** `[Name]Client.tsx` (যেমন: `ProductDetailClient.tsx`, `InvoiceClient.tsx`, `AccountClient.tsx`, `SearchClient.tsx`)।
- **ডাটা ও শেয়ার্ড ইউটিলিটি মডিউল:** camelCase সহ প্রাসঙ্গিক `Data.ts` বা ফাংশন নাম (যেমন: `productData.ts`, `checkoutData.ts`, `security.ts`, `toast.ts`, `telegram.ts`)।
- **কাস্টম রিঅ্যাক্ট হুকস:** camelCase সহ `use` প্রিফিক্স (যেমন: `useT.ts`, `useHistoryModal.ts`)।
- **Zustand স্টেট স্টোরস:** camelCase সহ `Store.ts` সাফিক্স (যেমন: `cartStore.ts`, `wishlistStore.ts`, `authStore.ts`, `languageStore.ts`)।
- **রাউট ফোল্ডার্স (Next.js Routes):** kebab-case (যেমন: `app/track-order/`, `app/reset-password/`, `app/category/[slug]/`, `app/(policies)/privacy-policy/`)।

### ২. আইডেন্টিফায়ার ও ভেরিয়েবল নেমিং
- **ধ্রুবক (Constants) ও গ্লোবাল ইভেন্ট:** UPPER_SNAKE_CASE (যেমন: `MAX_ONLINE_ORDER_TOTAL = 20000`, `OPEN_BULK_ORDER_EVENT`, `DEFAULT_SHIP_CFG`)।
- **লোকাল স্টোরেজ ও সেশন স্টোরেজ কী:** `vc_[snake_case]` (যেমন: `vc_cart`, `vc_wish`, `vc_user`, `vc_lang`, `vc_pending_ls`, `vc_applied_coupon`)।
- **ফাংশন ও মেথড:** camelCase ও অ্যাকশন-ভিত্তিক (যেমন: `calculateAdvancePayment()`, `fetchCustomProducts()`, `startQuickOrder()`, `sanitizePlainName()`)।
- **টাইপস্ক্রিপ্ট টাইপস ও ইন্টারফেস:** PascalCase (যেমন: `Product`, `Order`, `CartItem`, `ActionResponse<T>`)।

---

## 📦 ২. ইমপোর্ট অর্ডারিং স্ট্যান্ডার্ড (Import Hierarchy)

প্রতিটি ফাইলে ইমপোর্ট স্টেটমেন্টগুলো অবশ্যই সুনির্দিষ্ট ক্রম মেনে সাজাতে হবে:

1. **React ও Next.js কোর বিল্ট-ইনস:**
   import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
   import { useRouter, usePathname, useSearchParams } from 'next/navigation';
   import Link from 'next/link';
   import dynamic from 'next/dynamic';
   import { after } from 'next/server';

2. **থার্ড-পার্টি এক্সটার্নাল লাইব্রেরিস:**
   import { motion, AnimatePresence } from 'motion/react';
   import { createClient } from '@supabase/supabase-js';
   import DOMPurify from 'isomorphic-dompurify';

3. **শেয়ার্ড ইউটিলিটিস ও স্টেট স্টোরস (`lib/`):**
   import { useCartStore, cartTotal } from '@/lib/store/cartStore';
   import { showToast } from '@/lib/toast';
   import { sanitizePlainName, validateName } from '@/lib/security';
   import { useT } from '@/lib/i18n/useT';

4. **UI কম্পোনেন্টস ও মডালস (`app/components/`):**
   import Navbar from '@/app/components/layout/Navbar';
   import ProductCard from '@/app/components/home/ProductCard';
   import PremiumButton from '@/app/components/ui/PremiumButton';

5. **টাইপস্ক্রিপ্ট টাইপ ডেফিনিশন (`types/index.ts`):**
   import type { Product, Order, CartItem, ActionResponse } from '@/types';

---

## 🛡️ ৩. টাইপস্ক্রিপ্ট ও টাইপ সেফটি প্রোটোকল (Strict Typing Rules)

1. **সেন্ট্রালাইজড টাইপ সোর্স:**
   - অ্যাপ্লিকেশনের সমস্ত শেয়ার্ড ডাটা মডেল (`Product`, `Order`, `OrderItem`, `CurrentUser`, `Category`, `CartItem`, `WishlistItem`) অবশ্যই `types/index.ts` ফাইলে সংজ্ঞায়িত থাকতে হবে।
   - কোনো কম্পোনেন্টে আলাদা করে লোকাল ডুপ্লিকেট ইন্টারফেস তৈরি করা নিষিদ্ধ।

2. **🚫 `any` টাইপ নিষিদ্ধ:**
   - কোনো অজানা ডাটা বা ডাটাবেজ রেসপন্স হ্যান্ডেল করার জন্য `unknown` ব্যবহার করে `parseJsonish()` বা টাইপ গার্ড দিয়ে টাইপ যাচাই করতে হবে।

3. **🚫 TS1117 ডুপ্লিকেট কী প্রতিরোধ:**
   - কোনো অবজেক্ট বা ইন্টারফেসে একই কী একাধিকবার লেখা সম্পূর্ণ নিষিদ্ধ। কোড ডেলিভারির আগে টাইপস্ক্রিপ্ট কম্পাইলার চেক (`npx tsc --noEmit`) নিশ্চিত করতে হবে।

4. **সার্ভার অ্যাকশন টাইপ স্ট্রাকচার:**
   - প্রতিটি সার্ভার অ্যাকশনের রিটার্ন টাইপ অবশ্যই `Promise<ActionResponse<T>>` ফরম্যাট মেনে চলবে:
     export interface ActionResponse<T = unknown> {
       ok: boolean;
       data?: T;
       reason?: string;
       error?: string;
     }

---

## ⚡ ৪. React 19 ও Next.js 16 রেন্ডারিং নীতি (RSC vs Client)

1. **সার্ভার বনাম ক্লায়েন্ট বাউন্ডারি:**
   - প্রতিটি রুট ডিরেক্টরির `page.tsx` ফাইলকে ডিফল্টভাবে Server Component (RSC) রাখতে হবে।
   - শুধুমাত্র ইউজার ইন্টারঅ্যাকশন, হুক এবং অ্যানিমেশনযুক্ত কম্পোনেন্টের প্রথম লাইনে `'use client'` ডিরেক্টিভ বসাতে হবে।
   - সার্ভার-অনলি মডিউলগুলোতে (`lib/supabase/serviceClient.ts`, `lib/telegram.ts`) প্রথম লাইনে অবশ্যই `import 'server-only'` থাকতে হবে।

2. **অসীম লুপ প্রতিরোধে `useCallback` রুল:**
   - `useT()` থেকে রিটার্ন করা অনুবাদ ফাংশন `t` অবশ্যই `useCallback` দিয়ে মেমোইজড থাকতে হবে।
   - কোনো ক্লায়েন্ট ফাংশন যদি `useEffect` বা ইভেন্ট লিসেনারের ডিপেন্ডেন্সি হিসেবে পাস হয়, তবে তাকে অবশ্যই `useCallback` দিয়ে আবদ্ধ করতে হবে।

3. **Next.js 16 `after()` প্রিমিটিভের ব্যবহার:**
   - ক্লায়েন্টের রেসপন্স বিলম্বিত না করে ব্যাকগ্রাউন্ড টাস্ক (টেলিগ্রাম অ্যালার্ট, কুপন ব্যবহারের সংখ্যা বৃদ্ধি, গুগল শিট লিড পুশ) সম্পন্ন করতে অবশ্যই Server Action ও Route Handler-এ `after(async () => { ... })` ব্যবহার করতে হবে।

4. **ডাইনামিক ক্লায়েন্ট হাইড্রেশন সেফটি:**
   - লোকাল স্টোরেজ নির্ভর উইজেটগুলোতে হাইড্রেশন মিসম্যাচ রোধে ক্লায়েন্ট মাউন্টিং ফ্ল্যাগ (`useEffect(() => setMounted(true), [])`) ব্যবহার করুন।

---

## 🎨 ৫. UI/UX ও Tailwind CSS কনভেনশনস (Design Standards)

1. **ট্রাই-কালার ক্যানভাস স্ট্যান্ডার্ড:**
   - সমস্ত পেজ, ব্যাকড্রপ, মডাল এবং সাইড ড্রয়ারের মূল ব্যাকগ্রাউন্ড গ্রেডিয়েন্ট হবে:
     `bg-gradient-to-b from-brand-bg/35 via-[#DCEBFD]/45 to-white`

2. **কালার স্ট্যান্ডার্ড ও নিষিদ্ধ কনফ্লিক্ট:**
   - **প্রধান সিগনেচার স্কাই-ব্লু:** `#44A7FC` (`brand-light`, hover `#3C93DE`) — সব অ্যাক্টিভ বাটন, লিংক, আইকন ও হাইলাইটে এটিই ব্যবহার করতে হবে।
   - **ডিপ ব্লু:** `#0058C7` (`brand-primary`) — শুধুমাত্র লোগো ও হাই-কন্ট্রাস্ট টাচের জন্য। সাধারণ বাটন বা ব্যাকগ্রাউন্ডে এটি কখনো ব্যবহার করবেন না।

3. **🚫 নো-সেরিফ রুল:**
   - কোনো হেডিং, টাইটেল বা টেক্সটে `font-display` (Playfair Display) ব্যবহার করা যাবে না। সব হেডিং হবে:
     `font-body font-bold text-ink` (বা `font-extrabold`)।

4. **🚫 নো-ইমোজি পলিসি:**
   - ইউজার ইন্টারফেসে কাঁচা ইমোজি ব্যবহার নিষিদ্ধ। সব জায়গায় প্রফেশনাল হ্যান্ড-ড্রন লাইন SVG আইকন ব্যবহার করুন।
   - *(একমাত্র ব্যতিক্রম: `OrderCard`-এর মেটা ইনফো লাইনে সুস্পষ্টতার জন্য অনুমোদিত 📅 ও 👤 ইমোজি)*।

5. **প্রাইস রেন্ডারিং ও ফরম্যাটিং:**
   - পণ্যের মূল্য সবসময় ইংরেজি ডিজিটে রেন্ডার হবে:
     `৳{price.toLocaleString('en-US')}` (যেমন: ৳1,250 / ৳11,350)।
   - পিস লেবেল: বাংলায় **"৩ পিছ"** / ইংরেজিতে **"3 Pcs"**।

6. **সিগনেচার প্রাইমারি বাটন স্ট্যান্ডার্ড:**
   `shimmer-sheen w-full rounded-full bg-gradient-to-r from-info to-brand-light py-[13.5px] font-body text-[15px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03] active:scale-95 disabled:opacity-60`

7. **ইনপুট ফিল্ড ও ফোকাস স্ট্যান্ডার্ড:**
   - শার্প চারকোনা আউটলাইন নিষিদ্ধ (`globals.css`-এ গ্লোবালি রিমুভড)। ইনপুটে গোলাকার বর্ডার (`rounded-[14px]` বা `rounded-full`) এবং ফোকাস স্টেট হবে `focus:border-brand-light focus:shadow-[0_0_0_3px_rgba(68,167,252,.12)]`।

---

## 📱 ৬. ব্রাউজার হিস্ট্রি ও মডাল নেভিগেশন প্রোটোকল (`useHistoryModal`)

1. **সার্বজনীন ব্যাক বাটন হ্যান্ডলিং:**
   - প্রতিটি সেন্ট্রাল মডাল ও স্লাইড-ইন ড্রয়ারে অবশ্যই `useHistoryModal(isOpen, onClose, 'modal-key')` হুক ব্যবহার করতে হবে যাতে মোবাইলের ব্যাক বাটন চাপলে ওয়েবসাইট ব্যাকে না গিয়ে ওপেন থাকা উইন্ডোটি বন্ধ হয়।

2. **নেভিগেশন সেফটি গার্ড (`suppressHistoryCleanup`):**
   - যখনই কোনো মডাল বা ড্রয়ার বন্ধ করার (`onClose()` / `setOpen(false)`) ঠিক পরপরই `router.push()` দিয়ে নেভিগেট করা হবে, তখন সেই `router.push()`-এর ঠিক আগের লাইনে অবশ্যই `suppressHistoryCleanup()` কল করতে হবে:
     onClose();
     suppressHistoryCleanup();
     router.push('/checkout');
   - এটি না দিলে বিলম্বিত `window.history.back()` নতুন পেজের আসল নেভিগেশনকে বাতিল করে ব্যবহারকারীকে আগের পেজে আটকে রাখবে।

---

## 🔒 ৭. সিকিউরিটি, স্যানিটাইজেশন ও জিরো-ট্রাস্ট অর্ডার ইঞ্জিন

1. **ইনপুট স্যানিটাইজেশন (`lib/security.ts`):**
   - গ্রাহকের নাম: `sanitizePlainName(value)` (শুধুমাত্র বর্ণ ও স্পেস, সর্বোচ্চ ৩০ অক্ষর)।
   - ইমেইল: `sanitizeEmailInput(value)` ও `validateEmail(value)`।
   - ডেলিভারি ঠিকানা: `sanitizeAddressInput(value)` ও `validateAddress(value)`।
   - ফোন নম্বর: `validatePhone(value)` (১১ ডিজিটের বাংলাদেশি নম্বর: `^01[3-9]\d{8}$`)।

2. **ডায়নামিক HTML ও SVG স্যানিটাইজেশন:**
   - `dangerouslySetInnerHTML` ব্যবহার করার সময় অবশ্যই `sanitizeSvgHtml()` (`lib/sanitize.ts`) ব্যবহার করতে হবে যাতে ক্ষতিকর স্ক্রিপ্ট ইনজেকশন (XSS) প্রতিরোধ হয়।

3. **জিরো-ট্রাস্ট সার্ভার অথরিটেটিভ অর্ডার ইঞ্জিন (`app/actions/checkout.ts`):**
   - ক্লায়েন্ট থেকে পাঠানো কোনো পণ্যের মূল্য (`price`), সাবটোটাল বা অগ্রিম পেমেন্টের হিসাব সার্ভার বিশ্বাস করবে না।
   - সার্ভার অ্যাকশনে অবশ্যই ডাটাবেজ থেকে আসল পণ্যের দাম, কুপন ডিসকাউন্ট ও শিপিং চার্জ যাচাই করে সার্ভারেই মোট বিল এবং ৫% অগ্রিম + ১.৫% বিকাশ ফি হিসাব করতে হবে।
   - অর্ডার ইনসার্টের আগে অবশ্যই `decrement_product_stock` RPC দিয়ে অটোমিক স্টক যাচাই ও কমাতে হবে।

---

## 🪵 ৮. লগিং ও ত্রুটি হ্যান্ডলিং স্ট্যান্ডার্ডস (Logging & Error Safety)

1. **প্রোডাকশন কনসোল ক্লিনলিনেস:**
   - কোডবেসে সরাসরি কাঁচা `console.log()` ব্যবহার করা যাবে না।
   - এরর ও সতর্কতার জন্য `lib/logger.ts`-এর `logWarn()` এবং `logError()` ব্যবহার করুন।

2. **সার্ভার অ্যাকশন ফেল-ক্লোজড পলিসি:**
   - ডাটাবেজ বা সার্ভার অপারেশনে কোনো ব্যর্থতা দেখা দিলে সিস্টেম কখনো স্টেল ডেটায় অর্ডার কনফার্ম করবে না — অবিলম্বে গ্রাহককে প্রমিত ভাষায় এরর মেসেজ রিটার্ন করবে (`fail(t('একটু পরে আবার চেষ্টা করুন'))`)।
