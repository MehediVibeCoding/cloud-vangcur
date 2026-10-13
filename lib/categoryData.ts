// ফাইলের পাথ: lib/categoryData.ts
// ─────────────────────────────────────────────────────────────────────────────
// ডিফল্ট ক্যাটাগরি (৩১টি) — পুরোনো সিরিয়াল ও পুরোনো আইডি হুবহু ফেরত আনা হয়েছে।
// আইকন-ডিজাইন সিস্টেম (সব আইকনে একই নিয়ম):
//   • ক্যানভাস 32×32, আউটলাইন stroke 2.2 (ছোট অংশে 1.6 / 1.3)। সোর্সে আউটলাইন #0A1A3F লেখা থাকে, কিন্তু রেন্ডারের সময় brandifyCategoryIcon() সেটাকে স্কাই-ব্লু (#2E8BEA) করে দেয় — ডার্ক মোডে globals.css-এর .vc-cat-icon নিয়মে #7CC4FF
//   • বডি: হালকা→মাঝারি নীল গ্রেডিয়েন্ট  (#EAF5FF → #7FC3FD)
//   • অ্যাকসেন্ট: ব্র্যান্ড-ব্লু গ্রেডিয়েন্ট (#6DBBFD → #44A7FC = brand-primary)
//   • প্রিমিয়াম টাচ: গোল্ড গ্রেডিয়েন্ট (#FFE08A → #CC9A35), ডার্ক স্ক্রিন #0F2557
//   • প্রতিটি আইকনের গ্রেডিয়েন্ট id ইউনিক (vc-<id>-b/a/g) — পেজে একাধিক আইকন থাকলেও সংঘর্ষ হয় না
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category } from '@/types';
import { logWarn } from './logger';

