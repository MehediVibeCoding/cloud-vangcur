import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchFullOrder } from '@/lib/orderStatus';
import { mapSupabaseOrderRow } from '@/lib/orderMapping';
import { DEFAULT_FOOTER } from '@/lib/footerData';
import { logError } from '@/lib/logger';
import { slidingWindowLimit, getClientIp } from '@/lib/limiter';
import { createServiceClient } from '@/lib/supabase/serviceClient';
import { MAX_INVOICE_DOWNLOADS } from '@/lib/invoice/invoiceLimit';

// 🖨️ ইনভয়েস PNG এখন Vercel-এ বানানো হয় (headless Chromium, `/api/invoice/render`) — Cloudflare Free plan-এর ১০ms CPU
// সীমায় satori/resvg-wasm রেন্ডার (~২ সেকেন্ড CPU) টেকে না। এই রুট শুধু অর্ডার যাচাই, রেট-লিমিট, ডাউনলোড-সীমা
// (claim/release) সামলায়, তারপর যাচাই-করা অর্ডারের ডেটা গোপন চাবিসহ Vercel-এ পাঠিয়ে PNG ফেরত নেয়।
// প্রয়োজনীয় Secret (Cloudflare → Workers → cloud-vangcur → Settings → Variables and Secrets):
//   INVOICE_RENDER_URL    = Vercel ডিপ্লয়মেন্টের ঠিকানা (যেমন https://xxxx.vercel.app, শেষে / ছাড়া)
//   INVOICE_RENDER_SECRET = Vercel-এর INVOICE_RENDER_SECRET-এর সাথে হুবহু একই গোপন চাবি
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req.headers);
  const isStatusCheck = req.nextUrl.searchParams.get('status') === '1';

  const rl = isStatusCheck
    ? await slidingWindowLimit(`invoice-status:${clientIp}`, 30, 60)
    : await slidingWindowLimit(`invoice:${clientIp}`, 8, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const orderId = req.nextUrl.searchParams.get('id') || req.nextUrl.searchParams.get('orderId');
  const phone = req.nextUrl.searchParams.get('phone') || undefined;

  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'Missing order id' }, { status: 400 });
  }

  let claimed = false;
  let claimedOrderId = '';
  let service: ReturnType<typeof createServiceClient> | null = null;

  try {
    const supabase = await createClient();
    const row = await fetchFullOrder(supabase, String(orderId), phone);

    if (!row) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    }

    const verifiedId = String(row.id || '');
    if (!UUID_RE.test(verifiedId)) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    }

    try {
      service = createServiceClient();
    } catch (err) {
      logError('[InvoicePNG] service client unavailable:', err);
      return NextResponse.json({ ok: false, unavailable: true, error: 'Invoice service unavailable' }, { status: 503 });
    }

    if (isStatusCheck) {
      const { data, error } = await service.rpc('invoice_downloads_status', { p_order_id: verifiedId });
      if (error || typeof data !== 'number') {
        logError('[InvoicePNG] status check failed:', error);
        return NextResponse.json({ ok: false, unavailable: true }, { status: 503 });
      }
      return NextResponse.json(
        { ok: true, remaining: data, limit: MAX_INVOICE_DOWNLOADS },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { data: claim, error: claimError } = await service.rpc('claim_invoice_download', { p_order_id: verifiedId });
    const claimRow = Array.isArray(claim) ? claim[0] : claim;
    if (claimError || !claimRow) {
      logError('[InvoicePNG] claim failed:', claimError);
      return NextResponse.json({ ok: false, unavailable: true, error: 'Invoice service unavailable' }, { status: 503 });
    }
    if (!claimRow.allowed) {
      return NextResponse.json(
        { ok: false, limitReached: true, remaining: 0, error: 'Download limit reached' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    claimed = true;
    claimedOrderId = verifiedId;
    const remaining = Number(claimRow.remaining);

    const order = mapSupabaseOrderRow(row);
    const contact = {
      phoneLabel: DEFAULT_FOOTER.contact.phoneLabel,
      email: DEFAULT_FOOTER.contact.email,
    };

    const renderUrl = process.env.INVOICE_RENDER_URL;
    const renderSecret = process.env.INVOICE_RENDER_SECRET;
    if (!renderUrl || !renderSecret) {
      throw new Error('INVOICE_RENDER_URL / INVOICE_RENDER_SECRET সেট করা নেই');
    }

    // ঠান্ডা শুরুতে Vercel-এ Chromium চালু হতে কয়েক সেকেন্ড লাগে — অপেক্ষার সময় Worker-এর CPU গোনা হয় না
    const renderRes = await fetch(`${renderUrl.replace(/\/$/, '')}/api/invoice/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-invoice-secret': renderSecret },
      body: JSON.stringify({ order, contact }),
      signal: AbortSignal.timeout(45000),
    });
    if (!renderRes.ok) {
      const detail = await renderRes.text().catch(() => '');
      throw new Error(`invoice renderer HTTP ${renderRes.status}: ${detail.slice(0, 300)}`);
    }
    const pngBuffer = await renderRes.arrayBuffer();

    const fileName = `Vangcur_Invoice_${String(order.orderNum || orderId).replace('#', '')}.png`;

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
        'X-Invoice-Remaining': String(remaining),
        'Access-Control-Expose-Headers': 'X-Invoice-Remaining',
      },
    });
  } catch (err) {
    if (claimed && service) {
      try {
        await service.rpc('release_invoice_download', { p_order_id: claimedOrderId });
      } catch (releaseErr) {
        logError('[InvoicePNG] release failed:', releaseErr);
      }
    }
    logError('[InvoicePNG] generation failed:', err);
    return NextResponse.json({ ok: false, error: 'Failed to generate invoice image' }, { status: 500 });
  }
}
