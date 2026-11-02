'use server';

import { createServiceClient } from '@/lib/supabase/serviceClient';
import { logWarn } from '@/lib/logger';
import type { RateLimitResult } from '@/lib/rateLimit';

/**
 * পাসওয়ার্ড-রিসেট রেট-লিমিট চেক — service-role ক্লায়েন্ট দিয়ে সার্ভার-সাইডে চলে।
 * (আগে ক্লায়েন্ট থেকে সরাসরি anon key দিয়ে `check_password_reset_limit` RPC কল হতো,
 * যেটা যে কারো ইমেইলের রিসেট-কোটা পুড়িয়ে দেওয়ার সুযোগ তৈরি করত — এখন DB ফাংশনে
 * anon/authenticated EXECUTE revoke করা, শুধু service_role কল করতে পারে।)
 */
export async function checkPasswordResetLimitAction(email: string): Promise<RateLimitResult> {
  const em = String(email || '').trim();
  if (!em) return { allowed: false, remaining: 0 };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc('check_password_reset_limit', { p_email: em });
    if (error || !data) {
      if (error) logWarn('[Vangcur] check_password_reset_limit RPC error:', error.message);
      return { allowed: false, remaining: 0 };
    }
    return {
      allowed: !!(data as { allowed?: boolean }).allowed,
      remaining: Number((data as { remaining?: number }).remaining) || 0,
    };
  } catch (e) {
    logWarn('[Vangcur] check_password_reset_limit exception:', e);
    return { allowed: false, remaining: 0 };
  }
}
