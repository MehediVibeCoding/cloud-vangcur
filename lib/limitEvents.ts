// [NEW FILE] ফাইলের পাথ: lib/limitEvents.ts
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logWarn } from '@/lib/logger';

/**
 * কেউ কোনো লিমিট ছুঁলে তার রেকর্ড (limit_events টেবিলে) — অর্ডার ট্রাস্ট স্কোর এখান থেকে পড়ে।
 *
 * নতুন কোনো লিমিট যোগ করলে শুধু ওই জায়গায় `recordLimitHit()` কল করলেই স্কোরিং সেটা ধরবে;
 * স্কোরিং কোডে হাত দিতে হবে না। (লিমিট গণনা Redis/Postgres যেখানেই হোক, রেকর্ড এখানেই।)
 *
 * severity লিমিটের ধরন (type) থেকে এক জায়গায় (LIMIT_SEVERITY) নির্ধারিত হয় — কলার ঠিক করে না,
 * যাতে ভুল severity বসার সুযোগ না থাকে:
 *  - 'hard': সীমা আসলেই "পুরো" ছুঁয়েছে (ফোন/ডিভাইসের ২৪ ঘণ্টার অর্ডার-সীমা, কুপনে ঘণ্টায় অতিরিক্ত ভুল চেষ্টা)
 *            — ফোন/ডিভাইস/লগইন-আইডির সাথে মিললে অর্ডার সরাসরি লাল
 *  - 'soft': সৎ কাস্টমারও ছুঁতে পারে (ডাবল-ক্লিক, শেয়ার্ড আইপি, পেন্ডিং-লক) — শুধু পয়েন্ট কাটে
 *
 * এই ফাংশন কখনো throw করে না এবং চেকআউট/কুপন ফ্লো আটকায় না — ব্যর্থ হলে শুধু warn লগ।
 */
export type LimitEventType =
  | 'phone_daily'
  | 'phone_cooldown'
  | 'fingerprint_daily'
  | 'ip_daily'
  | 'pending_lock'
  | 'coupon_fail_hourly'
  | 'coupon_burst';

export const LIMIT_SEVERITY: Record<LimitEventType, 'hard' | 'soft'> = {
  phone_daily: 'hard',
  fingerprint_daily: 'hard',
  coupon_fail_hourly: 'hard',
  phone_cooldown: 'soft',
  ip_daily: 'soft',
  pending_lock: 'soft',
  coupon_burst: 'soft',
};

export interface LimitHitInput {
  type: LimitEventType;
  phone?: string | null;
  fingerprintId?: string | null;
  userId?: string | null;
  ip?: string | null;
}

const WRITE_TIMEOUT_MS = 1500;

export async function recordLimitHit(service: SupabaseClient, hit: LimitHitInput): Promise<void> {
  try {
    const insert = service.from('limit_events').insert({
      limit_type: hit.type,
      severity: LIMIT_SEVERITY[hit.type],
      phone: hit.phone || null,
      fingerprint_id: hit.fingerprintId || null,
      user_id: hit.userId || null,
      ip: hit.ip || null,
    });
    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), WRITE_TIMEOUT_MS));
    const res = await Promise.race([Promise.resolve(insert), timeout]);
    if (res === 'timeout') {
      logWarn('[limit-events] write timed out (skipped):', hit.type);
    } else if (res.error) {
      logWarn('[limit-events] write failed (skipped):', hit.type, res.error.message);
    }
  } catch (e) {
    logWarn('[limit-events] write exception (skipped):', hit.type, e);
  }
}

const PHONE_DAILY_LIMIT = 3;

/**
 * check_and_set_rate_limit দুই কারণে false দেয় — ৩০ সেকেন্ডের কুলডাউন (সৎ ডাবল-ক্লিকেও হয়)
 * আর ২৪ ঘণ্টায় ৩ অর্ডারের সীমা। কোনটা ঘটেছে সেটা এখানে আলাদা করা হয়:
 * গত ২৪ ঘণ্টায় এই ফোনের অর্ডার ≥ ৩ হলে 'phone_daily' (hard), নাহলে 'phone_cooldown' (soft)।
 * গণনা ব্যর্থ হলে নিরাপদ দিকে — soft ধরা হয় (কাউকে ভুল করে লাল না করার জন্য)।
 */
export async function classifyPhoneLimit(service: SupabaseClient, phone: string): Promise<'phone_daily' | 'phone_cooldown'> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await service
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_phone', phone)
      .gte('created_at', since);
    if (error) return 'phone_cooldown';
    return (count || 0) >= PHONE_DAILY_LIMIT ? 'phone_daily' : 'phone_cooldown';
  } catch {
    return 'phone_cooldown';
  }
}
