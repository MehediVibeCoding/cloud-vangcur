import 'server-only';
import { createHash } from 'node:crypto';

// 📡 Meta Conversions API (সার্ভার-সাইড) হেল্পার।
// টোকেন শুধু META_CAPI_ACCESS_TOKEN এনভায়রনমেন্ট ভেরিয়েবল থেকে আসে।

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0';

export const sha256 = (v: string): string =>
  createHash('sha256').update(v.trim().toLowerCase()).digest('hex');

// বাংলাদেশি নম্বর → 8801XXXXXXXXX (Meta-র ফরম্যাট), তারপর হ্যাশ হবে
export function normalizeBdPhone(p: string): string {
  const d = p.replace(/\D/g, '');
  if (d.startsWith('880')) return d;
  if (d.startsWith('0')) return '88' + d;
  return d;
}

export interface CapiUserInput {
  ip?: string;
  userAgent?: string;
  email?: string | null;
  phone?: string | null;
  fbp?: string;
  fbc?: string;
  externalId?: string | null;
}

export function buildUserData(u: CapiUserInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    client_user_agent: u.userAgent || undefined,
    client_ip_address: u.ip || undefined,
    fbp: u.fbp || undefined,
    fbc: u.fbc || undefined,
    country: [sha256('bd')],
  };
  if (u.email) data.em = [sha256(u.email)];
  if (u.phone) data.ph = [sha256(normalizeBdPhone(u.phone))];
  if (u.externalId) data.external_id = [sha256(u.externalId)];
  return data;
}

export interface CapiEvent {
  event_name: 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase';
  event_id: string;
  event_time?: number;
  event_source_url?: string;
  user_data: Record<string, unknown>;
  custom_data?: Record<string, unknown>;
}

export async function sendCapiEvent(ev: CapiEvent): Promise<{ ok: boolean; status?: number; reason?: string }> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !token) return { ok: false, reason: 'Meta Pixel ID বা CAPI টোকেন সেট করা নেই' };

  const payload = {
    // টোকেন বডিতে পাঠানো হয় — URL-এ রাখলে সার্ভার লগে ফাঁস হতে পারে
    access_token: token,
    data: [
      {
        event_name: ev.event_name,
        event_time: ev.event_time || Math.floor(Date.now() / 1000),
        event_id: ev.event_id,
        action_source: 'website',
        event_source_url: ev.event_source_url,
        user_data: ev.user_data,
        custom_data: ev.custom_data,
      },
    ],
    // টেস্টিংয়ের সময় Events Manager → Test Events-এর কোড এখানে দিন (ঐচ্ছিক)
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  };

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Meta CAPI error', res.status, text.slice(0, 400));
      return { ok: false, status: res.status, reason: 'Meta CAPI ত্রুটি' };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    console.error('Meta CAPI fetch failed', e);
    return { ok: false, reason: e instanceof Error ? e.message : 'নেটওয়ার্ক ত্রুটি' };
  }
}
