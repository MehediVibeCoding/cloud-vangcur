// [REPLACE] ফাইলের পাথ: lib/checkoutData.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { BKASH_NUMBER } from '@/lib/siteContact';

/**
 * ⚠️ শুধু UI দেখানোর জন্য (বাটন show/hide) — এটা অথোরাইজেশন চেক না।
 * আসল সুরক্ষা DB-তে: is_admin_user() RLS policy + trg_protect_profile_privilege trigger।
 */
/**
 * 🛡️ ক্লায়েন্ট-সাইড (ব্রাউজার) থেকে বর্তমান লগইন-করা ইউজার অ্যাডমিন/মডারেটর
 * কিনা যাচাই — শুধুমাত্র DB-ভিত্তিক (profiles.is_admin / role), কোনো
 * হার্ডকোডেড ইমেইল ব্যবহার করা হয় না। RLS-এ নিজের প্রোফাইল row নিজে
 * পড়ার অনুমতি already আছে (profiles_select_policy), তাই এই কলটা নিরাপদে
 * ব্রাউজার থেকেই করা যায়।
 */
export async function checkIsPrivilegedClient(
  supabase: SupabaseClient,
  userId?: string | null,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', userId)
      .maybeSingle();
    if (!profile) return false;
    return profile.is_admin === true || ['admin', 'super_admin', 'moderator'].includes(profile.role);
  } catch {
    return false;
  }
}


export const DISTRICTS = [
  'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'খুলনা', 'বরিশাল', 'সিলেট', 'রংপুর', 'ময়মনসিংহ', 'কুমিল্লা', 'ফেনী',
  'নোয়াখালী', 'লক্ষ্মীপুর', 'চাঁদপুর', 'ব্রাহ্মণবাড়িয়া', 'কিশোরগঞ্জ', 'নরসিংদী', 'নারায়ণগঞ্জ', 'মুন্সীগঞ্জ',
  'মানিকগঞ্জ', 'গাজীপুর', 'টাঙ্গাইল', 'ফরিদপুর', 'মাদারীপুর', 'শরীয়তপুর', 'রাজবাড়ী', 'গোপালগঞ্জ', 'বগুড়া',
  'নওগাঁ', 'নাটোর', 'পাবনা', 'সিরাজগঞ্জ', 'জয়পুরহাট', 'চাঁপাইনবাবগঞ্জ', 'যশোর', 'সাতক্ষীরা', 'মেহেরপুর',
  'নড়াইল', 'চুয়াডাঙ্গা', 'কুষ্টিয়া', 'মাগুরা', 'ঝিনাইদহ', 'বাগেরহাট', 'পিরোজপুর', 'ঝালকাঠি', 'পটুয়াখালী',
  'বরগুনা', 'ভোলা', 'সুনামগঞ্জ', 'হবিগঞ্জ', 'মৌলভীবাজার', 'নেত্রকোনা', 'জামালপুর', 'শেরপুর', 'গাইবান্ধা',
  'নীলফামারী', 'লালমনিরহাট', 'কুড়িগ্রাম', 'ঠাকুরগাঁও', 'পঞ্চগড়', 'দিনাজপুর', 'কক্সবাজার', 'বান্দরবান',
  'রাঙ্গামাটি', 'খাগড়াছড়ি',
];

