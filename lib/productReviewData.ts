import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProductReview, ReviewRatingSummary } from '@/types';
import { sanitizeInput, sanitizePlainName, MAX_NAME_LEN } from './security';
import { logWarn } from './logger';
import { getDeviceId, fetchMyLikedIds } from './deviceId';
import { withTimeout } from './withTimeout';

const MIN_REVIEW_LEN = 10;
const MAX_REVIEW_LEN = 200;
const MAX_UNVERIFIED_REVIEWS_PER_DAY = 2;
const LIKED_REVIEWS_KEY = 'vc_liked_reviews';

// R2 (Cloudflare) পাবলিক ইমেজ হোস্ট — রিভিউ ছবি এখন এখানে 'reviews/' prefix-এ থাকে
const R2_IMAGE_HOST = 'img.vangcur.com';
const R2_REVIEW_PREFIX = '/reviews/';

/**
 * 🛡️ রিভিউ ইমেজ URL হোয়াইটলিস্টিং ও সিকিউরিটি স্যানিটাইজার
 * গ্রহণযোগ্য শুধু: (১) নিজের R2 ডোমেইনের (img.vangcur.com/reviews/...) ছবি,
 * (২) পুরনো Cloudinary ডেটা (আমাদের ক্লাউড নেম সহ) — যাতে আগের রিভিউ না ভাঙে।
 * ফাংশনের নাম আগের মতোই রাখা হয়েছে, যেন কোনো import না ভাঙে।
 */
export function validateAndCleanCloudinaryUrls(rawUrls?: string | null): string | null {
  if (!rawUrls || typeof rawUrls !== 'string') return null;
  const urls = rawUrls.split(',').map((u) => u.trim()).filter(Boolean);
  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dkjzleczw';

  const safeUrls = urls.filter((url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || /[<>"'`]/.test(url)) return false;
      const isR2 =
        parsed.hostname === R2_IMAGE_HOST && parsed.pathname.startsWith(R2_REVIEW_PREFIX);
      const isLegacyCloudinary =
        parsed.hostname === 'res.cloudinary.com' && parsed.pathname.startsWith(`/${CLOUD_NAME}/`);
      return isR2 || isLegacyCloudinary;
    } catch {
      return false;
    }
  });

  return safeUrls.length > 0 ? safeUrls.slice(0, 3).join(',') : null;
}

/**
 * 🛡️ নিরাপদ সার্ভার সেশন-ভেরিফায়েড অ্যাডমিন ও মডারেটর রোল ভ্যালিডেটর
 * কোনো লোকালস্টোরেজ বা ক্লায়েন্ট ডাটায় বিশ্বাস করা হবে না।
 */
export async function checkIsReviewAdminOrMod(
  supabase: SupabaseClient,
  userId?: string | null,
): Promise<boolean> {
  try {
    // 🛡️ withTimeout: নেটওয়ার্ক/ডিভাইস দুর্বল হলে এই কলটা ঝুলে থাকতে পারে —
    // ১২ সেকেন্ডের মধ্যে রেসপন্স না এলে reject করে catch ব্লকে চলে যাবে
    // (নাহলে caller-এর loading state চিরকাল আটকে থাকত)
    const { data: { user }, error: authErr } = await withTimeout(supabase.auth.getUser());
    if (authErr || !user) return false;

    // যদি নির্দিষ্ট কোনো userId দিয়ে ভেরিফাই করতে বলা হয় এবং বর্তমান সেশন আইডির সাথে না মিলে
    if (userId && user.id !== userId) {
      return false;
    }

    // প্রোফাইল টেবিল থেকে অ্যাডমিন বা অনুমোদিত রোল যাচাই — শুধুমাত্র DB-ভিত্তিক
    // (আগে এখানে একটা হার্ডকোডেড মডারেটর-ইমেইল শর্টকাট ছিল, সরিয়ে ফেলা হয়েছে —
    // এখন সবাই একই DB role চেকের মধ্য দিয়ে যায়)
    const { data: profile, error: profileErr } = await withTimeout(
      supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('id', user.id)
        .maybeSingle(),
    );

    if (profileErr || !profile) return false;

    if (profile.is_admin === true) return true;
    if (profile.role && ['admin', 'super_admin', 'moderator'].includes(profile.role)) {
      return true;
    }
    return false;
  } catch (e) {
    logWarn('[Review] checkIsReviewAdminOrMod exception:', e);
    return false;
  }
}

