// ফাইলের পাথ: lib/deviceId.ts
// প্রতিটি ব্রাউজারের জন্য একটা র‍্যান্ডম ডিভাইস-আইডি (কোনো ব্যক্তিগত তথ্য নয়)।
// লাইক গণনায় আগে IP ধরা হতো — একই ওয়াইফাই/মোবাইল নেটওয়ার্কের অনেকে একই IP শেয়ার করে,
// তাই দ্বিতীয় জনের লাইক বাদ পড়ত। এখন প্রতি ডিভাইসে প্রতি আইটেমে ১টা লাইক।
//
// 🛠️ ফিক্স (২০২৬-১১): আগে আইডিটা শুধু localStorage + JS-দিয়ে-বসানো কুকিতে (document.cookie) থাকত।
// Safari/iOS-এর ITP JS-কুকি ও localStorage ৭ দিনেই মুছে দেয়, আর ফেসবুক/মেসেঞ্জারের ইন-অ্যাপ ব্রাউজারেও
// স্টোরেজ প্রায়ই সাফ হয় — ফলে কয়েকদিন পর নতুন আইডি তৈরি হতো, সার্ভার ইউজারকে "নতুন ডিভাইস" ভাবত,
// হার্ট খালি দেখাত এবং আবার লাইক দেওয়া যেত (একই IP-তে ভিন্ন device_id ডাটাবেজেই ধরা পড়েছে)।
// এখন মূল আইডিটা middleware.ts সার্ভার-থেকে (HTTP Set-Cookie, ১ বছর) বসায় — ITP এই কুকির মেয়াদ ছাঁটে না।
// ক্লায়েন্ট: কুকি থাকলে সেটাই আসল; না থাকলে localStorage; তাও না থাকলে নতুন বানায়।
// JS শুধু তখনই কুকি লেখে যখন কুকি নেই (সার্ভার-কুকিকে ৭-দিনের JS-কুকি দিয়ে ওভাররাইট করে না)।

import type { SupabaseClient } from '@supabase/supabase-js';

const KEY = 'vc_device_id';
const VALID = /^[A-Za-z0-9_-]{16,64}$/;

function readCookie(): string {
  try {
    const m = document.cookie.match(/(?:^|;\s*)vc_device_id=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  } catch {
    return '';
  }
}

function generate(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID().replace(/-/g, '');
    }
  } catch {
    // ignore
  }
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const fromCookie = readCookie();
  const cookieOk = VALID.test(fromCookie);
  let local = '';
  try { local = localStorage.getItem(KEY) || ''; } catch { /* ignore */ }

  // সার্ভার-কুকি (টেকসই) সবার আগে; তারপর localStorage; শেষে নতুন
  const id = cookieOk ? fromCookie : VALID.test(local) ? local : generate();

  if (id !== local) {
    try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
  }
  // কুকি না থাকলেই (মিডলওয়্যার চলেনি / মুছে গেছে) JS দিয়ে বসানো — আছে এমন কুকি ছোঁয়া হয় না
  if (!cookieOk) {
    try {
      document.cookie = `vc_device_id=${encodeURIComponent(id)}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
    } catch {
      // ignore
    }
  }
  return id;
}

/**
 * এই ডিভাইস সার্ভারে আগে কোন কোন আইটেমে লাইক দিয়েছে (লোকাল স্টোরেজ মুছে গেলেও লাভ ফিরে আসে)।
 * ⚠️ ব্যর্থ হলে `null` (খালি তালিকা নয়) — যাতে ডাকার জায়গা "সিঙ্ক হয়েছে" ধরে না নেয়
 * এবং একটা নেটওয়ার্ক-গ্লিচে পুরো সেশনের হার্ট খালি না থাকে।
 */
export async function fetchMyLikedIds(
  supabase: SupabaseClient,
  targetType: 'product_review' | 'customer_gallery',
): Promise<string[] | null> {
  const id = getDeviceId();
  if (!id) return null;
  try {
    const { data, error } = await supabase.rpc('get_my_likes', {
      p_device_id: id,
      p_target_type: targetType,
    });
    if (error || !Array.isArray(data)) return null;
    return data.map(String);
  } catch {
    return null;
  }
}
