import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/serviceClient';
import { buildUserData, sendCapiEvent, type CapiEvent } from '@/lib/metaCapi';
import { getClientIp } from '@/lib/limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ব্রাউজার থেকে শুধু এই ৪টা ইভেন্ট গ্রহণযোগ্য
const ALLOWED = new Set(['ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase']);
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|headless|lighthouse|pagespeed/i;
const MAX_BODY = 8 * 1024;

// শুধু নিজের সাইট (প্রোডাকশন, লোকাল) থেকে আসা কল গ্রহণ
function originAllowed(req: NextRequest): boolean {
  const src = req.headers.get('origin') || req.headers.get('referer');
  if (!src) return false;
  try {
    const host = new URL(src).hostname;
    return host === 'vangcur.com' || host === 'www.vangcur.com' || host === 'localhost';
  } catch {
    return false;
  }
}

const str = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v ? v.slice(0, max) : undefined;
const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1e9 ? v : undefined;

// ক্লায়েন্টের পাঠানো custom_data থেকে শুধু নিরাপদ ফিল্ডগুলো রাখা হয়
function cleanCustomData(raw: unknown): Record<string, unknown> {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { currency: 'BDT' };
  const value = num(d.value);
  if (value !== undefined) out.value = value;
  const name = str(d.content_name, 200);
  if (name) out.content_name = name;
  out.content_type = 'product';
  const nItems = num(d.num_items);
  if (nItems !== undefined) out.num_items = Math.floor(nItems);
  if (Array.isArray(d.content_ids)) {
    out.content_ids = d.content_ids.slice(0, 50).map((x) => String(x).slice(0, 64));
  }
  if (Array.isArray(d.contents)) {
    out.contents = d.contents.slice(0, 50).flatMap((c) => {
      const o = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
      const id = str(String(o.id ?? ''), 64);
      const quantity = num(o.quantity);
      const item_price = num(o.item_price);
      return id && quantity !== undefined ? [{ id, quantity: Math.floor(quantity), item_price }] : [];
    });
  }
  return out;
}

export async function POST(req: NextRequest) {
  // Pixel/টোকেন সেট না থাকলে নীরবে বাদ — সাইট কখনো আটকাবে না
  if (!process.env.NEXT_PUBLIC_META_PIXEL_ID || !process.env.META_CAPI_ACCESS_TOKEN) {
    return NextResponse.json({ ok: false, skipped: 'not configured' });
  }
  if (!originAllowed(req)) return NextResponse.json({ ok: false }, { status: 403 });

  const ua = req.headers.get('user-agent') || '';
  if (BOT_UA.test(ua)) return NextResponse.json({ ok: true, skipped: 'bot' });

  let b: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return NextResponse.json({ ok: false }, { status: 413 });
    b = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventName = String(b.event_name || '');
  const eventId = str(b.event_id, 120);
  if (!ALLOWED.has(eventName) || !eventId) return NextResponse.json({ ok: false }, { status: 400 });

  // শেয়ার্ড getClientIp() (C5 ফিক্স) — cf-connecting-ip সহ
  const rawIp = getClientIp(req.headers);
  const ip = rawIp === '127.0.0.1' ? undefined : rawIp;

  const sourceUrl = str(b.event_source_url, 500);
  let customData = cleanCustomData(b.custom_data);
  let email: string | null = null;
  let phone: string | null = null;
  let externalId: string | null = null;
  let eventTime: number | undefined;

  // 🔒 Purchase: ক্লায়েন্টের পাঠানো মান বিশ্বাস করা হয় না — অর্ডার নম্বর দিয়ে DB থেকে আসল তথ্য নেওয়া হয়।
  // অর্ডার না থাকলে বা ২৪ ঘণ্টার পুরনো হলে ইভেন্ট বাতিল (ভুয়া Purchase ঠেকানো)।
  if (eventName === 'Purchase') {
    const orderNum = str(b.order_num, 60);
    if (!orderNum || eventId !== `purchase_${orderNum}`) return NextResponse.json({ ok: false }, { status: 400 });
    try {
      const supabase = createServiceClient();
      const { data: order } = await supabase
        .from('orders')
        .select('order_num, total, items, customer_email, customer_phone, user_id, created_at')
        .eq('order_num', orderNum)
        .maybeSingle();
      // 🔒 ফিক্স (S6): আগে এখানে 404 (অর্ডার নেই) ও 410 (বেশি পুরনো) আলাদা স্ট্যাটাস কোড
      // ফেরত যেত, "সাধারণ" সফল কেস 200 থেকে আলাদা — কেউ এলোমেলো order_num দিয়ে অনেকবার
      // কল করে স্ট্যাটাস কোড দেখে বুঝে ফেলতে পারত কোন নম্বরে আসলে অর্ডার আছে (existence
      // oracle), ফলে দৈনিক অর্ডার সংখ্যা আন্দাজ করা সম্ভব হতো। এখন দুটো ক্ষেত্রেই বাকি
      // সার্ভিসের মতোই সাধারণ 200 { ok: true } রিটার্ন হয়, শুধু আসল CAPI ইভেন্ট পাঠানো
      // স্কিপ হয় (নিচের return সরিয়ে স্বাভাবিক ফাংশন-প্রবাহে ফিরিয়ে দেওয়া হচ্ছে)।
      if (!order) return NextResponse.json({ ok: true });
      const ageMs = Date.now() - new Date(order.created_at as string).getTime();
      if (!Number.isFinite(ageMs) || ageMs > 24 * 60 * 60 * 1000) return NextResponse.json({ ok: true });

      const items = (Array.isArray(order.items) ? order.items : []) as Array<Record<string, unknown>>;
      customData = {
        currency: 'BDT',
        value: Number(order.total) || 0,
        content_type: 'product',
        content_ids: items.map((i) => String(i.id)),
        contents: items.map((i) => ({ id: String(i.id), quantity: Number(i.qty) || 1, item_price: Number(i.price) || 0 })),
        num_items: items.reduce((s, i) => s + (Number(i.qty) || 1), 0),
        order_id: orderNum,
      };
      email = (order.customer_email as string) || null;
      phone = (order.customer_phone as string) || null;
      externalId = (order.user_id as string) || null;
      eventTime = Math.floor(new Date(order.created_at as string).getTime() / 1000);
    } catch (e) {
      console.error('meta-capi purchase lookup failed', e);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  const event: CapiEvent = {
    event_name: eventName as CapiEvent['event_name'],
    event_id: eventId,
    event_time: eventTime,
    event_source_url: sourceUrl,
    user_data: buildUserData({
      ip,
      userAgent: ua,
      email,
      phone,
      externalId,
      fbp: str(b.fbp, 200),
      fbc: str(b.fbc, 300),
    }),
    custom_data: customData,
  };

  const result = await sendCapiEvent(event);
  return NextResponse.json({ ok: result.ok });
}