export const DISTRICT_MAP_EN: Record<string, string> = {
  'ঢাকা': 'Dhaka',
  'চট্টগ্রাম': 'Chattogram',
  'রাজশাহী': 'Rajshahi',
  'খুলনা': 'Khulna',
  'বরিশাল': 'Barishal',
  'সিলেট': 'Sylhet',
  'রংপুর': 'Rangpur',
  'ময়মনসিংহ': 'Mymensingh',
  'কুমিল্লা': 'Cumilla',
  'ফেনী': 'Feni',
  'নোয়াখালী': 'Noakhali',
  'লক্ষ্মীপুর': 'Lakshmipur',
  'চাঁদপুর': 'Chandpur',
  'ব্রাহ্মণবাড়িয়া': 'Brahmanbaria',
  'কিশোরগঞ্জ': 'Kishoreganj',
  'নরসিংদী': 'Narsingdi',
  'নারায়ণগঞ্জ': 'Narayanganj',
  'মুন্সীগঞ্জ': 'Munshiganj',
  'মানিকগঞ্জ': 'Manikganj',
  'গাজীপুর': 'Gazipur',
  'টাঙ্গাইল': 'Tangail',
  'ফরিদপুর': 'Faridpur',
  'মাদারীপুর': 'Madaripur',
  'শরীয়তপুর': 'Shariatpur',
  'রাজবাড়ী': 'Rajbari',
  'গোপালগঞ্জ': 'Gopalganj',
  'বগুড়া': 'Bogura',
  'নওগাঁ': 'Naogaon',
  'নাটোর': 'Natore',
  'পাবনা': 'Pabna',
  'সিরাজগঞ্জ': 'Sirajganj',
  'জয়পুরহাট': 'Joypurhat',
  'চাঁপাইনবাবগঞ্জ': 'Chapainawabganj',
  'যশোর': 'Jashore',
  'সাতক্ষীরা': 'Satkhira',
  'মেহেরপুর': 'Meherpur',
  'নড়াইল': 'Narail',
  'চুয়াডাঙ্গা': 'Chuadanga',
  'কুষ্টিয়া': 'Kushtia',
  'মাগুরা': 'Magura',
  'ঝিনাইদহ': 'Jhenaidah',
  'বাগেরহাট': 'Bagerhat',
  'পিরোজপুর': 'Pirojpur',
  'ঝালকাঠি': 'Jhalakathi',
  'পটুয়াখালী': 'Patuakhali',
  'বরগুনা': 'Barguna',
  'ভোলা': 'Bhola',
  'সুনামগঞ্জ': 'Sunamganj',
  'হবিগঞ্জ': 'Habiganj',
  'মৌলভীবাজার': 'Moulvibazar',
  'নেত্রকোনা': 'Netrokona',
  'জামালপুর': 'Jamalpur',
  'শেরপুর': 'Sherpur',
  'গাইবান্ধা': 'Gaibandha',
  'নীলফামারী': 'Nilphamari',
  'লালমনিরহাট': 'Lalmonirhat',
  'কুড়িগ্রাম': 'Kurigram',
  'ঠাকুরগাঁও': 'Thakurgaon',
  'পঞ্চগড়': 'Panchagarh',
  'দিনাজপুর': 'Dinajpur',
  'কক্সবাজার': 'Cox\'s Bazar',
  'বান্দরবান': 'Bandarban',
  'রাঙ্গামাটি': 'Rangamati',
  'খাগড়াছড়ি': 'Khagrachhari',
};

export function getDistrictLabel(dist: string, lang: 'bn' | 'en' = 'bn'): string {
  if (lang === 'en') {
    return DISTRICT_MAP_EN[dist] || dist;
  }
  return dist;
}

export interface ShipConfig {
  dhaka: number;
  out: number;
  bd: number;
}

// 📦 আপডেট করা ডেলিভারি চার্জ রেট: ঢাকা ৭০ টাকা, ঢাকা বাইরে ১২০ টাকা, সারা বাংলাদেশ ১২০ টাকা
export const DEFAULT_SHIP_CFG: ShipConfig = { dhaka: 70, out: 120, bd: 120 };

export type ShipKey = 'dhaka' | 'outside' | 'bangladesh';

export interface ShipOption {
  key: ShipKey;
  name: string;
  nameEn: string;
  sub: string;
  subEn: string;
}

export function getShipOptions(dist: string): ShipOption[] {
  const isDhaka = dist === 'ঢাকা' || dist === 'Dhaka';
  if (isDhaka) {
    return [
      {
        key: 'dhaka',
        name: 'ঢাকা সিটি কর্পোরেশনের আওতাধীন',
        nameEn: 'Inside Dhaka City Corporation',
        sub: 'Pathao Courier · হোম ডেলিভারি ১-২ দিন',
        subEn: 'Pathao Courier · Home Delivery 1-2 Days',
      },
      {
        key: 'outside',
        name: 'ঢাকা সিটি কর্পোরেশনের বাইরে',
        nameEn: 'Outside Dhaka City',
        sub: 'Pathao Courier · হোম ডেলিভারি ১-৩ দিন',
        subEn: 'Pathao Courier · Home Delivery 1-3 Days',
      },
    ];
  }
  if (dist) {
    return [
      {
        key: 'bangladesh',
        name: 'সারা বাংলাদেশ',
        nameEn: 'All Over Bangladesh',
        sub: 'Pathao Courier · হোম ডেলিভারি ২-৪ দিন',
        subEn: 'Pathao Courier · Home Delivery 2-4 Days',
      },
    ];
  }
  return [];
}

export function shipPrice(shipKey: string, shipCfg: ShipConfig = DEFAULT_SHIP_CFG): number {
  if (shipKey === 'dhaka') return shipCfg.dhaka;
  if (shipKey === 'outside') return shipCfg.out;
  return shipCfg.bd;
}

// =========================================================================
// 🌟 ৩-টায়ার ডায়নামিক অগ্রিম পেমেন্ট ও বাল্ক লিমিট কনফিগারেশন
// =========================================================================
export const HIGH_VALUE_THRESHOLD = 4000; // ৪,০০০ টাকা বা তার বেশি মোট বিল হলে ৫% অগ্রিম
export const MAX_ONLINE_ORDER_TOTAL = 20000; // ২০,০০০ টাকার বেশি মোট বিল হলে WhatsApp বাল্ক অর্ডার

