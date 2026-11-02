import { NextRequest, NextResponse } from 'next/server';
import { isValidWebhookRequest } from '@/lib/webhookAuth';
import { productUrl, submitToIndexNow } from '@/lib/indexnow';

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

  const result = await submitToIndexNow([productUrl({ id: rec.id, name: rec.name })]);
  return NextResponse.json(result);
}
