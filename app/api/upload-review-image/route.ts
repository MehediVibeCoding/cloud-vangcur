// কাস্টমার রিভিউ ছবি আপলোড — আগে সরাসরি ব্রাউজার থেকে Cloudinary-তে যেত,
// এখন এই সার্ভার রুট হয়ে R2-এর 'reviews/' prefix-এ যায়।
//
// নিরাপত্তা: (১) লগইন করা ইউজার ছাড়া কেউ আপলোড করতে পারবে না, (২) IP + user id
// দুটো দিয়েই রেট-লিমিট, (৩) MIME + magic-byte যাচাই, (৪) ফাইল সাইজ ক্যাপ।

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { slidingWindowLimit, getClientIp } from '@/lib/limiter';
import { validateImageUpload } from '@/lib/uploadValidation';
import { uploadToR2 } from '@/lib/r2';
import { logWarn } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // ১. লগইন যাচাই — কুকি থেকে সেশন পড়ে, ক্লায়েন্টের পাঠানো userId বিশ্বাস করা হয় না
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: 'লগইন করা প্রয়োজন' }, { status: 401 });
    }

    // ২. রেট লিমিট — IP আর user id দুটো মিলিয়ে, প্রতি ১০ মিনিটে সর্বোচ্চ ১৫টা ছবি
    const clientIp = getClientIp(req.headers);
    const rl = await slidingWindowLimit(`review-img:${user.id}:${clientIp}`, 15, 600);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, message: 'অনেকবার চেষ্টা হয়েছে, কিছুক্ষণ পর আবার চেষ্টা করুন' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    // ৩. ফাইল বের করা
    const formData = await req.formData().catch(() => null);
    const file = formData?.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: 'কোনো ফাইল পাওয়া যায়নি' }, { status: 400 });
    }

    // ৪. MIME + magic-byte + সাইজ যাচাই
    const validated = await validateImageUpload(file);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, message: validated.message }, { status: 400 });
    }

    // ৫. R2-তে আপলোড, 'reviews' prefix দিয়ে
    const result = await uploadToR2(file, 'reviews', validated.ext!, user.id);
    if (!result.ok) {
      logWarn('[upload-review-image] R2 upload failed:', result.message);
      return NextResponse.json({ ok: false, message: 'ছবি আপলোড ব্যর্থ হয়েছে' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: result.url });
  } catch (e) {
    logWarn('[upload-review-image] unexpected error:', e);
    return NextResponse.json({ ok: false, message: 'সার্ভার এরর, আবার চেষ্টা করুন' }, { status: 500 });
  }
}