export interface AdvancePaymentBreakdown {
  tier: 1 | 2 | 3;
  baseAdvance: number;       // ৫% মূল অগ্রিম বা ফিক্সড ২০০
  totalAdvance: number;      // কাস্টমারকে মোট যত টাকা অগ্রিম সেন্ড মানি করতে হবে
  isHighValue: boolean;      // ৪,০০০ - ২০,০০০ টাকার মধ্যে কি না
  isBulkOrder: boolean;      // ২০,০০০ টাকার বেশি কি না
  percentage: number;        // অগ্রিমের শতকরা হার (৫%)
}

/**
 * ডেলিভারি চার্জ সহ সর্বমোট বিলের (Total Bill) ওপর ভিত্তি করে অগ্রিম হিসাব।
 * থ্রেশহোল্ড (৪,০০০) সবসময় ডেলিভারি চার্জ-সহ সর্বমোট বিলের ওপর যাচাই হয়,
 * শুধু প্রোডাক্ট সাবটোটালের ওপর নয় — তাই total ৪,০০০ টাকায় হিট করা মাত্রই
 * (ডেলিভারি চার্জ যোগ হওয়ার পরেও) ৫% টায়ার চালু হয়ে যায়, ২০০ টাকা ফিক্সড আর থাকে না।
 */
export function calculateAdvancePayment(effectiveTotal: number): AdvancePaymentBreakdown {
  const safeTotal = Math.max(0, Number(effectiveTotal) || 0);

  // টায়ার ৩: ২০,০০০ টাকার বেশি (বাল্ক অর্ডার)
  if (safeTotal > MAX_ONLINE_ORDER_TOTAL) {
    const baseAdvance = Math.round(safeTotal * 0.05);
    return {
      tier: 3,
      baseAdvance,
      totalAdvance: baseAdvance,
      isHighValue: true,
      isBulkOrder: true,
      percentage: 5,
    };
  }

  // টায়ার ২: ৪,০০০ থেকে ২০,০০০ টাকা (হাই-ভ্যালু অর্ডার: ৫% অগ্রিম)
  if (safeTotal >= HIGH_VALUE_THRESHOLD) {
    const baseAdvance = Math.round(safeTotal * 0.05);
    return {
      tier: 2,
      baseAdvance,
      totalAdvance: baseAdvance,
      isHighValue: true,
      isBulkOrder: false,
      percentage: 5,
    };
  }

  // টায়ার ১: ৪,০০০ টাকার নিচে (স্বাভাবিক অর্ডার: ফিক্সড ২০০ টাকা)
  return {
    tier: 1,
    baseAdvance: 200,
    totalAdvance: 200,
    isHighValue: false,
    isBulkOrder: false,
    percentage: 0,
  };
}

export function validatePhone(ph: string): boolean {
  const phoneRegex = /^01[3-9]\d{8}$/;
  if (!phoneRegex.test(ph)) return false;
  const last8 = ph.slice(3);
  const allSame = last8.split('').every((c) => c === last8[0]);
  const isSeq = last8 === '12345678' || last8 === '87654321';
  return !(allSame || isSeq);
}

export function validateAddress(addr: string): boolean {
  const a = (addr || '').trim();
  return a.length >= 8 && a.length <= 200 && /\s/.test(a) && !/(.)\1{4,}/.test(a);
}

export function validateEmail(em: string): boolean {
  if (!em) return true;
  return em.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em);
}

export function validateTxnId(txn: string): boolean {
  const txnRegex = /^[A-Z0-9]{10}$/;
  const hasLetter = /[A-Z]/.test(txn);
  const hasDigit = /[0-9]/.test(txn);
  const allSame = /^(.)\1{9}$/.test(txn);
  return txnRegex.test(txn) && hasLetter && hasDigit && !allSame;
}

// vc_contact সেটিংটা এখন অ্যাডমিন প্যানেল থেকে এডিট করার কোনো উপায় নেই (ফিচার
// সরানো হয়েছে), তাই Supabase-এ বারবার খুঁজে দেখার দরকার নেই — সরাসরি ডিফল্ট
// বিকাশ নম্বরটাই রিটার্ন করা হচ্ছে।
export async function fetchBkashNumber(_supabase: SupabaseClient): Promise<string> {
  return BKASH_NUMBER;
}

export async function fetchShipConfig(supabase: SupabaseClient): Promise<ShipConfig> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('setting_value')
      .eq('setting_key', 'vc_shipping')
      .maybeSingle();
    if (error || !data) return DEFAULT_SHIP_CFG;
    const val = typeof data.setting_value === 'string' ? JSON.parse(data.setting_value) : data.setting_value;
    return val || DEFAULT_SHIP_CFG;
  } catch {
    return DEFAULT_SHIP_CFG;
  }
}
