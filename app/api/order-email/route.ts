import { NextRequest, NextResponse } from 'next/server';
import { isValidWebhookRequest } from '@/lib/webhookAuth';
import { buildHtml, buildText, buildSubject, type OrderRecord } from '@/lib/orderEmailTemplate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ইমেইলের ডিজাইন/লেখা/সাবজেক্ট এখানে নয় — lib/orderEmailTemplate.ts-এ।
// এই ফাইল শুধু পাঠানোর কাজ করে (যাচাই → Brevo কল)।

/**
 * Supabase ট্রিগার (orders: status 'confirmed' হলে, অথবা সরাসরি confirmed অবস্থায় INSERT হলে) এখান থেকে কল করবে।
 * Header: x-webhook-secret
 */
export async function POST(req: NextRequest) {
  if (!isValidWebhookRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let o: OrderRecord | undefined;
  try {
    o = (await req.json())?.record;
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
  if (!o) return NextResponse.json({ ok: false, error: 'record নেই' }, { status: 400 });

  // ইমেইল ঐচ্ছিক ফিল্ড — না থাকলে বাদ (ব্যর্থতা নয়)
  const to = String(o.customer_email || '').trim();
  if (!to || !EMAIL_RE.test(to)) return NextResponse.json({ ok: true, skipped: 'no valid email' });

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, error: 'BREVO_API_KEY সেট করা নেই' }, { status: 500 });
  // Brevo-র REST API-তে SMTP কী (xsmtpsib-...) চলে না; API কী (xkeysib-...) লাগে
  if (apiKey.startsWith('xsmtpsib-')) {
    console.error('BREVO_API_KEY হলো SMTP কী। Brevo → SMTP & API → API Keys থেকে নতুন API কী (xkeysib-...) বানান।');
    return NextResponse.json({ ok: false, error: 'BREVO_API_KEY SMTP কী — API কী লাগবে' }, { status: 500 });
  }

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Vangcur - ভাঙচুর', email: process.env.BREVO_INVOICE_SENDER || 'invoice@vangcur.com' },
        to: [{ email: to, name: o.customer_name || undefined }],
        replyTo: { email: process.env.BREVO_SUPPORT_SENDER || 'support@vangcur.com', name: 'Vangcur Support' },
        subject: buildSubject(o),
        htmlContent: buildHtml(o),
        textContent: buildText(o),
        tags: ['order-confirmation'],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      console.error('Brevo error', r.status, (await r.text().catch(() => '')).slice(0, 400));
      return NextResponse.json({ ok: false, status: r.status }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Brevo fetch failed', e);
    return NextResponse.json({ ok: false, error: 'Brevo কল ব্যর্থ' }, { status: 502 });
  }
}
