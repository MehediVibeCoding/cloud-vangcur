import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { checkIsPrivilegedClient } from '@/lib/checkoutData';
import { fetchFullOrder, readPendingLockInfo } from '@/lib/orderStatus';
import { OPEN_PENDING_LOCK_EVENT } from '@/lib/uiEvents';

// পেন্ডিং অর্ডার থাকলে নতুন অর্ডার আটকে রাখার মোট সময়সীমা।
export const PENDING_LOCK_MS = 30 * 60 * 1000;
// প্রথম ৫ মিনিট "ফাস্ট-ট্র্যাক ভেরিফিকেশন" — এরপর থেকে অবশিষ্ট মিনিটের কাউন্টডাউন দেখানো হয়।
export const PENDING_VERIFY_WINDOW_MS = 5 * 60 * 1000;

export interface PendingLockDetail {
  orderNum: string;
  ageSeconds: number;
}

export function openPendingLockModal(detail: PendingLockDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<PendingLockDetail>(OPEN_PENDING_LOCK_EVENT, { detail }));
}

/**
 * এই ব্রাউজারে রেখে যাওয়া ট্র্যাকিং মার্কার থেকে দ্রুত লক যাচাই।
 * আসল সিদ্ধান্ত সবসময় সার্ভারের (createOrder) — এটা শুধু অপ্রয়োজনীয় ফর্ম পূরণ থেকে বাঁচানোর জন্য।
 * - মার্কার নেই / ৩০ মিনিট পেরিয়েছে → লক নেই
 * - অর্ডার ইতিমধ্যে কনফার্ম/রিজেক্ট/ক্যানসেল → লক নেই (ইনস্ট্যান্ট রিলিজ)
 * - নেটওয়ার্ক ত্রুটিতে অর্ডার যাচাই না হলে → ফেইল-ওপেন (সার্ভার আটকাবে)
 */
export async function findLocalPendingLock(supabase: SupabaseClient): Promise<PendingLockDetail | null> {
  const info = readPendingLockInfo();
  if (!info) return null;
  const ageMs = Date.now() - info.ts;
  if (ageMs >= PENDING_LOCK_MS) return null;

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (await checkIsPrivilegedClient(supabase, userData?.user?.id)) return null;
  } catch {
    // ignore
  }

  try {
    const row = await fetchFullOrder(supabase, info.id, info.phone);
    if (!row) return null;
    if (String(row.status) !== 'pending') return null;
  } catch {
    return null;
  }

  return { orderNum: info.orderNum, ageSeconds: Math.max(0, Math.floor(ageMs / 1000)) };
}

/**
 * নতুন অর্ডার শুরুর যেকোনো বাটনের আগে বসানো গার্ড।
 * লক না থাকলে `proceed()` সাথে সাথে (সিঙ্ক্রোনাসভাবে) চলে — যাতে বিদ্যমান নেভিগেশন-টাইমিং বদলায় না।
 */
export function guardPendingLock(proceed: () => void): void {
  if (typeof window === 'undefined') {
    proceed();
    return;
  }
  const info = readPendingLockInfo();
  if (!info || Date.now() - info.ts >= PENDING_LOCK_MS) {
    proceed();
    return;
  }

  void (async () => {
    let lock: PendingLockDetail | null = null;
    try {
      lock = await findLocalPendingLock(createClient());
    } catch {
      lock = null;
    }
    if (lock) {
      openPendingLockModal(lock);
      return;
    }
    proceed();
  })();
}
