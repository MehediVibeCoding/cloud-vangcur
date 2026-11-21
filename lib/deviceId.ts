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

/**
 * আইডি বের করে (কুকি → localStorage → নতুন)। `persistCookie` true হলে কুকি না থাকার ক্ষেত্রে JS-কুকিও বসায়
 * (শুধু ensureDeviceCookie()-এর শেষ ফলব্যাক, সার্ভার-কল ব্যর্থ হলে)। কোনো নেটওয়ার্ক-কল করে না।
 */
function resolveId(persistCookie: boolean): string {
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
  // কুকি না থাকলে এবং persistCookie চাইলে (শুধু ফলব্যাক) JS দিয়ে বসানো — আছে এমন কুকি ছোঁয়া হয় না
  if (!cookieOk && persistCookie) {
    try {
      document.cookie = `vc_device_id=${encodeURIComponent(id)}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
    } catch {
      // ignore
    }
  }
  return id;
}

/** শুধু পড়ার জন্য (যেমন লাইক-তালিকা আনা): কোনো নেটওয়ার্ক-কল বা কুকি-লেখা ঘটায় না। */
export function peekDeviceId(): string {
  return resolveId(false);
}

/**
 * লাইক লেখার পথে ব্যবহার (increment_*_like): আইডি সঙ্গে সঙ্গে ফেরত দেয় এবং পেছনে (অপেক্ষা না করে)
 * টেকসই সার্ভার-কুকি নিশ্চিত করে। ⚡ লেজি: পেজ খোলার সময় নয়, শুধু প্রথম লাইকে ১টা /api/device-id কল —
 * বেশিরভাগ ভিজিটর লাইক দেয় না, তাই তাদের জন্য Worker-এ ১টা রিকোয়েস্ট বাঁচে (ফ্রি প্ল্যানের দৈনিক সীমা)।
 * আইডি আগেই localStorage-এ বসে যায়, তাই ব্যাকগ্রাউন্ড কলও একই আইডি কুকিতে তোলে — লাইক ও কুকির আইডি মেলে।
 */
export function getDeviceId(): string {
  const id = resolveId(false);
  if (id) void ensureDeviceCookie();
  return id;
}

/**
 * টেকসই (সার্ভার-সেট, ১ বছর) কুকি নিশ্চিত করে: কুকি না থাকলে একবার /api/device-id ডাকে।
 * একসাথে অনেকগুলো কল এলেও নেটওয়ার্ক-রিকোয়েস্ট যায় একটাই (pending প্রমিস শেয়ার হয়)।
 * localStorage-এ আগের আইডি থাকলে সেটাই কুকিতে তোলা হয় (লাইকের ধারাবাহিকতা বজায় থাকে)।
 */
let pendingEnsure: Promise<void> | null = null;

export function ensureDeviceCookie(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (VALID.test(readCookie())) return Promise.resolve();
  if (pendingEnsure) return pendingEnsure;
  pendingEnsure = (async () => {
    let local = '';
    try { local = localStorage.getItem(KEY) || ''; } catch { /* ignore */ }
    try {
      const qs = VALID.test(local) ? `?id=${encodeURIComponent(local)}` : '';
      await fetch(`/api/device-id${qs}`, { credentials: 'same-origin', cache: 'no-store' });
    } catch {
      // নেটওয়ার্ক ব্যর্থ — নিচের ফলব্যাক (JS-কুকি/localStorage) চলবে
    }
    resolveId(true);
  })().finally(() => {
    pendingEnsure = null;
  });
  return pendingEnsure;
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
  const id = peekDeviceId(); // শুধু পড়া — এতে /api/device-id ডাকা হয় না
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
