import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchFullOrder } from '@/lib/orderStatus';
import { mapSupabaseOrderRow } from '@/lib/orderMapping';
import { DEFAULT_FOOTER } from '@/lib/footerData';
import { buildInvoiceViewModel } from '@/lib/invoice/invoiceViewModel';
import { renderInvoiceSvg } from '@/lib/invoice/renderInvoiceSvg';
import { ensureResvgWasm } from '@/lib/invoice/satoriAssets';
import { logError } from '@/lib/logger';
import { slidingWindowLimit, getClientIp } from '@/lib/limiter';

// 🖨️ এই রুট আগে headless Chromium (Puppeteer) চালাত — Cloudflare Workers-এ
// সেটা চালানো সম্ভব না বলে satori (JSX → SVG) + @resvg/resvg-wasm
// (SVG → PNG, pure WASM, কোনো native binary না) দিয়ে rewrite করা হয়েছে।
// রেট-লিমিট আগের মতোই রাখা হয়েছে, যদিও এই নতুন পাইপলাইন আগের চেয়ে
// অনেক হালকা।
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req.headers);

  const rl = await slidingWindowLimit(`invoice:${clientIp}`, 8, 60);
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

  try {
    const supabase = await createClient();
    const row = await fetchFullOrder(supabase, String(orderId), phone);

    if (!row) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    }

    const order = mapSupabaseOrderRow(row);
    const { ds, advancePaid, balanceDue, isFreeShipping, dueMsg } = buildInvoiceViewModel(order);

    const contact = {
      phoneLabel: DEFAULT_FOOTER.contact.phoneLabel,
      email: DEFAULT_FOOTER.contact.email,
    };

    const assetBaseUrl = req.nextUrl.origin;

    const { svg, fontBuffers } = await renderInvoiceSvg({
      order,
      ds,
      contact,
      dueMsg,
      advancePaid,
      balanceDue,
      isFreeShipping,
      assetBaseUrl,
    });

    await ensureResvgWasm(assetBaseUrl);
    const { Resvg } = await import('@resvg/resvg-wasm');

    // scale 3x — আগের Puppeteer পাইপলাইনেও deviceScaleFactor: 3 ব্যবহার
    // হতো, যাতে html2canvas যুগের মতোই sharp/retina কোয়ালিটি বজায় থাকে।
    const resvg = new Resvg(svg, {
      font: { fontBuffers, loadSystemFonts: false },
      background: '#FFFFFF',
      fitTo: { mode: 'zoom', value: 3 },
    });

    // satori একটা বড়, ফিক্সড-হাইট ক্যানভাসে (renderInvoiceSvg.ts দেখুন)
    // রেন্ডার করে — আসল কন্টেন্ট তার চেয়ে ছোট, তাই নিচের ফাঁকা অংশ বাদ
    // দিতে bounding-box অনুযায়ী crop করা হচ্ছে (আগের Puppeteer পাইপলাইনে
    // যেভাবে শুধু কার্ড এলিমেন্টের screenshot নেওয়া হতো, সমমানের ফলাফল)।
    const bbox = resvg.innerBBox();
    if (bbox) {
      resvg.cropByBBox(bbox);
    }

    const rendered = resvg.render();
    const pngBuffer = rendered.asPng();

    const fileName = `Vangcur_Invoice_${String(order.orderNum || orderId).replace('#', '')}.png`;

    return new NextResponse(pngBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    logError('[InvoicePNG] generation failed:', err);
    return NextResponse.json({ ok: false, error: 'Failed to generate invoice image' }, { status: 500 });
  }
}
