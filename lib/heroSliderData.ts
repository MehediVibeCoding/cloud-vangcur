import type { SupabaseClient } from '@supabase/supabase-js';
import { parseSupabaseVal } from './categoryData';
import { logWarn } from './logger';
import type { SettingsMap } from './storeSettingsBatch';

export type HeroLinkType = 'category' | 'grid' | 'product';

export interface HeroCard {
  label: string;
  catId: string;
  emoji: string;
  img: string;
  bg: string;
  // ক্লিকে কোথায় যাবে: category (ডিফল্ট, পুরনো কার্ডও এটাই) | grid (হোমের প্রোডাক্ট গ্রিডে ওই প্রোডাক্টে) | product (সরাসরি ডিটেলস পেজ)
  linkType?: HeroLinkType;
  productId?: number | string;
  productName?: string;
}

// মোবাইল (২) ও ডেস্কটপ (৬) উভয়ের জন্য আদর্শ গুণিতক ১২
export const DUO_TOTAL = 12;

export const DEFAULT_HERO_CARDS: HeroCard[] = [
  { label: 'Neon Lights', catId: 'rgb', emoji: '💡', img: 'https://res.cloudinary.com/dkjzleczw/image/upload/w_360,q_auto,f_auto/v1779333775/quality_restoration_20260521091638399_e24mi5.jpg', bg: 'linear-gradient(155deg,#0d1b0d,#1a3a1a,#0d2d1a)' },
  { label: 'Mini Printer', catId: 'unique', emoji: '✨', img: 'https://res.cloudinary.com/dkjzleczw/image/upload/w_360,q_auto,f_auto/v1779535309/Enhancer-AI_UHD-Like_20260521_213052_0000_tq4ud1.png', bg: 'linear-gradient(155deg,#0a1a0a,#1a3d1a,#0a2a0a)' },
  { label: 'Water Bottle', catId: 'waterbottle', emoji: '🍶', img: 'https://res.cloudinary.com/dkjzleczw/image/upload/w_360,q_auto,f_auto/v1779535309/Enhancer-AI_UHD-water_bottle_20260521_204516_0000_uim3et.png', bg: 'linear-gradient(155deg,#001a3d,#00285c,#003d7a)' },
  { label: 'RC Plan', catId: 'toys', emoji: '🧸', img: 'https://res.cloudinary.com/dkjzleczw/image/upload/w_360,q_auto,f_auto/v1779535315/RC_20260522_213519_0000_swwxnc.png', bg: 'linear-gradient(155deg,#1a0a00,#3d1f00,#5c2d00)' },
  { label: 'G Lamp', catId: 'light', emoji: '🕯️', img: 'https://res.cloudinary.com/dkjzleczw/image/upload/w_360,q_auto,f_auto/v1779535331/Enhancer-AI_UHD-Atmospher_20260521_200857_0000_c7ihlv.png', bg: 'linear-gradient(155deg,#1a0010,#3d0030,#1a0040)' },
  { label: 'Humidifier', catId: 'humidifier', emoji: '💧', img: 'https://res.cloudinary.com/dkjzleczw/image/upload/w_360,q_auto,f_auto/v1779535308/Enhancer-AI_UHD-RC_20260522_230738_0000_uearqd.png', bg: 'linear-gradient(155deg,#001a1a,#003d3d,#005252)' },
  { label: 'FAN', catId: 'fan', emoji: '💨', img: 'https://res.cloudinary.com/dkjzleczw/image/upload/w_360,q_auto,f_auto/v1779535311/Enhancer-AI_UHD-RC_20260522_230104_0000_etqeuv.png', bg: 'linear-gradient(155deg,#001a1a,#003d3d,#005252)' },
  { label: 'Alarm Clock', catId: 'alarmclock', emoji: '⏰', img: 'https://res.cloudinary.com/dkjzleczw/image/upload/w_360,q_auto,f_auto/v1779535315/Enhancer-Ultra_HD-alarm_20260521_193333_0000_o7l1t1.png', bg: 'linear-gradient(155deg,#0a0a2a,#1a1a5c,#0a0a3d)' },
  { label: 'Moon Lamp', catId: 'light', emoji: '🕯️', img: 'https://res.cloudinary.com/dkjzleczw/image/upload/w_360,q_auto,f_auto/v1779535314/Enhancer-Ultra_HD-Untitled_design_20260521_184307_0000_oqwt8c.png', bg: 'linear-gradient(155deg,#1a1a0a,#3d3d00,#2a2a00)' },
  { label: 'Crystal Ball', catId: 'crystalball', emoji: '🔮', img: 'https://res.cloudinary.com/dkjzleczw/image/upload/w_360,q_auto,f_auto/v1779535320/Enhancer-Ultra_HD-Zone_20260521_192104_0000_bwnsxc.png', bg: 'linear-gradient(155deg,#0a0a2a,#1a1a5c,#0a0a3d)' },
  { label: 'TWS', catId: 'tws', emoji: '🎧', img: 'https://res.cloudinary.com/dkjzleczw/image/upload/w_360,q_auto,f_auto/v1779535323/quality_restoration_20260522065341115_eh8yle.png', bg: 'linear-gradient(155deg,#1a0020,#3d0050,#2d0070)' },
  { label: 'Power Bank', catId: 'powerbank', emoji: '🔋', img: 'https://res.cloudinary.com/dkjzleczw/image/upload/w_360,q_auto,f_auto/v1779535311/Enhancer-AI_UHD-Power_20260523_104015_0000_aa9euv.png', bg: 'linear-gradient(155deg,#1a0a00,#3d1f00,#5c2d00)' },
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
        .abortSignal(abortSignal as any)
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