export async function fetchProductReviews(
  supabase: SupabaseClient,
  productId: number | string,
  currentUserId?: string | null,
): Promise<ProductReview[]> {
  try {
    // 🛡️ withTimeout: ঝুলে থাকা নেটওয়ার্ক কল আটকাতে — না হলে caller-এর
    // loading state চিরকাল true-ই থেকে যেত (infinite loading skeleton)
    // 🔒 ফিক্স (C6): আগে এখানে .limit() ছিল না — রিভিউ অনেক বেড়ে গেলে (বা স্প্যামে)
    // প্রতি ভিজিটে পুরো তালিকা ব্রাউজারে যেত (Supabase egress ঝুঁকি)। সর্বশেষ ৩০০টা
    // (created_at desc) যথেষ্ট — এটা পূর্ণাঙ্গ পেজিনেশনের বদলে একটা নিরাপত্তা-সীমা,
    // UI-তে এখনো "আরও দেখুন" নেই তাই ভিজিটর যা দেখত তার চেয়ে কম দেখবে না (৩০০-র কম
    // রিভিউ থাকলে কোনো পরিবর্তনই নেই)।
    const { data, error } = await withTimeout(
      supabase
        .from('product_reviews')
        .select('id, product_id, user_id, user_name, rating, review_text, image_url, like_count, is_verified_buyer, is_approved, is_rejected, rejection_reason, created_at')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(300),
    );

    if (error || !data) return [];

    const reviews = data as ProductReview[];

    if (currentUserId) {
      reviews.sort((a, b) => {
        const aIsOwn = a.user_id === currentUserId && (!a.is_approved || a.is_rejected) ? 1 : 0;
        const bIsOwn = b.user_id === currentUserId && (!b.is_approved || b.is_rejected) ? 1 : 0;
        return bIsOwn - aIsOwn;
      });
    }

    return reviews;
  } catch (e) {
    logWarn('[Review] fetchProductReviews error:', e);
    return [];
  }
}

export async function checkIsVerifiedBuyer(
  supabase: SupabaseClient,
  productId: number | string,
  userId: string,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('items, status')
      .eq('user_id', userId)
      .in('status', ['confirmed', 'shipped', 'delivered']);

    if (error || !data || !data.length) return false;

    const prodStrId = String(productId);
    return data.some((order) => {
      let items = order.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = []; }
      }
      if (!Array.isArray(items)) return false;
      return items.some((item: { id?: string | number }) => String(item.id) === prodStrId);
    });
  } catch (e) {
    logWarn('[Review] checkIsVerifiedBuyer error:', e);
    return false;
  }
}

export async function checkUnverifiedReviewDailyLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ allowed: boolean; countToday: number }> {
  if (!userId) return { allowed: false, countToday: 0 };
  try {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('product_reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('is_verified_buyer', false)
      .gte('created_at', todayMidnight.toISOString());

    if (error || !data) return { allowed: true, countToday: 0 };

    const countToday = data.length;
    return {
      allowed: countToday < MAX_UNVERIFIED_REVIEWS_PER_DAY,
      countToday,
    };
  } catch {
    return { allowed: true, countToday: 0 };
  }
}

export interface SubmitReviewPayload {
  productId: number | string;
  userId: string;
  userName: string;
  rating: number;
  reviewText: string;
  imageUrl?: string | null;
}

export async function submitProductReview(
  supabase: SupabaseClient,
  payload: SubmitReviewPayload,
): Promise<{ ok: boolean; data?: ProductReview; error?: string; limitExceeded?: boolean }> {
  if (!payload.userId) {
    return { ok: false, error: 'রিভিউ দেওয়ার জন্য লগইন করা আবশ্যক।' };
  }

  const name = sanitizePlainName(payload.userName || '').trim();
  const text = sanitizeInput(payload.reviewText || '').trim();
  const rating = Math.max(1, Math.min(5, Math.round(Number(payload.rating) || 5)));
  const sanitizedImageUrl = validateAndCleanCloudinaryUrls(payload.imageUrl);

  if (!name || name.length < 2 || name.length > MAX_NAME_LEN) {
    return { ok: false, error: 'অনুগ্রহ করে সঠিক নাম দিন (২-৩০ অক্ষর)' };
  }

  if (!text || text.length < MIN_REVIEW_LEN || text.length > MAX_REVIEW_LEN) {
    return { ok: false, error: `রিভিউটি কমপক্ষে ${MIN_REVIEW_LEN} এবং সর্বোচ্চ ${MAX_REVIEW_LEN} অক্ষরের হতে হবে` };
  }

  // এডমিন বা অথরাইজড মডারেটর কি না যাচাই
  const isPrivileged = await checkIsReviewAdminOrMod(supabase, payload.userId);
  let isVerified = false;

  if (!isPrivileged) {
    isVerified = await checkIsVerifiedBuyer(supabase, payload.productId, payload.userId);
    if (!isVerified) {
      const limitCheck = await checkUnverifiedReviewDailyLimit(supabase, payload.userId);
      if (!limitCheck.allowed) {
        return {
          ok: false,
          limitExceeded: true,
          error: 'আপনি ইতিমধ্যে আজকের জন্য সর্বোচ্চ ২টি আন-অর্ডারড প্রোডাক্টে রিভিউ দিয়েছেন।',
        };
      }
    }
  }

  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id: payload.productId,
        user_id: payload.userId,
        user_name: name,
        rating,
        review_text: text,
        image_url: sanitizedImageUrl,
        like_count: 0,
        is_verified_buyer: isVerified || isPrivileged,
        is_approved: isPrivileged, // মডারেটর রিভিউ দিলে সাথে সাথে লাইভ হবে
        is_rejected: false,
      })
      .select('id, product_id, user_id, user_name, rating, review_text, image_url, like_count, is_verified_buyer, is_approved, is_rejected, rejection_reason, created_at')
      .single();

    if (error) {
      if (error.code === 'P0001') {
        return { ok: false, limitExceeded: true, error: error.message };
      }
      if (error.code === '23505') {
        return { ok: false, error: 'আপনি ইতিমধ্যে এই প্রোডাক্টটিতে একটি রিভিউ দিয়েছেন।' };
      }
      logWarn('[Review] submitProductReview error:', { code: error.code, message: error.message, details: error.details, hint: error.hint });
      return { ok: false, error: `রিভিউ জমা দেওয়া সম্ভব হয়নি। আবার চেষ্টা করুন। (ত্রুটি কোড: ${error.code || 'অজানা'})` };
    }

    return { ok: true, data: data as ProductReview };
  } catch (e) {
    logWarn('[Review] submitProductReview exception:', e);
    return { ok: false, error: 'নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।' };
  }
}

