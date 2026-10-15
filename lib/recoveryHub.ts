import crypto from 'crypto';
import { logWarn } from '@/lib/logger';

/**
 * Recovery Hub-এ checkout draft আর stock-notification request ফরওয়ার্ড
 * করে — এটাই এখন একমাত্র পথ (আগের Google Apps Script/Sheets পাইপলাইন
 * সম্পূর্ণ সরিয়ে ফেলা হয়েছে)।
 *
 * তিনটা env var না থাকলে (Hub এখনো কনফিগার করা হয়নি) চুপচাপ কিছুই করে
 * না — সম্পূর্ণ best-effort, fire-and-forget (caller-এর `after()`-এর
 * ভেতর থেকে ডাকা হয়, রেসপন্স ব্লক করে না)।
 */

function hourOfDayDhaka(): number {
  const now = new Date();
  const dhaka = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  return dhaka.getHours();
}

function signRequest(secret: string, timestamp: string, rawBody: string): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

function hubConfig(): { baseUrl: string; apiKey: string; secret: string } | null {
  const baseUrl = process.env.RECOVERY_HUB_BASE_URL;
  const apiKey = process.env.RECOVERY_HUB_INGEST_KEY;
  const secret = process.env.RECOVERY_HUB_HMAC_SECRET;
  if (!baseUrl || !apiKey || !secret) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey, secret };
}

// কনফিগ না থাকার সতর্কতা প্রতি সার্ভার-ইনস্ট্যান্সে একবার — লগ ভরে না, কিন্তু "চুপচাপ কিছু হচ্ছে না" অবস্থাও থাকে না
let warnedUnconfigured = false;

async function postToHub(path: string, body: string, logLabel: string): Promise<void> {
  const cfg = hubConfig();
  if (!cfg) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      logWarn(
        `[RecoveryHub] ${logLabel} পাঠানো হয়নি — RECOVERY_HUB_BASE_URL / RECOVERY_HUB_INGEST_KEY / RECOVERY_HUB_HMAC_SECRET-এর কোনো একটা সেট করা নেই।`,
      );
    }
    return;
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signRequest(cfg.secret, timestamp, body);

  try {
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.apiKey,
        'x-timestamp': timestamp,
        'x-signature': signature,
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    // আগে রেসপন্সের স্ট্যাটাস দেখাই হতো না — হাব 401/422 ফেরত দিলেও কোথাও কিছু লেখা হতো না।
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logWarn(`[RecoveryHub] ${logLabel} হাব প্রত্যাখ্যান করেছে: HTTP ${res.status} ${text.slice(0, 200)}`);
    }
  } catch (err) {
    logWarn(`[RecoveryHub] ${logLabel} forward error:`, err);
  }
}

interface DraftForwardInput {
  sessionId: string;
  name?: string;
  phone: string; // already normalised 01XXXXXXXXX by the caller
  email?: string;
  district?: string;
  address?: string;
  itemsSummary?: string; // e.g. "Product A x1, Product B x2"
  cartTotal?: number;
}

export async function forwardDraftToRecoveryHub(input: DraftForwardInput): Promise<void> {
  const body = JSON.stringify({
    session_id: input.sessionId,
    customer_name: input.name || undefined,
    phone: input.phone,
    email: input.email || undefined,
    address: input.address || undefined,
    district: input.district || undefined,
    notes: input.itemsSummary || undefined,
    cart_total: typeof input.cartTotal === 'number' ? input.cartTotal : undefined,
    currency: 'BDT',
    hour_of_day: hourOfDayDhaka(),
  });
  await postToHub('/api/ingest/draft', body, 'draft');
}

interface StockRequestForwardInput {
  productId: string;
  productName?: string;
  customerName?: string;
  phone: string; // already normalised 01XXXXXXXXX by the caller
}

export async function forwardStockRequestToRecoveryHub(input: StockRequestForwardInput): Promise<void> {
  const body = JSON.stringify({
    product_id: input.productId,
    product_name: input.productName || undefined,
    customer_name: input.customerName || undefined,
    phone: input.phone,
  });
  await postToHub('/api/ingest/stock', body, 'stock-request');
}
