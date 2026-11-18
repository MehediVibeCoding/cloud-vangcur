import type { SupabaseClient } from '@supabase/supabase-js';
import { parseSupabaseVal } from './categoryData';
import { logWarn } from './logger';
import type { SettingsMap } from './storeSettingsBatch';
import { optionalSignal } from '@/lib/abortSignal';

export type HeroLinkType = 'category' | 'grid' | 'product';

export interface HeroCard {
  label: string;
  catId: string;
  emoji: string;
  img: string;
  // 🆕 SEO/অ্যাক্সেসিবিলিটি alt — ছবির সাথেই কার্ডে সেভ থাকে (ইংরেজি, ছবির বর্ণনা)। খালি/না থাকলে label ফলব্যাক।
  alt?: string;
  bg: string;
  // ক্লিকে কোথায় যাবে: category (ডিফল্ট, পুরনো কার্ডও এটাই) | grid (হোমের প্রোডাক্ট গ্রিডে ওই প্রোডাক্টে) | product (সরাসরি ডিটেলস পেজ)
  linkType?: HeroLinkType;
  productId?: number | string;
  productName?: string;
}

// মোবাইল (২) ও ডেস্কটপ (৬) উভয়ের জন্য আদর্শ গুণিতক ১২
export const DUO_TOTAL = 12;

// ⚠️ ডিফল্ট কার্ডে ছবি ইচ্ছাকৃতভাবে খালি: ডাটাবেজ (vc_cath_cards) না পেলে শুধু ইমোজি + গ্র্যাডিয়েন্ট দেখায় (HeroSlider-এ `card.img ? … : emoji`)।
export const DEFAULT_HERO_CARDS: HeroCard[] = [
  { label: 'Neon Lights', catId: 'rgb', emoji: '💡', img: '', bg: 'linear-gradient(155deg,#0d1b0d,#1a3a1a,#0d2d1a)' },
  { label: 'Mini Printer', catId: 'unique', emoji: '✨', img: '', bg: 'linear-gradient(155deg,#0a1a0a,#1a3d1a,#0a2a0a)' },
  { label: 'Water Bottle', catId: 'waterbottle', emoji: '🍶', img: '', bg: 'linear-gradient(155deg,#001a3d,#00285c,#003d7a)' },
  { label: 'RC Plan', catId: 'toys', emoji: '🧸', img: '', bg: 'linear-gradient(155deg,#1a0a00,#3d1f00,#5c2d00)' },
  { label: 'G Lamp', catId: 'light', emoji: '🕯️', img: '', bg: 'linear-gradient(155deg,#1a0010,#3d0030,#1a0040)' },
  { label: 'Humidifier', catId: 'humidifier', emoji: '💧', img: '', bg: 'linear-gradient(155deg,#001a1a,#003d3d,#005252)' },
  { label: 'FAN', catId: 'fan', emoji: '💨', img: '', bg: 'linear-gradient(155deg,#001a1a,#003d3d,#005252)' },
  { label: 'Alarm Clock', catId: 'alarmclock', emoji: '⏰', img: '', bg: 'linear-gradient(155deg,#0a0a2a,#1a1a5c,#0a0a3d)' },
  { label: 'Moon Lamp', catId: 'light', emoji: '🕯️', img: '', bg: 'linear-gradient(155deg,#1a1a0a,#3d3d00,#2a2a00)' },
  { label: 'Crystal Ball', catId: 'crystalball', emoji: '🔮', img: '', bg: 'linear-gradient(155deg,#0a0a2a,#1a1a5c,#0a0a3d)' },
  { label: 'TWS', catId: 'tws', emoji: '🎧', img: '', bg: 'linear-gradient(155deg,#1a0020,#3d0050,#2d0070)' },
  { label: 'Power Bank', catId: 'powerbank', emoji: '🔋', img: '', bg: 'linear-gradient(155deg,#1a0a00,#3d1f00,#5c2d00)' },
];

export function padCards(arr: unknown): HeroCard[] {
  const padded: HeroCard[] = Array.isArray(arr) ? arr.slice() : [];
  while (padded.length < DUO_TOTAL) {
    const idx = padded.length;
    padded.push(DEFAULT_HERO_CARDS[idx] || DEFAULT_HERO_CARDS[0]);
  }
  return padded.slice(0, DUO_TOTAL);
}

const QUERY_TIMEOUT_MS = 3500;

export async function fetchHeroCards(
  supabase: SupabaseClient,
  preloaded?: SettingsMap | null,
): Promise<HeroCard[]> {
  try {
    // preloaded (lib/storeSettingsBatch.ts) থাকলে আলাদা কোয়েরি যায় না; না থাকলে আগের মতোই
    let data: { setting_value: unknown } | null;
    let error: unknown = null;
    if (preloaded) {
      data = 'vc_cath_cards' in preloaded ? { setting_value: preloaded['vc_cath_cards'] } : null;
    } else {
      let abortSignal: AbortSignal | undefined;
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        abortSignal = AbortSignal.timeout(QUERY_TIMEOUT_MS);
      }

      const res = await supabase
        .from('store_settings')
        .select('setting_value')
        .eq('setting_key', 'vc_cath_cards')
        .abortSignal(optionalSignal(abortSignal))
        .maybeSingle();
      data = res.data;
      error = res.error;
    }

    if (error || !data) return padCards(DEFAULT_HERO_CARDS);
    const parsedVal = parseSupabaseVal<unknown>(data.setting_value);
    if (Array.isArray(parsedVal) && parsedVal.length) {
      return padCards(parsedVal);
    }
    return padCards(DEFAULT_HERO_CARDS);
  } catch (e) {
    logWarn('Hero card fetch failed:', e);
    return padCards(DEFAULT_HERO_CARDS);
  }
}
