// ফাইলের পাথ: lib/deviceId.ts
// প্রতিটি ব্রাউজারের জন্য একটা র‍্যান্ডম ডিভাইস-আইডি (কোনো ব্যক্তিগত তথ্য নয়)।
// লাইক গণনায় আগে IP ধরা হতো — একই ওয়াইফাই/মোবাইল নেটওয়ার্কের অনেকে একই IP শেয়ার করে,
// তাই দ্বিতীয় জনের লাইক বাদ পড়ত। এখন প্রতি ডিভাইসে প্রতি আইটেমে ১টা লাইক।
// localStorage + কুকি — দুই জায়গাতেই রাখা হয়, একটা মুছে গেলে অন্যটা থেকে ফিরে আসে।

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
  let id = '';
  try { id = localStorage.getItem(KEY) || ''; } catch { /* ignore */ }
  if (!VALID.test(id)) id = readCookie();
  if (!VALID.test(id)) id = generate();
  try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
  try {
    document.cookie = `vc_device_id=${encodeURIComponent(id)}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
  } catch {
    // ignore
  }
  return id;
}

/** এই ডিভাইস সার্ভারে আগে কোন কোন আইটেমে লাইক দিয়েছে (লোকাল স্টোরেজ মুছে গেলেও লাভ ফিরে আসে) */
export async function fetchMyLikedIds(
  supabase: SupabaseClient,
  targetType: 'product_review' | 'customer_gallery',
): Promise<string[]> {
  const id = getDeviceId();
  if (!id) return [];
  try {
    const { data, error } = await supabase.rpc('get_my_likes', {
      p_device_id: id,
      p_target_type: targetType,
    });
    if (error || !Array.isArray(data)) return [];
    return data.map(String);
  } catch {
    return [];
  }
}
