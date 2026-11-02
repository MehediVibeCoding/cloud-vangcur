import 'server-only';
import { timingSafeEqual } from 'node:crypto';

// Supabase Database Webhook থেকে আসা রিকোয়েস্টের `x-webhook-secret` হেডার যাচাই।
// সিক্রেট শুধু এনভায়রনমেন্ট ভেরিয়েবল (WEBHOOK_SECRET) থেকে — কোডে কিছু রাখা হয়নি (রিপো পাবলিক)।
export function isValidWebhookRequest(req: Request): boolean {
  const expected = process.env.WEBHOOK_SECRET;
  const provided = req.headers.get('x-webhook-secret');
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
