// [NEW FILE] ফাইলের পাথ: lib/couponData.ts
import { validateCouponAction } from '@/app/actions/coupon';

export const COUPON_CHANGE_EVENT = 'vc:couponChange';
const COUPON_STORAGE_KEY = 'vc_applied_coupon';

export interface AppliedCoupon {
  code: string;
  discountType: 'fixed' | 'percent' | 'free_shipping';
  discountValue: number;
  discountAmount: number;
  freeShipping: boolean;
  minOrderAmount: number;
  /** শতাংশ-কুপনের সর্বোচ্চ ছাড় (DB-র max_discount_amount); null = ক্যাপ নেই। পুরনো সেশনে এই ফিল্ড না-ও থাকতে পারে। */
  maxDiscountAmount?: number | null;
}

export interface CouponValidationResult {
  ok: boolean;
  coupon?: AppliedCoupon;
  error?: string;
  /**
   * true = এটা কুপন কোডটা ভুল/অবৈধ হওয়ার রায় নয় — সাময়িক সমস্যা (রেট-লিমিট, নেটওয়ার্ক,
   * সার্ভার এরর)। UI তাই এই ক্ষেত্রে কোডটাকে "ব্যর্থ কোড" হিসেবে আটকায় না (বাটন "প্রয়োগ"ই
   * থাকে, ব্যবহারকারী পরে আবার চেষ্টা করতে পারে)। শুধু "মুছুন ↔ প্রয়োগ" লজিকের জন্য।
   */
  transient?: boolean;
}

/**
 * ব্রাউজার সেশন থেকে বর্তমানে অ্যাপ্লাই করা কুপন রিড করা
 */
export function getAppliedCoupon(): AppliedCoupon | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(COUPON_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * কুপন সফলভাবে অ্যাপ্লাই হলে সংরক্ষণ ও গ্লোবাল ইভেন্ট ডিসপ্যাচ
 */
export function saveAppliedCoupon(coupon: AppliedCoupon): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupon));
    window.dispatchEvent(new CustomEvent(COUPON_CHANGE_EVENT, { detail: { coupon } }));
  } catch {
    // ignore
  }
}

/**
 * কুপন রিমুভ / বাতিল করা
 */
export function removeAppliedCoupon(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(COUPON_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(COUPON_CHANGE_EVENT, { detail: { coupon: null } }));
  } catch {
    // ignore
  }
}

/**
 * Supabase RPC কল করে কুপন কোড ও শর্তাবলী নিখুঁতভাবে যাচাই করা
 */
export async function validateCoupon(
  code: string,
  subtotal: number,
  phone?: string,
  userId?: string | null,
  fingerprintId?: string | null,
): Promise<CouponValidationResult> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { ok: false, error: 'অনুগ্রহ করে একটি কুপন কোড লিখুন' };
  }

  try {
    return await validateCouponAction(cleanCode, subtotal, phone, userId, fingerprintId);
  } catch (err: any) {
    return { ok: false, error: err?.message || 'নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।', transient: true };
  }
}

/**
 * কার্টে পণ্যের পরিমাণ বাড়লে/কমলে স্বয়ংক্রিয়ভাবে ডিসকাউন্ট পুনঃহিসাব করা
 */
export function recalculateDiscount(
  coupon: AppliedCoupon | null,
  currentSubtotal: number,
): { discountAmount: number; isValid: boolean; reason?: string } {
  if (!coupon) {
    return { discountAmount: 0, isValid: true };
  }

  // মিনিমাম অর্ডারের শর্ত এখনও পূরণ হচ্ছে কি না
  if (coupon.minOrderAmount > 0 && currentSubtotal < coupon.minOrderAmount) {
    return {
      discountAmount: 0,
      isValid: false,
      reason: `এই কুপনের জন্য সর্বনিম্ন ৳${coupon.minOrderAmount} টাকার অর্ডার প্রয়োজন`,
    };
  }

  let discount = 0;
  if (coupon.discountType === 'fixed') {
    discount = Math.min(coupon.discountValue, currentSubtotal);
  } else if (coupon.discountType === 'percent') {
    discount = Math.round(currentSubtotal * (coupon.discountValue / 100));
    // সর্বোচ্চ ছাড়ের ক্যাপ (DB-র max_discount_amount)। ফিল্ডটা undefined হলে (এই ফিল্ড আসার আগের সেভ-করা
    // কুপন) প্রয়োগের সময়ের ছাড়কেই ক্যাপ ধরা হয়; চূড়ান্ত হিসাব সবসময় সার্ভার চেকআউটে হয়।
    const cap = coupon.maxDiscountAmount === undefined ? coupon.discountAmount : coupon.maxDiscountAmount;
    if (cap && discount > cap) {
      discount = cap;
    }
    discount = Math.min(discount, currentSubtotal);
  } else if (coupon.discountType === 'free_shipping') {
    discount = 0; // শিপিং চার্জে কাটবে
  }

  return { discountAmount: discount, isValid: true };
      }


/**
 * সার্ভার/ডাটাবেজ থেকে আসা কুপন এরর বাংলায় আসে — ইংরেজি মোডে সেটাকে ইংরেজিতে রূপান্তর।
 * চেনা মেসেজ না হলে যেমন আছে তেমনই ফেরত দেয় (কিছু হারায় না)।
 */
export function localizeCouponError(msg: string | undefined | null, lang: string): string {
  const m = (msg || '').trim();
  if (lang !== 'en' || !m) return m;

  const exact: Record<string, string> = {
    'অনুগ্রহ করে একটি কুপন কোড লিখুন': 'Please enter a coupon code',
    'কুপন কোড লিখুন': 'Please enter a coupon code',
    'অনেকবার ভুল কুপন দেওয়া হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।': 'Too many incorrect coupon attempts. Please try again later.',
    'কুপন যাচাই করা সম্ভব হয়নি': 'Could not verify the coupon. Please try again.',
    'অবৈধ কুপন কোড': 'Invalid coupon code',
    'কুপন কোডটি সঠিক নয়': 'Invalid coupon code',
    'কুপন কোডটি সঠিক নয় অথবা প্রযোজ্য নয়': 'This coupon code is invalid or not applicable',
    'নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।': 'Network problem. Please try again.',
    'আপনি ইতিমধ্যে এই কুপনটি ব্যবহার করে ফেলেছেন': 'You have already used this coupon',
  };
  if (exact[m]) return exact[m];

  let r = m.match(/^অনেকবার চেষ্টা করা হয়েছে। (.+) সেকেন্ড পরে আবার চেষ্টা করুন।$/);
  if (r) return `Too many attempts. Please try again in ${r[1]}s.`;

  r = m.match(/^এই কুপনটি পেতে সর্বনিম্ন ৳(.+) টাকার পণ্য অর্ডার করতে হবে$/);
  if (r) return `A minimum order of ৳${r[1].replace(/\.0+$/, '')} is required for this coupon`;

  r = m.match(/^এই কুপনের জন্য সর্বনিম্ন ৳(.+) টাকার অর্ডার প্রয়োজন$/);
  if (r) return `A minimum order of ৳${r[1].replace(/\.0+$/, '')} is required for this coupon`;

  return m;
}
