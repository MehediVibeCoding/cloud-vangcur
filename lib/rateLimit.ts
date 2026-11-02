import type { SupabaseClient } from '@supabase/supabase-js';
import { logWarn } from './logger';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

async function checkRpcLimit(
  supabase: SupabaseClient,
  fn: string,
  params: Record<string, unknown>,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc(fn, params);
    if (error || !data) {
      if (error) logWarn(`[Vangcur] ${fn} RPC error:`, error.message);
      return { allowed: false, remaining: 0 };
    }
    return {
      allowed: !!(data as { allowed?: boolean }).allowed,
      remaining: Number((data as { remaining?: number }).remaining) || 0,
    };
  } catch (e) {
    logWarn(`[Vangcur] ${fn} exception:`, e);
    return { allowed: false, remaining: 0 };
  }
}

export function checkNameChangeLimit(supabase: SupabaseClient, userId: string): Promise<RateLimitResult> {
  return checkRpcLimit(supabase, 'check_name_change_limit', { p_user_id: userId });
}

export function checkPasswordResetLimit(supabase: SupabaseClient, email: string): Promise<RateLimitResult> {
  return checkRpcLimit(supabase, 'check_password_reset_limit', { p_email: email });
}
