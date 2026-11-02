'use server';

import { createServiceClient } from '@/lib/supabase/serviceClient';
import { createClient } from '@/lib/supabase/server';
import { logWarn } from '@/lib/logger';
import { headers } from 'next/headers';
import { getClientIp, slidingWindowLimit, tokenBucketLimit } from '@/lib/limiter';
import { recordLimitHit, type LimitEventType } from '@/lib/limitEvents';
import type { CouponValidationResult } from '@/lib/couponData';
import { MEMBERSHIP_TIERS } from '@/lib/membershipData';

// কুপনের লিমিট ছোঁয়ার রেকর্ড (অর্ডার ট্রাস্ট স্কোরের জন্য)। পরিচয় হিসেবে শুধু আইপি ও লগইন-সেশনের
// ইউজার আইডি — ফোন/ডিভাইস-আইডি ক্লায়েন্ট নিজে পাঠায়, তাই অন্যের নম্বর দিয়ে ফাঁসানো ঠেকাতে ব্যবহার হয় না।
// কখনো throw করে না, কুপন ফ্লো আটকায় না।
async function recordCouponLimit(type: LimitEventType, ip: string): Promise<void> {
  try {
    const cookieClient = await createClient();
    const { data } = await cookieClient.auth.getUser();
    await recordLimitHit(createServiceClient(), { type, ip, userId: data?.user?.id ?? null });
  } catch (e) {
    logWarn('[Vangcur] coupon limit record skipped:', e);
  }
}

/**
 * কুপন যাচাই — service-role ক্লায়েন্ট দিয়ে সার্ভার-সাইডে চলে।
 * (আগে ক্লায়েন্ট থেকে সরাসরি anon key দিয়ে `validate_and_apply_coupon` RPC কল হতো —
 * যে কেউ সরাসরি Supabase REST API কল করে এলোমেলো কোড ট্রাই করতে পারত, DB
 * ফাংশনে anon/authenticated EXECUTE revoke করার পর এই রুট ছাড়া আর কোনো পথ নেই।)
 */
export async function validateCouponAction(
  code: string,
  subtotal: number,
  phone?: string | null,
  userId?: string | null,
  fingerprintId?: string | null,
): Promise<CouponValidationResult> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { ok: false, error: 'অনুগ্রহ করে একটি কুপন কোড লিখুন' };
  }

  try {
    // 🛡️ রেট লিমিট (কোড অনুমান/ব্রুট-ফোর্স ঠেকাতে) — দুই স্তর:
    //  ১) টোকেন-বাকেট: একবারে ৮টা চেষ্টা চলে, তারপর প্রতি ৬ সেকেন্ডে ১টা করে ফিরে আসে
    //  ২) ব্যর্থ-চেষ্টার হার্ড ক্যাপ: প্রতি ঘণ্টায় সর্বোচ্চ ২০টি ভুল/অকার্যকর চেষ্টা (শুধু ব্যর্থতা গণনা হয়)
    const clientIp = getClientIp(await headers());
    const bucket = await tokenBucketLimit(`coupon:${clientIp}`, 8, 1 / 6);
    if (!bucket.allowed) {
      await recordCouponLimit('coupon_burst', clientIp);
      return { ok: false, error: `অনেকবার চেষ্টা করা হয়েছে। ${bucket.retryAfterSec} সেকেন্ড পরে আবার চেষ্টা করুন।`, transient: true };
    }
    const failPeek = await slidingWindowLimit(`coupon-fail:${clientIp}`, 20, 3600, 0);
    if (!failPeek.allowed) {
      await recordCouponLimit('coupon_fail_hourly', clientIp);
      return { ok: false, error: 'অনেকবার ভুল কুপন দেওয়া হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।', transient: true };
    }

    // ইউজার আইডি ক্লায়েন্টের পাঠানো মান থেকে নয়, লগইন সেশন থেকে নেওয়া হয় —
    // মেম্বারশিপ-লেভেলের কুপন যাচাইয়ে এটাই একমাত্র বিশ্বস্ত পরিচয়।
    const cookieClient = await createClient();
    const { data: userData } = await cookieClient.auth.getUser();
    const sessionUserId = userData?.user?.id ?? null;

    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc('validate_and_apply_coupon', {
      p_code: cleanCode,
      p_subtotal: Number(subtotal) || 0,
      p_phone: phone ? phone.trim() : null,
      p_user_id: sessionUserId,
      p_fingerprint_id: fingerprintId ? fingerprintId.trim() : null,
    });

    if (error || !data) {
      logWarn('[Vangcur] validate_and_apply_coupon RPC error:', error?.message);
      return { ok: false, error: 'কুপন যাচাই করা সম্ভব হয়নি', transient: true };
    }

    if (!data.ok) {
      // ব্যর্থ চেষ্টা গণনায় যোগ (সফল চেষ্টা কখনো গণনায় ধরা হয় না)
      await slidingWindowLimit(`coupon-fail:${clientIp}`, 20, 3600, 1);
      return { ok: false, error: data.error || 'অবৈধ কুপন কোড' };
    }

    return {
      ok: true,
      coupon: {
        code: data.code,
        discountType: data.discount_type,
        discountValue: Number(data.discount_value),
        discountAmount: Number(data.discount_amount),
        freeShipping: !!data.free_shipping,
        minOrderAmount: Number(data.min_order_amount) || 0,
        maxDiscountAmount: data.max_discount_amount == null ? null : Number(data.max_discount_amount),
      },
    };
  } catch (e) {
    logWarn('[Vangcur] validate_and_apply_coupon exception:', e);
    return { ok: false, error: 'নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।', transient: true };
  }
}

/**
 * মেম্বারশিপ মডালে লেভেল-কুপনের আসল কোড দেখানোর জন্য — কোড ক্লায়েন্ট বান্ডেলে
 * হার্ডকোড করা নেই; সার্ভার লগইন সেশন থেকে ইউজারের ডেলিভার্ড অর্ডার গুনে
 * লেভেল মিললে তবেই কোড ফেরত দেয়।
 */
export async function getTierCouponCodeAction(
  tierKey: string,
): Promise<{ ok: boolean; code?: string }> {
  const tier = MEMBERSHIP_TIERS.find((t) => t.key === tierKey);
  if (!tier || tier.min <= 0) return { ok: false };

  try {
    const cookieClient = await createClient();
    const { data: userData } = await cookieClient.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return { ok: false };

    const service = createServiceClient();
    const { count } = await service
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('status', 'delivered');
    if ((count ?? 0) < tier.min) return { ok: false };

    const { data } = await service
      .from('coupons')
      .select('code, expires_at')
      .eq('required_tier', tierKey)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    const now = Date.now();
    const row = (data || []).find((c) => !c.expires_at || new Date(c.expires_at).getTime() > now);
    return row ? { ok: true, code: row.code as string } : { ok: false };
  } catch (e) {
    logWarn('[Vangcur] getTierCouponCodeAction exception:', e);
    return { ok: false };
  }
}
