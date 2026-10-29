import { NextRequest, NextResponse } from 'next/server';
import { logWarn } from '@/lib/logger';
import { slidingWindowLimit, getClientIp } from '@/lib/limiter';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);

    // শেয়ার্ড স্লাইডিং-উইন্ডো: প্রতি ১০ সেকেন্ডে সর্বোচ্চ ৩০টি যাচাই — বাংলাদেশের মোবাইল অপারেটরে
    // অনেক ব্যবহারকারী একই আইপি শেয়ার করে, তাই আগের ১০ সীমা সাধারণ ব্যবহারকারীকেও আটকাতে পারত
    // (middleware-এর সার্বিক API সীমাও ৩০, তাই এর বেশি রাখা অর্থহীন)
    const rl = await slidingWindowLimit(`turnstile:${clientIp}`, 30, 10);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await req.json().catch(() => null);
    const token = body?.token;

    if (!token || typeof token !== 'string' || token.length > 2048) {
      return NextResponse.json({ success: false, error: 'invalid_token' }, { status: 400 });
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      logWarn('[Turnstile] TURNSTILE_SECRET_KEY সেট করা নেই — verify skip করা হচ্ছে');
      return NextResponse.json({ success: false, error: 'not_configured' }, { status: 500 });
    }

    const form = new URLSearchParams();
    form.append('secret', secret);
    form.append('response', token);
    // remoteip ইচ্ছাকৃতভাবে পাঠানো হয় না: এটা ঐচ্ছিক, আর মোবাইল নেটে চ্যালেঞ্জের সময়ের আইপি (যেমন IPv6)
    // আর আমাদের সার্ভারে দেখা আইপি (IPv4) ভিন্ন হতে পারে — অকারণে বৈধ ব্যবহারকারীর যাচাই ব্যর্থ হতো।

    const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(5000),
    });

    if (!cfRes.ok) {
      logWarn('[Turnstile] Cloudflare API responded with status:', cfRes.status);
      return NextResponse.json({ success: false }, { status: 502 });
    }

    const data = await cfRes.json();
    if (!data.success) {
      // কেন ব্যর্থ — Cloudflare Workers Logs-এ দেখার জন্য (যেমন timeout-or-duplicate, invalid-input-response)
      logWarn('[Turnstile] যাচাই প্রত্যাখ্যাত:', JSON.stringify(data['error-codes'] || []), data.hostname || '');
    }
    return NextResponse.json({ success: !!data.success });
  } catch (e) {
    logWarn('[Turnstile] verify route error:', e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
