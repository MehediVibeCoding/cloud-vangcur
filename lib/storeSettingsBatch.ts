// ফাইলের পাথ: lib/storeSettingsBatch.ts (নতুন)
// হোম/ক্যাটাগরি পেজ নতুন করে বানাতে `store_settings` থেকে তিনটা কী (ক্যাটাগরি, হিরো কার্ড, শোকেস)
// আলাদা তিনটা কলে আনা হতো। এখানে এক `.in()` কলে তিনটাই আনা হয়।
//
// 🛡️ নিরাপত্তা-নিয়ম: ব্যর্থ হলে `null` ফেরে — তখন কলার প্রি-লোডেড ডাটা না দিয়ে প্রতিটা ফেচার
// আগের মতো নিজে কোয়েরি করে (আচরণ হুবহু আগের মতো)। কোনো কী ডাটাবেজে না থাকলে ম্যাপে সেটা থাকে না,
// ফলে ফেচার আগের মতোই ডিফল্টে ফিরে যায়।
import type { SupabaseClient } from '@supabase/supabase-js';

export type SettingsMap = Record<string, unknown>;

// হোম ও ক্যাটাগরি পেজ যে তিনটা কী একসাথে আনে (ক্যাটাগরি, হিরো কার্ড, হোম শোকেস)
export const HOME_SETTING_KEYS = ['vc_categories', 'vc_cath_cards', 'vc_home_showcase'] as const;

const QUERY_TIMEOUT_MS = 3500;

export async function fetchSettingsBatch(
  supabase: SupabaseClient,
  keys: readonly string[],
): Promise<SettingsMap | null> {
  try {
    let abortSignal: AbortSignal | undefined;
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      abortSignal = AbortSignal.timeout(QUERY_TIMEOUT_MS);
    }
    const { data, error } = await supabase
      .from('store_settings')
      .select('setting_key,setting_value')
      .in('setting_key', [...keys])
      .abortSignal(abortSignal as AbortSignal);
    if (error || !Array.isArray(data)) return null;
    const map: SettingsMap = {};
    for (const row of data as { setting_key: string; setting_value: unknown }[]) {
      map[row.setting_key] = row.setting_value;
    }
    return map;
  } catch {
    return null;
  }
}
