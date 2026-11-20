import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchFullOrder } from '@/lib/orderStatus';
import { mapSupabaseOrderRow } from '@/lib/orderMapping';
import { DEFAULT_FOOTER } from '@/lib/footerData';
import { buildInvoiceViewModel } from '@/lib/invoice/invoiceViewModel';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { logError } from '@/lib/logger';
import { slidingWindowLimit, getClientIp } from '@/lib/limiter';
import { createServiceClient } from '@/lib/supabase/serviceClient';
import { MAX_INVOICE_DOWNLOADS } from '@/lib/invoice/invoiceLimit';

// 🖨️ ইনভয়েস PNG এখন আলাদা Worker-এ (`vangcur-invoice`, কোড: workers/invoice/) বানানো হয় — satori + resvg-wasm
// ভারী, আর মূল Worker-এর বান্ডল হালকা রাখতে ওটা এখানে নেই। এই রুট শুধু অর্ডার যাচাই, রেট-লিমিট, ডাউনলোড-সীমা
// (claim/release) সামলায় এবং ছবি বানানোর ধাপে Service Binding (`INVOICE_RENDERER`) দিয়ে ওই Worker-কে ডাকে।
// ওই Worker-এর কোনো পাবলিক URL নেই; শুধু এই বাইন্ডিং দিয়েই পৌঁছানো যায়।
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
    const { ds, advancePaid, balanceDue, isFreeShipping, dueMsg } = buildInvoiceViewModel(order);

    const contact = {
      phoneLabel: DEFAULT_FOOTER.contact.phoneLabel,
      email: DEFAULT_FOOTER.contact.email,
    };

    const assetBaseUrl = req.nextUrl.origin;

    // ছবির URL এখানেই অপটিমাইজ করে পাঠাই (env/ডোমেইন-নির্ভর লজিক মূল সাইটেই থাকে)
    const itemImageUrls = (order.items || []).map((item) => {
      const url = item.imgs && item.imgs[0];
      if (typeof url !== 'string' || !url.startsWith('http')) return null;
      return optimizeCloudinaryUrl(url, 120);
    });

    const { env } = await getCloudflareContext({ async: true });
    const renderer = (env as unknown as { INVOICE_RENDERER?: { fetch: (input: string, init?: RequestInit) => Promise<Response> } })
      .INVOICE_RENDERER;
    if (!renderer) {
      throw new Error('INVOICE_RENDERER service binding পাওয়া যায়নি (wrangler.jsonc দেখুন)');
    }

    const renderRes = await renderer.fetch('https://invoice-renderer.internal/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order,
        ds,
        contact,
        dueMsg,
        advancePaid,
        balanceDue,
        isFreeShipping,
        assetBaseUrl,
        itemImageUrls,
      }),
    });
    if (!renderRes.ok) {
      const detail = await renderRes.text().catch(() => '');
      throw new Error(`invoice worker HTTP ${renderRes.status}: ${detail.slice(0, 300)}`);
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
