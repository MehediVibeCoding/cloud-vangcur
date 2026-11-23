import { NextRequest, NextResponse } from 'next/server';
import { isValidWebhookRequest } from '@/lib/webhookAuth';
import { productUrl, submitToIndexNow } from '@/lib/indexnow';
import { slidingWindowLimit } from '@/lib/limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Supabase Database Webhook (custom_products: INSERT + UPDATE) এখান থেকে কল করবে।
 * Header: x-webhook-secret = WEBHOOK_SECRET
 * URL প্যাটার্ন সাইটের আসল রাউটের মতোই: /product/<slug>-<id>
 */
export async function POST(req: NextRequest) {
  if (!isValidWebhookRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { record?: { id?: number | string; name?: string } } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }

  const rec = body?.record;
  if (!rec?.id || !rec?.name) {
    return NextResponse.json({ ok: false, reason: 'record id/name নেই' }, { status: 400 });
  }

  // একই পণ্য ঘন ঘন এডিট হলে (দাম/বিবরণ বারবার সেভ) প্রতিবার সাবমিট করলে IndexNow 429 দেয়। তাই প্রতি পণ্যে ঘন্টায় একবার।
  // স্কিপ হলেও ২০০ ফেরত — না হলে Supabase webhook (pg_net) এটাকে ব্যর্থ ধরে বারবার চেষ্টা করতে পারে।
  const gate = await slidingWindowLimit(`indexnow:${rec.id}`, 1, 3600);
  if (!gate.allowed) {
    return NextResponse.json({ ok: true, skipped: 'cooldown', retryAfterSec: gate.retryAfterSec });
  }

  const result = await submitToIndexNow([productUrl({ id: rec.id, name: rec.name })]);
  return NextResponse.json(result);
}
