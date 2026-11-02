// ফাইলের পাথ: app/api/revalidate-catalog/route.ts
// [NEW] Mehediadmin (আলাদা ডিপ্লয়মেন্ট) প্রোডাক্ট/ক্যাটাগরি/হিরো/অফার বদলালে এই এন্ডপয়েন্ট
// হিট করে — তখনই Vangcur-এর ক্যাশ করা (ISR) পেজগুলো মুছে যায়, ফলে নতুন দাম/স্টক/ছবি
// পরের ভিজিটেই লাইভ হয়, ৫ মিনিট অপেক্ষা করতে হয় না।
//
// অ্যাডমিনের জন্য নতুন কোনো env লাগে না — আগের revalidate-guide এন্ডপয়েন্টের একই গোপন চাবি
// (GUIDE_REVALIDATE_SECRET_KEY) ও সাইটের ঠিকানা (VANGCUR_SITE_URL) ব্যবহার হয়।

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'crypto';
import { logWarn } from '@/lib/logger';

function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  const expected = process.env.GUIDE_REVALIDATE_SECRET_KEY;
  if (!expected) {
    logWarn('[revalidate-catalog] GUIDE_REVALIDATE_SECRET_KEY সেট করা নেই — রিকোয়েস্ট প্রত্যাখ্যাত');
    return NextResponse.json({ ok: false, message: 'not configured' }, { status: 503 });
  }

  const secret = req.headers.get('x-revalidate-secret');
  if (!secret || !secretsMatch(secret, expected)) {
    return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  // হোম, অফার, সব ক্যাটাগরি পেজ ও সব প্রোডাক্ট পেজ (রিলেটেড/কালার-ভ্যারিয়েন্ট একে অপরের
  // ডেটা দেখায়, তাই একটা বদলালে সবগুলোই নতুন করে বানানো নিরাপদ) এবং সাইটম্যাপ।
  revalidatePath('/');
  revalidatePath('/offers');
  revalidatePath('/category/[slug]', 'page');
  revalidatePath('/collection/[slug]', 'page');
  revalidatePath('/product/[slug]', 'page');
  revalidatePath('/sitemap.xml');
  revalidatePath('/api/search-index');
  // Next 16: দ্বিতীয় আর্গুমেন্ট বাধ্যতামূলক। { expire: 0 } = আগের মতোই সঙ্গে সঙ্গে ক্যাশ মোছা
  // (stale-while-revalidate নয়), যাতে অ্যাডমিনের বদল তখনই লাইভে দেখা যায়।
  revalidateTag('catalog', { expire: 0 });

  return NextResponse.json({ ok: true });
}