export const DEFAULT_CATEGORIES: Category[] = [
  // ১. অল প্রোডাক্টস (All Products — প্রিমিয়াম ৪-গ্রিড উইজেট ও গোল্ড স্পার্ক)
  {
    id: 'all',
    name: 'অল প্রোডাক্টস',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-all-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-all-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-all-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <rect x="4.5" y="4.5" width="10" height="10" rx="3.2" fill="url(#vc-all-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="17.5" y="4.5" width="10" height="10" rx="3.2" fill="url(#vc-all-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="4.5" y="17.5" width="10" height="10" rx="3.2" fill="url(#vc-all-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="17.5" y="17.5" width="10" height="10" rx="3.2" fill="url(#vc-all-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M7.4 9.6V9A1.6 1.6 0 0 1 9 7.4H9.8" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.85"/>
      <path d="M22.5 18.9L23.508 21.492L26.1 22.5L23.508 23.508L22.5 26.1L21.492 23.508L18.9 22.5L21.492 21.492Z" fill="url(#vc-all-g)"/>
    </svg>`,
  },

  // ২. টি ডব্লিউ এস (TWS Earbuds — চার্জিং কেস ও দুটি বাডস)
  {
    id: 'tws',
    name: 'টি ডব্লিউ এস',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-tws-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-tws-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-tws-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <path d="M7 14C7 9.6 10.6 6 15 6H17C21.4 6 25 9.6 25 14" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <rect x="10.2" y="9.2" width="4.2" height="9" rx="2.1" fill="url(#vc-tws-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="17.6" y="9.2" width="4.2" height="9" rx="2.1" fill="url(#vc-tws-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="6" y="14" width="20" height="12.5" rx="6.2" fill="url(#vc-tws-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9.5 17.4C10.2 16.4 11.2 16 12.4 16" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.85"/>
      <circle cx="16" cy="21.2" r="1.5" fill="url(#vc-tws-g)" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // ৩. পাওয়ার ব্যাংক (Power Bank — গোল্ড বোল্ট ও চার্জ ইন্ডিকেটর)
  {
    id: 'powerbank',
    name: 'পাওয়ার ব্যাংক',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-powerbank-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-powerbank-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-powerbank-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <rect x="13" y="2.4" width="6" height="3.6" rx="1.2" fill="url(#vc-powerbank-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="8.5" y="5" width="15" height="23.6" rx="4.2" fill="url(#vc-powerbank-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M17.6 9.2L12.6 16.2H16L14.8 22L19.8 15H16.4Z" fill="url(#vc-powerbank-g)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="11.4" y="24.6" width="2.8" height="1.3" rx=".65" fill="url(#vc-powerbank-a)"/>
      <rect x="14.6" y="24.6" width="2.8" height="1.3" rx=".65" fill="url(#vc-powerbank-a)"/>
      <rect x="17.8" y="24.6" width="2.8" height="1.3" rx=".65" fill="url(#vc-powerbank-a)"/>
      <path d="M11 9.5V8.6A1.6 1.6 0 0 1 12.6 7H13.2" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.85"/>
    </svg>`,
  },

  // ৪. আরজিবি লাইট (RGB Light — গ্লো লাইটবার ও অ্যাম্বিয়েন্ট রে)
  {
    id: 'rgb',
    name: 'আরজিবি লাইট',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-rgb-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-rgb-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-rgb-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <rect x="12" y="3.8" width="8" height="21.5" rx="4" fill="url(#vc-rgb-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="14.2" y="6.8" width="3.6" height="14.5" rx="1.8" fill="url(#vc-rgb-a)"/>
      <path d="M8.5 28H23.5" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M6.6 9.4L4 8M6.2 14.6H3M6.6 19.8L4 21.2" stroke="#44A7FC" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M25.4 9.4L28 8M25.8 14.6H29M25.4 19.8L28 21.2" stroke="#44A7FC" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`,
  },

  // ৫. স্মার্ট ওয়াচ (Smart Watch — অ্যামোলেড ফেস ও গোল্ড ওয়াচ হ্যান্ড)
  {
    id: 'smartwatch',
    name: 'স্মার্ট ওয়াচ',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-smartwatch-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-smartwatch-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-smartwatch-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <rect x="11" y="2.4" width="10" height="7.6" rx="2.2" fill="url(#vc-smartwatch-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="11" y="22" width="10" height="7.6" rx="2.2" fill="url(#vc-smartwatch-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="7.5" y="7" width="17" height="18" rx="5.6" fill="url(#vc-smartwatch-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="10" y="9.8" width="12" height="12.4" rx="3.6" fill="#0F2557"/>
      <path d="M16 12.6V16.6L18.8 18.2" stroke="#FFD871" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="16" cy="16.6" r="1" fill="#44A7FC"/>
      <rect x="24.5" y="13.4" width="2.3" height="4.6" rx="1.15" fill="url(#vc-smartwatch-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // ৬. একরেলিক ল্যাম্প (Acrylic Lamp — ক্রিস্টাল প্যানেল, এচড মুন ও গোল্ড বেস)
  {
    id: 'acrylic',
    name: 'একরেলিক ল্যাম্প',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-acrylic-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-acrylic-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-acrylic-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <rect x="9.5" y="3.4" width="13" height="20" rx="3.6" fill="url(#vc-acrylic-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="15.2" cy="11" r="3.9" fill="url(#vc-acrylic-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="16.6" cy="9.7" r="3.2" fill="url(#vc-acrylic-b)"/>
      <path d="M17.8 15.000000000000002L18.528000000000002 16.872L20.400000000000002 17.6L18.528000000000002 18.328000000000003L17.8 20.200000000000003L17.072 18.328000000000003L15.200000000000001 17.6L17.072 16.872Z" fill="url(#vc-acrylic-g)"/>
      <path d="M12.3 6.8V10" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.85"/>
      <rect x="6" y="22.2" width="20" height="5.8" rx="2.5" fill="url(#vc-acrylic-g)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10.5 25.2H21.5" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.7"/>
    </svg>`,
  },

  // ৭. হেডফোন (Headphone — প্রিমিয়াম ওভার-ইয়ার ব্যান্ড ও কুশন)
  {
    id: 'headphone',
    name: 'হেডফোন',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-headphone-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-headphone-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-headphone-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <path d="M7 20V16A9 9 0 0 1 25 16V20" stroke="#0A1A3F" stroke-width="5.6" stroke-linecap="round" fill="none"/>
      <path d="M7 20V16A9 9 0 0 1 25 16V20" stroke="#44A7FC" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <rect x="4.4" y="16.6" width="7.2" height="11.4" rx="3.3" fill="url(#vc-headphone-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="20.4" y="16.6" width="7.2" height="11.4" rx="3.3" fill="url(#vc-headphone-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="8" cy="22.3" r="1.5" fill="url(#vc-headphone-g)" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="24" cy="22.3" r="1.5" fill="url(#vc-headphone-g)" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M6.3 19.4V19" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.7"/><path d="M22.3 19.4V19" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.7"/>
    </svg>`,
  },

  // ৮. রিচার্জেবল ফ্যান (Rechargeable Fan — ৩-ব্লেড ফ্যান ও স্ট্যান্ড)
  {
    id: 'fan',
    name: 'রিচার্জেবল ফ্যান',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-fan-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-fan-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-fan-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <circle cx="16" cy="12.5" r="10" fill="url(#vc-fan-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <ellipse cx="16" cy="7.6" rx="2.8" ry="4.2" fill="url(#vc-fan-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <ellipse cx="16" cy="7.6" rx="2.8" ry="4.2" fill="url(#vc-fan-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" transform="rotate(120 16 12.5)"/>
      <ellipse cx="16" cy="7.6" rx="2.8" ry="4.2" fill="url(#vc-fan-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" transform="rotate(240 16 12.5)"/>
      <circle cx="16" cy="12.5" r="2.5" fill="url(#vc-fan-g)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 22.5V25.8" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="10.5" y="25.4" width="11" height="3.6" rx="1.8" fill="url(#vc-fan-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // ৯. ইউনিক কালেকশন (Unique Collection — প্রিমিয়াম গিফট বক্স ও গোল্ড রিবন)
  {
    id: 'unique',
    name: 'ইউনিক কালেকশন',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-unique-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-unique-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-unique-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <rect x="6" y="14.6" width="20" height="13.2" rx="3" fill="url(#vc-unique-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="4.4" y="10.6" width="23.2" height="5" rx="2.2" fill="url(#vc-unique-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="14.4" y="10.6" width="3.2" height="17.2" rx=".6" fill="url(#vc-unique-g)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 10.6C13 10.9 9.6 9.5 10 6.9C10.4 4.5 14.6 5.7 16 10.6Z" fill="url(#vc-unique-g)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 10.6C19 10.9 22.4 9.5 22 6.9C21.6 4.5 17.4 5.7 16 10.6Z" fill="url(#vc-unique-g)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M26.2 1.9999999999999996L26.928 3.8719999999999994L28.8 4.6L26.928 5.327999999999999L26.2 7.199999999999999L25.471999999999998 5.327999999999999L23.599999999999998 4.6L25.471999999999998 3.8719999999999994Z" fill="url(#vc-unique-g)"/>
    </svg>`,
  },

  // ১০. ক্রিস্টাল বল (Crystal Ball — মিস্টিক ক্রিস্টাল গোলক ও গোল্ড বেস)
  {
    id: 'crystalball',
    name: 'ক্রিস্টাল বল',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-crystalball-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-crystalball-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-crystalball-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <circle cx="16" cy="13.6" r="10" fill="url(#vc-crystalball-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 7.4L17.5 12.1L22.2 13.6L17.5 15.1L16 19.8L14.5 15.1L9.8 13.6L14.5 12.1Z" fill="url(#vc-crystalball-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10.6 9.8A7 7 0 0 1 14.2 6.3" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.95"/>
      <rect x="9" y="22.6" width="14" height="5.8" rx="2.5" fill="url(#vc-crystalball-g)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // ১১. ওয়াটার বোতল (Water Bottle — পানির লেভেল ও ড্রপ)
  {
    id: 'waterbottle',
    name: 'ওয়াটার বোতল',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-waterbottle-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-waterbottle-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-waterbottle-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <rect x="13.4" y="6.4" width="5.2" height="3.4" rx="1" fill="url(#vc-waterbottle-b)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="9.5" y="9" width="13" height="19" rx="4.6" fill="url(#vc-waterbottle-b)"/>
      <path d="M9.5 17.6Q12.75 15.4 16 17.6T22.5 17.6V23.4A4.6 4.6 0 0 1 17.9 28H14.1A4.6 4.6 0 0 1 9.5 23.4Z" fill="url(#vc-waterbottle-a)"/>
      <rect x="9.5" y="9" width="13" height="19" rx="4.6" fill="none" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="12" y="2.4" width="8" height="4.4" rx="1.6" fill="url(#vc-waterbottle-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 19.8C17.3 21.3 18 22.1 18 23A2 2 0 0 1 14 23C14 22.1 14.7 21.3 16 19.8Z" fill="#FFFFFF" opacity=".92"/>
      <path d="M12 11.8V14.4" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.8"/>
    </svg>`,
  },

  // ১২. ওয়াইফাই ইউপিএস (WiFi UPS — সিগন্যাল আর্ক ও ব্যাকআপ পাওয়ার)
  {
    id: 'wifiups',
    name: 'ওয়াইফাই ইউপিএস',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-wifiups-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-wifiups-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-wifiups-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <path d="M8.4 11.4Q16 4.2 23.6 11.4" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M11.8 14.6Q16 10.8 20.2 14.6" stroke="#44A7FC" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <circle cx="16" cy="17.2" r="1.5" fill="url(#vc-wifiups-g)" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="3.5" y="19.6" width="25" height="9" rx="3.6" fill="url(#vc-wifiups-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="8.6" cy="24.1" r="1.2" fill="#44A7FC"/>
      <circle cx="12.4" cy="24.1" r="1.2" fill="#44A7FC"/>
      <circle cx="22.6" cy="24.1" r="3.2" fill="url(#vc-wifiups-g)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M23.4 21.8L21.4 24.4H22.8L22.2 26.4L24.2 23.8H22.8Z" fill="#0A1A3F"/>
    </svg>`,
  },

  // ১৩. হিউমিডিফায়ার (Humidifier — মিস্ট পাফ ও ওয়াটার ড্রপ)
  {
    id: 'humidifier',
    name: 'হিউমিডিফায়ার',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-humidifier-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-humidifier-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-humidifier-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <circle cx="12.5" cy="5.8" r="2.3" fill="url(#vc-humidifier-b)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="16.6" cy="4.4" r="2.7" fill="url(#vc-humidifier-b)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="20.6" cy="6" r="2.2" fill="url(#vc-humidifier-b)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="14" y="8.2" width="4" height="3.6" rx="1" fill="url(#vc-humidifier-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="8.5" y="10.6" width="15" height="14" rx="5" fill="url(#vc-humidifier-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 14.2C17.7 16.1 18.5 17.1 18.5 18.2A2.5 2.5 0 0 1 13.5 18.2C13.5 17.1 14.3 16.1 16 14.2Z" fill="url(#vc-humidifier-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="6.5" y="23.6" width="19" height="5" rx="2.5" fill="url(#vc-humidifier-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // ১৪. কিবোর্ড (Keyboard — মেকানিক্যাল কি-ক্যাপ ও স্পেসবার)
  {
    id: 'keyboard',
    name: 'কিবোর্ড',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-keyboard-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-keyboard-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-keyboard-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <rect x="2.5" y="7.4" width="27" height="17.4" rx="4.2" fill="url(#vc-keyboard-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="5.6" y="11" width="3.4" height="3.2" rx="1" fill="url(#vc-keyboard-a)" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><rect x="10.2" y="11" width="3.4" height="3.2" rx="1" fill="#EAF5FF" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><rect x="14.8" y="11" width="3.4" height="3.2" rx="1" fill="#EAF5FF" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><rect x="19.4" y="11" width="3.4" height="3.2" rx="1" fill="#EAF5FF" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><rect x="24.0" y="11" width="3.4" height="3.2" rx="1" fill="#EAF5FF" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="7.9" y="15.6" width="3.4" height="3.2" rx="1" fill="#EAF5FF" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><rect x="12.5" y="15.6" width="3.4" height="3.2" rx="1" fill="#EAF5FF" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><rect x="17.1" y="15.6" width="3.4" height="3.2" rx="1" fill="#EAF5FF" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><rect x="21.7" y="15.6" width="3.4" height="3.2" rx="1" fill="url(#vc-keyboard-g)" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="8" y="20.2" width="16" height="2.8" rx="1.4" fill="url(#vc-keyboard-a)" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // ১৫. গিম্বল (Gimbal — মোটর আর্ম ও স্মার্টফোন স্ট্যাবিলাইজার)
  {
    id: 'gimbal',
    name: 'গিম্বল',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-gimbal-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-gimbal-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-gimbal-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <path d="M8.8 14.4V18.2Q8.8 21.6 13 22" stroke="#0A1A3F" stroke-width="2.3" stroke-linecap="round" fill="none"/>
      <rect x="11.6" y="10" width="2.4" height="2.8" rx=".8" fill="url(#vc-gimbal-b)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="12.5" y="20" width="8" height="9.6" rx="4" fill="url(#vc-gimbal-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="13.5" y="2.8" width="11" height="16.6" rx="3.2" fill="url(#vc-gimbal-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="15.8" y="5.4" width="6.4" height="10.4" rx="1.6" fill="url(#vc-gimbal-a)"/>
      <circle cx="8.8" cy="11.3" r="3.4" fill="url(#vc-gimbal-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="8.8" cy="11.3" r="1.1" fill="url(#vc-gimbal-g)"/>
      <circle cx="16.5" cy="24.6" r="1.4" fill="url(#vc-gimbal-g)" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // ১৬. লাইট (Light — গ্লো বাল্ব ও গোল্ড রে)
  {
    id: 'light',
    name: 'লাইট',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-light-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-light-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-light-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <path d="M16 1.6V3M5.2 6.1L6.2 7.1M26.8 6.1L25.8 7.1M2.8 12.4H4.2M27.8 12.4H29.2" stroke="#C9962F" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M16 5C11.4 5 8.6 8.4 8.6 12.2C8.6 15 10.1 16.5 11.4 18C12 18.7 12.3 19.5 12.3 20.4V21H19.7V20.4C19.7 19.5 20 18.7 20.6 18C21.9 16.5 23.4 15 23.4 12.2C23.4 8.4 20.6 5 16 5Z" fill="url(#vc-light-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 17.6V13.4L16 11.6L18 13.4V17.6" stroke="#44A7FC" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M11.4 10.4C11.7 8.9 12.6 7.8 13.9 7.1" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.85"/>
      <rect x="12.4" y="21" width="7.2" height="3.2" rx="1.3" fill="url(#vc-light-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="13.4" y="24.2" width="5.2" height="3.4" rx="1.7" fill="url(#vc-light-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // ১৭. মাউস (Mouse — এরগোনমিক বডি ও স্ক্রল হুইল)
  {
    id: 'mouse',
    name: 'মাউস',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-mouse-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-mouse-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-mouse-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <path d="M16 3.5C21.8 3.5 24.5 7.8 24.5 12.2V19.5C24.5 25 20.8 29 16 29C11.2 29 7.5 25 7.5 19.5V12.2C7.5 7.8 10.2 3.5 16 3.5Z" fill="url(#vc-mouse-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M7.7 13.2H24.3M16 3.7V13.2" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <rect x="14.4" y="6.6" width="3.2" height="5.2" rx="1.6" fill="url(#vc-mouse-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10.6 9.4C10.9 8 11.7 7 12.7 6.3" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.9"/>
      <circle cx="16" cy="21.6" r="1.3" fill="url(#vc-mouse-g)" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // ১৮. ক্যাবল অ্যান্ড চার্জার (Cable & Charger — ফাস্ট চার্জার ও টাইপ-সি প্লাগ)
  {
    id: 'cable',
    name: 'ক্যাবল অ্যান্ড চার্জার',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-cable-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-cable-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-cable-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <rect x="9.4" y="2.4" width="2.6" height="3.6" rx=".9" fill="url(#vc-cable-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="14.4" y="2.4" width="2.6" height="3.6" rx=".9" fill="url(#vc-cable-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="6.5" y="5.6" width="13" height="12.2" rx="3.6" fill="url(#vc-cable-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 8.4L10.6 12.8H13L12.2 15.8L15.6 11.4H13.2Z" fill="url(#vc-cable-g)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M19.5 11.8H22A3.4 3.4 0 0 1 25.4 15.2V20" stroke="#0A1A3F" stroke-width="2" stroke-linecap="round" fill="none"/>
      <rect x="21.4" y="20" width="8" height="7.4" rx="2.2" fill="url(#vc-cable-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="23.6" y="23" width="3.6" height="1.6" rx=".8" fill="#FFFFFF"/>
    </svg>`,
  },

  // ১৯. ইউনিক টুল (Unique Tools — প্রেসিশন ইলেকট্রিক স্ক্রু-ড্রাইভার)
  {
    id: 'unique-tools',
    name: 'ইউনিক টুল',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-unique-tools-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-unique-tools-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-unique-tools-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <g transform="rotate(40 16 16)">
      <rect x="14.8" y="2.4" width="2.4" height="9" rx="1.2" fill="url(#vc-unique-tools-b)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="13" y="10.4" width="6" height="4.2" rx="1.3" fill="url(#vc-unique-tools-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="11.4" y="14" width="9.2" height="15" rx="4" fill="url(#vc-unique-tools-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="13.4" y="18" width="5.2" height="1.5" rx=".75" fill="url(#vc-unique-tools-a)"/>
      <rect x="13.4" y="21.4" width="5.2" height="1.5" rx=".75" fill="url(#vc-unique-tools-a)"/>
      <rect x="13.4" y="24.8" width="5.2" height="1.5" rx=".75" fill="url(#vc-unique-tools-g)"/>
      </g>
      <path d="M5.6 3L6.4399999999999995 5.16L8.6 6L6.4399999999999995 6.84L5.6 9L4.76 6.84L2.5999999999999996 6L4.76 5.16Z" fill="url(#vc-unique-tools-g)"/>
    </svg>`,
  },

  // ২০. হেয়ার ড্রায়ার (Hair Dryer — ব্যারেল, নোজল ও গ্রিপ)
  {
    id: 'hairdryer',
    name: 'হেয়ার ড্রায়ার',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-hairdryer-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-hairdryer-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-hairdryer-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <g transform="rotate(16 12 20)">
      <rect x="9.2" y="12" width="5.6" height="16" rx="2.8" fill="url(#vc-hairdryer-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="12" cy="23" r="1.2" fill="url(#vc-hairdryer-g)" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <rect x="21" y="7" width="6.2" height="8.6" rx="2" fill="url(#vc-hairdryer-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="3.5" y="5" width="19.5" height="12.4" rx="6.2" fill="url(#vc-hairdryer-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.2 8.8V13.6M12.2 8.8V13.6M16.2 8.8V13.6" stroke="#44A7FC" stroke-width="1.7" stroke-linecap="round"/>
    </svg>`,
  },

  // ২১. টয়েস (Toys — রেট্রো হ্যান্ডহেল্ড গেম কনসোল)
  {
    id: 'toys',
    name: 'টয়েস',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-toys-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-toys-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-toys-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <rect x="7" y="2.8" width="18" height="26.4" rx="3.8" fill="url(#vc-toys-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="9.8" y="5.8" width="12.4" height="9.6" rx="1.8" fill="#0F2557"/>
      <rect x="11.4" y="7.4" width="9.2" height="6.4" rx="1" fill="url(#vc-toys-a)"/>
      <path d="M11.8 21H16M13.9 18.9V23.1" stroke="#0A1A3F" stroke-width="2" stroke-linecap="round"/>
      <circle cx="21" cy="19.4" r="1.8" fill="url(#vc-toys-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="18.2" cy="22.6" r="1.8" fill="url(#vc-toys-g)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="10.8" y="26" width="3.2" height="1.2" rx=".6" fill="#0A1A3F"/>
      <rect x="15" y="26" width="3.2" height="1.2" rx=".6" fill="#0A1A3F"/>
    </svg>`,
  },

  // ২২. অ্যালার্ম ক্লক (Alarm Clock — গোল্ড বেল ও ক্লক ফেস)
  {
    id: 'alarmclock',
    name: 'অ্যালার্ম ক্লক',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-alarmclock-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-alarmclock-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-alarmclock-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <circle cx="7.2" cy="7.8" r="3.6" fill="url(#vc-alarmclock-g)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="24.8" cy="7.8" r="3.6" fill="url(#vc-alarmclock-g)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.6 25.6L6 28.6M23.4 25.6L26 28.6" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="16" cy="17.2" r="10" fill="url(#vc-alarmclock-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="16" cy="17.2" r="7" fill="#EAF5FF" opacity=".7"/>
      <path d="M16 12.2V17.2L19.2 19.2" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="16" cy="17.2" r="1.4" fill="url(#vc-alarmclock-a)" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="14.4" y="3.6" width="3.2" height="3" rx="1.1" fill="url(#vc-alarmclock-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // ২৩. ল্যাম্প (Lamp — টেবিল ল্যাম্প, গোল্ড শেড ও গ্লো)
  {
    id: 'lamp',
    name: 'ল্যাম্প',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-lamp-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-lamp-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-lamp-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <rect x="14.8" y="13.4" width="2.4" height="11.4" rx="1.2" fill="url(#vc-lamp-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="9" y="24" width="14" height="4.6" rx="2.3" fill="url(#vc-lamp-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12 4.6H20L25 14H7Z" fill="url(#vc-lamp-g)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10.8 11.6L13.6 6.6" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.8"/>
      <path d="M11.4 17Q16 19.6 20.6 17" stroke="#C9962F" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".8"/>
    </svg>`,
  },

  // ২৪. ইউএসবি হাব (USB Hub — ৪ পোর্ট ও কানেক্টর)
  {
    id: 'usbhub',
    name: 'ইউএসবি হাব',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-usbhub-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-usbhub-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-usbhub-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <path d="M9 13.6V9.6A3 3 0 0 1 12 6.6H16.6" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <rect x="16.4" y="3.6" width="9.4" height="6" rx="1.7" fill="url(#vc-usbhub-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="19" y="5.8" width="1.4" height="2" rx=".4" fill="#FFFFFF"/>
      <rect x="21.9" y="5.8" width="1.4" height="2" rx=".4" fill="#FFFFFF"/>
      <rect x="3" y="13.6" width="26" height="13" rx="4.2" fill="url(#vc-usbhub-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="6" y="17.2" width="4.4" height="6.2" rx="1" fill="#0F2557"/><rect x="6.8" y="20.4" width="2.8" height="1.4" rx=".5" fill="#44A7FC"/><rect x="11.3" y="17.2" width="4.4" height="6.2" rx="1" fill="#0F2557"/><rect x="12.100000000000001" y="20.4" width="2.8" height="1.4" rx=".5" fill="#44A7FC"/><rect x="16.6" y="17.2" width="4.4" height="6.2" rx="1" fill="#0F2557"/><rect x="17.400000000000002" y="20.4" width="2.8" height="1.4" rx=".5" fill="#44A7FC"/><rect x="21.9" y="17.2" width="4.4" height="6.2" rx="1" fill="#0F2557"/><rect x="22.7" y="20.4" width="2.8" height="1.4" rx=".5" fill="#44A7FC"/>
    </svg>`,
  },

  // ২৫. এক্সেসরিজ (Accessories — প্রিমিয়াম ফোন কেস, ক্যামেরা আইল্যান্ড ও রিং)
  {
    id: 'accessories',
    name: 'এক্সেসরিজ',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-accessories-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-accessories-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-accessories-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <rect x="8" y="2.8" width="16" height="26.4" rx="4.6" fill="url(#vc-accessories-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="10.6" y="5.4" width="9" height="9" rx="2.6" fill="#0F2557"/>
      <circle cx="13.5" cy="8.3" r="1.7" fill="url(#vc-accessories-a)"/>
      <circle cx="16.6" cy="11.4" r="1.7" fill="url(#vc-accessories-a)"/>
      <circle cx="13.1" cy="7.9" r=".5" fill="#FFFFFF"/>
      <circle cx="16.2" cy="11" r=".5" fill="#FFFFFF"/>
      <circle cx="16" cy="21.4" r="3.7" fill="none" stroke="#C9962F" stroke-width="2"/>
    </svg>`,
  },

  // ২৬. পাওয়ার স্ট্রিপ (Power Strip — ৩ সকেট ও প্লাগ)
  {
    id: 'powerstrip',
    name: 'পাওয়ার স্ট্রিপ',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-powerstrip-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-powerstrip-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-powerstrip-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <path d="M16 21.8V23.6A2.4 2.4 0 0 0 18.4 26H21" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <rect x="21" y="23.2" width="7.4" height="5.6" rx="1.8" fill="url(#vc-powerstrip-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="2.5" y="8.2" width="27" height="13.6" rx="4.2" fill="url(#vc-powerstrip-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="5.2" y="11.2" width="6.2" height="7.4" rx="2.2" fill="#EAF5FF" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.300000000000001 13.4V15.6M9.3 13.4V15.6" stroke="#0A1A3F" stroke-width="1.4" stroke-linecap="round"/><rect x="13.8" y="11.2" width="6.2" height="7.4" rx="2.2" fill="#EAF5FF" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.9 13.4V15.6M17.9 13.4V15.6" stroke="#0A1A3F" stroke-width="1.4" stroke-linecap="round"/><rect x="22.4" y="11.2" width="6.2" height="7.4" rx="2.2" fill="#EAF5FF" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M24.5 13.4V15.6M26.5 13.4V15.6" stroke="#0A1A3F" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },

  // ২৭. প্রজেক্টর (Projector — লেন্স ও ভেন্ট)
  {
    id: 'projector',
    name: 'প্রজেক্টর',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-projector-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-projector-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-projector-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <rect x="2.5" y="8.4" width="27" height="15" rx="5" fill="url(#vc-projector-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="21.5" cy="15.9" r="5.4" fill="url(#vc-projector-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="21.5" cy="15.9" r="2.5" fill="#0F2557"/>
      <circle cx="20.6" cy="15" r=".9" fill="#FFFFFF"/>
      <path d="M6.5 12.8H13.5M6.5 15.9H13.5M6.5 19H11" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round"/>
      <rect x="6" y="23.4" width="4.2" height="3.2" rx="1" fill="url(#vc-projector-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="21.8" y="23.4" width="4.2" height="3.2" rx="1" fill="url(#vc-projector-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // ২৮. নেকব্যান্ড (Neckband — ফ্লেক্সি কলার ও ম্যাগনেটিক বাডস)
  {
    id: 'neckband',
    name: 'নেকব্যান্ড',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-neckband-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-neckband-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-neckband-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <path d="M8.5 7V15.5A7.5 7.5 0 0 0 23.5 15.5V7" stroke="#0A1A3F" stroke-width="5.4" stroke-linecap="round" fill="none"/>
      <path d="M8.5 7V15.5A7.5 7.5 0 0 0 23.5 15.5V7" stroke="#B5D6FB" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      <rect x="5.8" y="2.6" width="5.4" height="8.2" rx="2.7" fill="url(#vc-neckband-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="20.8" y="2.6" width="5.4" height="8.2" rx="2.7" fill="url(#vc-neckband-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="16" cy="23" r="1.2" fill="url(#vc-neckband-g)" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // ২৯. কিচেন এক্সেসরিজ (Kitchen Accessories — পোর্টেবল রিচার্জেবল ব্লেন্ডার)
  {
    id: 'kitchenaccessories',
    name: 'কিচেন এক্সেসরিজ',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-kitchenaccessories-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-kitchenaccessories-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-kitchenaccessories-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <path d="M9 10H23L21.6 25.3A3 3 0 0 1 18.6 28H13.4A3 3 0 0 1 10.4 25.3Z" fill="url(#vc-kitchenaccessories-b)"/>
      <path d="M9.64 17.2Q12.8 15.4 16 17.2T22.36 17.2L21.6 25.3A3 3 0 0 1 18.6 28H13.4A3 3 0 0 1 10.4 25.3Z" fill="url(#vc-kitchenaccessories-a)"/>
      <path d="M9 10H23L21.6 25.3A3 3 0 0 1 18.6 28H13.4A3 3 0 0 1 10.4 25.3Z" fill="none" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="16" cy="22.4" r="1.8" fill="url(#vc-kitchenaccessories-g)" stroke="#0A1A3F" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="7.4" y="5" width="17.2" height="5.2" rx="2.3" fill="url(#vc-kitchenaccessories-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12 12.6L11.6 15" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.8"/>
    </svg>`,
  },

  // ৩০. অফার (Offers — ডিসকাউন্ট স্টারবার্স্ট ব্যাজ)
  {
    id: 'offer',
    name: 'অফার',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-offer-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-offer-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-offer-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <polygon points="16.00,2.60 18.95,4.99 22.70,4.40 24.06,7.94 27.60,9.30 27.01,13.05 29.40,16.00 27.01,18.95 27.60,22.70 24.06,24.06 22.70,27.60 18.95,27.01 16.00,29.40 13.05,27.01 9.30,27.60 7.94,24.06 4.40,22.70 4.99,18.95 2.60,16.00 4.99,13.05 4.40,9.30 7.94,7.94 9.30,4.40 13.05,4.99" fill="url(#vc-offer-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="16" cy="16" r="8.4" fill="none" stroke="#FFFFFF" stroke-width=".9" stroke-dasharray="1.7 1.7" opacity=".75"/>
      <circle cx="12.3" cy="12.5" r="1.8" fill="#FFFFFF"/>
      <circle cx="19.7" cy="19.5" r="1.8" fill="#FFFFFF"/>
      <path d="M20 11.6L12 20.4" stroke="#FFFFFF" stroke-width="1.9" stroke-linecap="round"/>
    </svg>`,
  },

  // ৩১. বিটি স্পিকার (BT Speaker — ট্যুইটার, উফার ও সাউন্ড ওয়েভ)
  {
    id: 'btspeaker',
    name: 'বিটি স্পিকার',
    icon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="vc-btspeaker-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF5FF"/><stop offset="1" stop-color="#7FC3FD"/></linearGradient><linearGradient id="vc-btspeaker-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBBFD"/><stop offset="1" stop-color="#44A7FC"/></linearGradient><linearGradient id="vc-btspeaker-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#CC9A35"/></linearGradient></defs>
      <path d="M5 11.4Q3 16 5 20.6" stroke="#C9962F" stroke-width="1.9" stroke-linecap="round" fill="none"/>
      <path d="M27 11.4Q29 16 27 20.6" stroke="#C9962F" stroke-width="1.9" stroke-linecap="round" fill="none"/>
      <rect x="8" y="3" width="16" height="26" rx="6" fill="url(#vc-btspeaker-b)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="16" cy="9.6" r="2.8" fill="url(#vc-btspeaker-a)" stroke="#0A1A3F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="16" cy="20" r="5.8" fill="url(#vc-btspeaker-a)" stroke="#0A1A3F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="16" cy="20" r="3.1" fill="#EAF5FF"/>
      <circle cx="16" cy="20" r="1.2" fill="#0F2557"/>
    </svg>`,
  },
];

export function makeCatSlug(catId: string): string {
  return String(catId || '').toLowerCase().replace(/[^\w-]/g, '');
}

export function parseSupabaseVal<T = unknown>(val: unknown): T {
  if (val === null || val === undefined) return val as T;
  if (typeof val !== 'string') return val as T;
  const t = val.trim();
  if (t.startsWith('[') || t.startsWith('{') || t.startsWith('"')) {
    try {
      return JSON.parse(t) as T;
    } catch {
      return val as unknown as T;
    }
  }
  return val as unknown as T;
}

const QUERY_TIMEOUT_MS = 3500;

export async function fetchCategories(supabase: SupabaseClient): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('setting_value')
      .eq('setting_key', 'vc_categories')
      .abortSignal(AbortSignal.timeout(QUERY_TIMEOUT_MS))
      .maybeSingle();
    if (error || !data) return DEFAULT_CATEGORIES;
    const parsed = parseSupabaseVal<Category[]>(data.setting_value);
    if (Array.isArray(parsed) && parsed.length) return parsed;
    return DEFAULT_CATEGORIES;
  } catch (e) {
    logWarn('Category fetch failed:', e);
    return DEFAULT_CATEGORIES;
  }
}

// (আগে এখানে subscribeCategories() ছিল — কোনো কলার ছিল না, Realtime চ্যানেল খুলতো কেউ ব্যবহার
// না করেও। ব্যবহার হলে ভবিষ্যতে প্রতি ভিজিটরে একটা সকেট খুলতো। মৃত কোড হিসেবে সরানো হলো।)

export const CATEGORY_FILTER_EVENT = 'vc:categoryFilter';
export const FOCUS_PRODUCT_EVENT = 'vc:focusProduct';

// আইকন আউটলাইন/স্ক্রিনের রং — globals.css-এর `.dark .vc-cat-icon` নিয়মের সাথে হুবহু মিল রাখতে হবে
export const VC_ICON_LINE = '#2E8BEA';
export const VC_ICON_SCREEN = '#2674D0';

/**
 * অ্যাডমিন/ডাটাবেসে সেভ করা পুরোনো আইকনে গাঢ় নীল (#0058C7 ইত্যাদি) থাকতে পারে —
 * রেন্ডারের সময় সেগুলো ব্র্যান্ড ফ্রেশ স্কাই-ব্লু প্যালেটে বদলে দেয় (ডেটা বদলাতে হয় না)।
 */
export function brandifyCategoryIcon(icon?: string): string | undefined {
  if (!icon || !icon.trim().startsWith('<svg')) return icon;
  return icon
    .replace(/#0058C7/gi, '#44A7FC')
    .replace(/#4DA9FF/gi, '#6DBBFD')
    .replace(/#1E7BFF/gi, '#44A7FC')
    .replace(/#3B9BFF/gi, '#44A7FC')
    .replace(/#F4F9FF/gi, '#EAF5FF')
    .replace(/#9AC4F6/gi, '#7FC3FD')
    // আউটলাইন: গাঢ় নেভি → ব্র্যান্ড স্কাই-ব্লুর গাঢ় শেড (ডার্ক মোডে globals.css-এর .vc-cat-icon নিয়মে হালকা হয়)
    .replace(/#0A1A3F/gi, VC_ICON_LINE)
    // স্ক্রিন/ডিটেইলের গাঢ় অংশ: নেভির বদলে নরম মাঝারি নীল
    .replace(/#0F2557/gi, VC_ICON_SCREEN);
}
