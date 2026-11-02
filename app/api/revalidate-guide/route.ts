// ফাইলের পাথ: app/api/revalidate-guide/route.ts
// [NEW] Mehediadmin আর Vangcur দুটো আলাদা Next.js ডিপ্লয়মেন্ট, তাই Mehediadmin-এর
// server action থেকে revalidatePath(...) কল করলে সেটা Mehediadmin-এর নিজের
// (অস্তিত্বহীন) ক্যাশ রিভ্যালিডেট করে — Vangcur-এর আসল লাইভ পেজের ক্যাশ কখনোই ছোঁয় না।
// এই এন্ডপয়েন্টটাই সেই ব্রিজ: Mehediadmin guide_pages-এ কোনো write করার পরই এটাকে
// একটা secret header সহ কল করবে, আর এটা Vangcur-এর নিজের প্রসেসের ভেতর থেকে
// revalidatePath() চালাবে — ফলে edit/publish করার সাথে সাথেই লাইভ পেজ আপডেট হবে,
// বর্তমান `export const revalidate = 300`-এর সময়-ভিত্তিক ব্যাকগ্রাউন্ড রিফ্রেশের
// জন্য আর অপেক্ষা করতে হবে না।
//
// ⚠️ গাইড পেজগুলো root-level catch-all (app/[...segments]/page.tsx) দিয়ে সার্ভ
// হয়, কোনো একটা কমন "/guides" prefix নেই — তাই এখানে path validate করার সময়
// RESERVED_URL_PREFIXES (Vangcur-এর real static routes) থেকে বাদ দেওয়া হয়, কোনো
// fixed prefix match করে না। নির্দিষ্ট path না থাকলে (যেমন delete, বা টেমপ্লেটের
// url_prefix বদলানো — অনেক পেজ একসাথে প্রভাবিত হতে পারে) পুরো catch-all
// route-pattern রিভ্যালিডেট করা হয়, যেটা সব গাইড পেজকেই কভার করে।

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { timingSafeEqual } from 'crypto';
import { logWarn } from '@/lib/logger';
import { RESERVED_URL_PREFIXES } from '@/types/guides';

// 🛡️ ফিক্স (audit P2-B11): === দিয়ে secret তুলনা করলে তাত্ত্বিকভাবে টাইমিং দিয়ে
// অনুমান করার সুযোগ থাকে (early-exit string compare)। constant-time compare
// ব্যবহার করা হচ্ছে; দৈর্ঘ্য না মিললেও নিরাপদে false রিটার্ন করে (crypto নিজে
// দৈর্ঘ্য-ভিন্ন হলে exception ছোঁড়ে, তাই আগে length চেক)।
function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret');

  if (!process.env.GUIDE_REVALIDATE_SECRET_KEY) {
    // env সেট করা না থাকলে নিরাপদ দিকে থেকে সবসময় প্রত্যাখ্যান — ভুলবশত খোলা এন্ডপয়েন্ট
    // রাখার চেয়ে সাময়িকভাবে রিভ্যালিডেশন কাজ না করা ভালো
    logWarn('[revalidate-guide] GUIDE_REVALIDATE_SECRET_KEY সেট করা নেই — রিকোয়েস্ট প্রত্যাখ্যাত');
    return NextResponse.json({ ok: false, message: 'not configured' }, { status: 503 });
  }

  if (!secret || !secretsMatch(secret, process.env.GUIDE_REVALIDATE_SECRET_KEY)) {
    return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  let path: string | undefined;
  try {
    const body = (await req.json()) as { path?: string };
    path = body.path;
  } catch {
    path = undefined;
  }

  const firstSegment = path?.replace(/^\//, '').split('/')[0];
  const looksSafe = Boolean(path) && path!.startsWith('/') && !(firstSegment && RESERVED_URL_PREFIXES.includes(firstSegment));

  if (looksSafe) {
    revalidatePath(path!);
  } else {
    // নির্দিষ্ট/নিরাপদ path না থাকলে (delete, বা url_prefix বদলে অনেক পেজ প্রভাবিত
    // হলে) — পুরো root-level catch-all route-pattern রিভ্যালিডেট করা, যা সব
    // গাইড পেজকেই কভার করে (এটা 'guides'-এর মতো কোনো literal path না, নিজেই একটা
    // dynamic route-pattern স্ট্রিং)
    revalidatePath('/[...segments]', 'page');
  }

  return NextResponse.json({ ok: true, revalidated: looksSafe ? path : 'all' });
}
