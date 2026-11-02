import { NextRequest, NextResponse } from 'next/server';
import { isValidWebhookRequest } from '@/lib/webhookAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITE = 'https://vangcur.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const bdt = (n: unknown): string => `৳${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

interface OrderItem {
  name?: string;
  qty?: number;
  price?: number;
}
interface OrderRecord {
  id?: string;
  order_num?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_district?: string;
  customer_address?: string;
  items?: OrderItem[];
  subtotal?: number;
  shipping_cost?: number;
  discount_amount?: number;
  advance_paid?: number;
  total?: number;
}

function buildHtml(o: OrderRecord): string {
  const items = Array.isArray(o.items) ? o.items : [];
  const total = Number(o.total) || 0;
  const advance = Number(o.advance_paid) || 0;
  const due = Math.max(0, total - advance);
  const discount = Number(o.discount_amount) || 0;

  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eef0f3;font-size:14px;color:#1a1a1a">${esc(i.name)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eef0f3;font-size:14px;color:#1a1a1a;text-align:center">${esc(i.qty)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eef0f3;font-size:14px;color:#1a1a1a;text-align:right">${bdt((Number(i.price) || 0) * (Number(i.qty) || 1))}</td>
      </tr>`,
    )
    .join('');

  const line = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:3px 0;font-size:${strong ? 16 : 14}px;color:${strong ? '#1a1a1a' : '#6b7280'};${strong ? 'font-weight:800;' : ''}">${label}</td><td style="padding:3px 0;font-size:${strong ? 16 : 14}px;color:#1a1a1a;text-align:right;${strong ? 'font-weight:800;' : 'font-weight:600;'}">${value}</td></tr>`;

  const address = [o.customer_address, o.customer_district].filter(Boolean).map(esc).join(', ');

  return `<!doctype html>
<html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f6fb;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;padding:24px 14px">
    <div style="background:#44a7fc;border-radius:18px 18px 0 0;padding:22px 24px;color:#fff">
      <div style="font-size:13px;font-weight:700;letter-spacing:.6px;opacity:.9">VANGCUR · ভাঙচুর</div>
      <div style="font-size:22px;font-weight:800;margin-top:4px">আপনার অর্ডার পেয়েছি ✔</div>
    </div>
    <div style="background:#fff;border-radius:0 0 18px 18px;padding:24px;box-shadow:0 2px 10px rgba(0,0,0,.05)">
      <p style="margin:0 0 4px;font-size:15px;color:#1a1a1a">প্রিয় ${esc(o.customer_name) || 'গ্রাহক'},</p>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#4b5563">আমাদের থেকে কেনাকাটার জন্য ধন্যবাদ। আপনার অর্ডারটি আমরা পেয়েছি এবং শিগগিরই প্রসেস করব।</p>

      <div style="background:#eaf5ff;border-radius:12px;padding:12px 14px;margin-bottom:18px">
        <div style="font-size:12px;color:#0f6fc6;font-weight:700">অর্ডার নম্বর</div>
        <div style="font-size:18px;color:#1a1a1a;font-weight:800">${esc(o.order_num || String(o.id || '').slice(0, 8))}</div>
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
        <tr style="background:#f9fafb">
          <th style="padding:9px 8px;font-size:12px;color:#6b7280;text-align:left">পণ্য</th>
          <th style="padding:9px 8px;font-size:12px;color:#6b7280;text-align:center">পরিমাণ</th>
          <th style="padding:9px 8px;font-size:12px;color:#6b7280;text-align:right">মূল্য</th>
        </tr>
        ${rows}
      </table>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;border-collapse:collapse">
        ${line('সাবটোটাল', bdt(o.subtotal))}
        ${line('ডেলিভারি চার্জ', bdt(o.shipping_cost))}
        ${discount > 0 ? line('ডিসকাউন্ট', `-${bdt(discount)}`) : ''}
        ${line('সর্বমোট', bdt(total), true)}
        ${advance > 0 ? line('অগ্রিম পরিশোধ', bdt(advance)) : ''}
        ${advance > 0 ? line('ডেলিভারির সময় বাকি', bdt(due), true) : ''}
      </table>

      <div style="margin-top:20px;border-top:1px solid #eef0f3;padding-top:16px">
        <div style="font-size:12px;color:#6b7280;font-weight:700;margin-bottom:4px">ডেলিভারি ঠিকানা</div>
        <div style="font-size:14px;line-height:1.6;color:#1a1a1a">${address || '—'}<br>ফোন: ${esc(o.customer_phone)}</div>
      </div>

      <div style="margin-top:22px;text-align:center">
        <a href="${SITE}/track-order" style="display:inline-block;background:#44a7fc;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 26px;border-radius:999px">অর্ডার ট্র্যাক করুন</a>
      </div>
      <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6">কোনো প্রশ্ন থাকলে এই ইমেইলে সরাসরি রিপ্লাই করুন।<br>Vangcur · support@vangcur.com · vangcur.com</p>
    </div>
  </div>
</body></html>`;
}

function buildText(o: OrderRecord): string {
  const items = Array.isArray(o.items) ? o.items : [];
  const lines = items.map((i) => `- ${i.name || ''} x${i.qty || 1}  ${bdt((Number(i.price) || 0) * (Number(i.qty) || 1))}`);
  return [
    `প্রিয় ${o.customer_name || 'গ্রাহক'}, আপনার অর্ডার পেয়েছি।`,
    `অর্ডার নম্বর: ${o.order_num || ''}`,
    '',
    ...lines,
    '',
    `সর্বমোট: ${bdt(o.total)}`,
    `ঠিকানা: ${[o.customer_address, o.customer_district].filter(Boolean).join(', ')}`,
    `ট্র্যাক করুন: ${SITE}/track-order`,
  ].join('\n');
}

/** Supabase Database Webhook (orders: INSERT) এখান থেকে কল করবে। Header: x-webhook-secret */
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
        sender: { name: 'Vangcur Orders', email: process.env.BREVO_INVOICE_SENDER || 'invoice@vangcur.com' },
        to: [{ email: to, name: o.customer_name || undefined }],
        replyTo: { email: process.env.BREVO_SUPPORT_SENDER || 'support@vangcur.com', name: 'Vangcur Support' },
        subject: `অর্ডার কনফার্মেশন ${o.order_num || ''} | Vangcur`.trim(),
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