export async function deleteProductReview(
  supabase: SupabaseClient,
  reviewId: number | string,
  userId?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const isPrivileged = await checkIsReviewAdminOrMod(supabase, userId);

    let q = supabase.from('product_reviews').delete().eq('id', reviewId);
    if (!isPrivileged && userId) {
      q = q.eq('user_id', userId);
    }

    const { error } = await q;
    if (error) {
      logWarn('[Review] deleteProductReview error:', error);
      return { ok: false, error: 'রিভিউটি মুছে ফেলা সম্ভব হয়নি।' };
    }
    return { ok: true };
  } catch (e) {
    logWarn('[Review] deleteProductReview exception:', e);
    return { ok: false, error: 'নেটওয়ার্ক সমস্যা।' };
  }
}

export function getLikedReviews(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LIKED_REVIEWS_KEY) || '[]');
  } catch {
    return [];
  }
}

/** সার্ভারে থাকা এই ডিভাইসের লাইক + লোকাল লাইক মিলিয়ে ফেরত দেয় এবং লোকালে আবার লিখে রাখে */
export async function syncLikedReviews(supabase: SupabaseClient): Promise<string[]> {
  const local = getLikedReviews();
  const remote = await fetchMyLikedIds(supabase, 'product_review');
  const merged = Array.from(new Set([...local, ...remote]));
  if (merged.length !== local.length) {
    try {
      localStorage.setItem(LIKED_REVIEWS_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
  }
  return merged;
}

export async function toggleReviewLike(
  supabase: SupabaseClient,
  reviewId: number | string,
): Promise<{ ok: boolean; newCount?: number }> {
  const idStr = String(reviewId);
  const liked = getLikedReviews();
  if (liked.includes(idStr)) {
    return { ok: false };
  }

  // ❤️ আগে ব্রাউজারে "লাইক দেওয়া হয়েছে" লিখে রাখা হয় — নেটওয়ার্ক কলের ফলাফলের অপেক্ষায় নয়।
  // (আগে লেখা হতো কল সফল হওয়ার পরে; কল শেষ হওয়ার আগে পেজ ছাড়লে/কল ব্যর্থ হলে লাভ আবার ফাঁকা হয়ে যেত।)
  const writeLiked = (list: string[]) => {
    try {
      localStorage.setItem(LIKED_REVIEWS_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  };
  writeLiked([...liked, idStr]);

  try {
    const { data, error } = await supabase.rpc('increment_review_like', {
      p_review_id: Number(reviewId),
      p_device_id: getDeviceId(),
    });

    if (error) {
      logWarn('[Review] toggleReviewLike RPC error:', error);
      writeLiked(liked); // সত্যিকারের ব্যর্থতা — লাইক ফিরিয়ে নেওয়া হলো, যাতে আবার চেষ্টা করা যায়
      return { ok: false };
    }

    return { ok: true, newCount: Number(data) };
  } catch (e) {
    logWarn('[Review] toggleReviewLike exception:', e);
    writeLiked(liked);
    return { ok: false };
  }
}

export function calculateReviewSummary(
  reviews: ProductReview[],
  defaultRating = 4.8,
): ReviewRatingSummary {
  const approvedReviews = reviews.filter((r) => r.is_approved && !r.is_rejected);
  const count = approvedReviews.length;

  if (count === 0) {
    return {
      average: defaultRating,
      count: 0,
      breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      hasReviews: false,
    };
  }

  const totalStars = approvedReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
  const average = Number((totalStars / count).toFixed(1));

  const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  approvedReviews.forEach((r) => {
    const star = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
    starCounts[star] = (starCounts[star] || 0) + 1;
  });

  const breakdown: Record<number, number> = {
    5: Math.round((starCounts[5] / count) * 100),
    4: Math.round((starCounts[4] / count) * 100),
    3: Math.round((starCounts[3] / count) * 100),
    2: Math.round((starCounts[2] / count) * 100),
    1: Math.round((starCounts[1] / count) * 100),
  };

  return {
    average,
    count,
    breakdown,
    hasReviews: true,
  };
}
