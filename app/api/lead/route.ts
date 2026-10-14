import { NextRequest, NextResponse, after } from 'next/server';
import { normalizeBdPhone } from '@/lib/security';
import { validatePhone } from '@/lib/checkoutData';
import { slidingWindowLimit, getClientIp } from '@/lib/limiter';
import { forwardDraftToRecoveryHub, forwardStockRequestToRecoveryHub } from '@/lib/recoveryHub';

// 🛡️ ইনপুট স্যানিটাইজেশন — কঠোর সাইজ গার্ড (আগের ফর্মুলা-ইনজেকশন ফিল্টারের
// মতোই; আর গুগল শিটে যাচ্ছে না, কিন্তু DB-তে যাওয়া ইনপুটও ক্লিন রাখা ভালো)
function sanitizeValue(val: unknown, maxLen = 100): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().slice(0, maxLen).replace(/[\t\r\n]/g, ' ');
}

export async function POST(req: NextRequest) {
  try {
    // ১. আইপি এক্সট্র্যাক্ট ও রেট লিমিট — শেয়ার্ড (Upstash) স্লাইডিং-উইন্ডো: প্রতি ১০ মিনিটে সর্বোচ্চ ২০টি।
    const clientIp = getClientIp(req.headers);
    const rl = await slidingWindowLimit(`lead:${clientIp}`, 20, 600);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
    }

    const action = String(payload.action || 'addLead').trim();

    // =========================================================================
    // কেস ১: স্টক নোটিফিকেশন রিকোয়েস্ট (addStockRequest) → Recovery Hub
    // =========================================================================
    if (action === 'addStockRequest') {
      const phoneStr = normalizeBdPhone(String(payload.mobileNumber || payload.phone || '').trim());
      if (!validatePhone(phoneStr)) {
        return NextResponse.json({ ok: false, error: 'Invalid phone format' }, { status: 400 });
      }

      const productId = sanitizeValue(payload.productId, 30);
      const productName = sanitizeValue(payload.productName, 80);
      const customerName = sanitizeValue(payload.customerName, 30);

      // 🚀 Next.js 15 Native Background Task (after)
      // ক্লায়েন্টকে সাথে সাথে রেসপন্স দিয়ে ব্যাকগ্রাউন্ডে Recovery Hub-এ পুশ হবে
      after(async () => {
        await forwardStockRequestToRecoveryHub({
          productId,
          productName: productName || undefined,
          customerName: customerName || undefined,
          phone: phoneStr,
        });
      });

      return NextResponse.json({ ok: true });
    }

    // =========================================================================
    // কেস ২: চেকআউট ড্রাফট লিড ক্যাপচার (addLead) → Recovery Hub
    // =========================================================================
    const phoneStr = normalizeBdPhone(String(payload.phone || '').trim());
    if (!validatePhone(phoneStr)) {
      return NextResponse.json({ ok: false, error: 'Invalid phone format' }, { status: 400 });
    }

    const leadId = sanitizeValue(payload.leadId, 35);
    const name = sanitizeValue(payload.name, 30); // নাম কঠোরভাবে সর্বোচ্চ ৩০ অক্ষরে লক
    const dist = sanitizeValue(payload.dist, 30);
    const addr = sanitizeValue(payload.addr, 200);
    const email = sanitizeValue(payload.email, 100);
    const items = sanitizeValue(payload.items, 300);
    const total = Number(payload.total) || 0;

    after(async () => {
      await forwardDraftToRecoveryHub({
        sessionId: leadId || `LD-${Date.now()}`,
        name: name || undefined,
        phone: phoneStr,
        email: email || undefined,
        district: dist || undefined,
        address: addr || undefined,
        itemsSummary: items || undefined,
        cartTotal: total,
      });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
