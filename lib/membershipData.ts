import type { MembershipTier } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  { min: 0, max: 0, key: 'regular', bn: 'সাধারণ', en: 'Regular Member', crown: 'regular' },
  { min: 1, max: 2, key: 'silver', bn: 'সিলভার', en: 'Silver Member', crown: 'silver' },
  { min: 3, max: 4, key: 'gold', bn: 'গোল্ড', en: 'Gold Member', crown: 'gold' },
  { min: 5, max: 9, key: 'diamond', bn: 'ডায়মন্ড', en: 'Diamond Member', crown: 'diamond' },
  { min: 10, max: Infinity, key: 'legendary', bn: 'লিজেন্ডারি', en: 'Legendary Member', crown: 'legendary' },
];

export function getTier(completedCount: number): MembershipTier {
  return MEMBERSHIP_TIERS.find((t) => completedCount >= t.min && completedCount <= t.max) || MEMBERSHIP_TIERS[0];
}

const TIER_COLOR: Record<string, string> = {
  regular: 'color:#78350F',
  silver: 'color:#475569',
  gold: 'color:#92400E',
  diamond: 'color:#44A7FC',
  legendary: 'color:#D97706',
};

export function tierColorStyle(key: string): string {
  return TIER_COLOR[key] || '';
}

export function crownSVG(type: string): string {
  if (type === 'bronze' || type === 'regular') {
    return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block"><defs><linearGradient id="bronzeCrown" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#CD7F32"/><stop offset="50%" stop-color="#E8A060"/><stop offset="100%" stop-color="#A0522D"/></linearGradient></defs><polygon points="16,4 5,22 10,18 16,28 22,18 27,22" fill="url(#bronzeCrown)" stroke="#A0522D" stroke-width="1.2"/><circle cx="16" cy="4" r="2.5" fill="#F4C17A"/><circle cx="5" cy="22" r="2" fill="#CD7F32"/><circle cx="27" cy="22" r="2" fill="#CD7F32"/><polygon points="13,16 16,10 19,16" fill="rgba(255,255,255,0.25)"/></svg>`;
  }
  if (type === 'silver') {
    return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block"><defs><linearGradient id="silverCrown" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#C8D6E2"/><stop offset="50%" stop-color="#E8EEF2"/><stop offset="100%" stop-color="#94A3B8"/></linearGradient></defs><polygon points="16,3 4,21 10,17 16,27 22,17 28,21" fill="url(#silverCrown)" stroke="#94A3B8" stroke-width="1.3"/><circle cx="16" cy="3" r="2.6" fill="#F1F5F9"/><circle cx="4" cy="21" r="2" fill="#CBD5E1"/><circle cx="28" cy="21" r="2" fill="#CBD5E1"/><polygon points="12,16 16,9 20,16" fill="rgba(255,255,255,0.35)"/><line x1="16" y1="10" x2="16" y2="27" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/></svg>`;
  }
  if (type === 'gold') {
    return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block"><defs><linearGradient id="goldCrown" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FBBF24"/><stop offset="50%" stop-color="#FDE68A"/><stop offset="100%" stop-color="#D97706"/></linearGradient></defs><polygon points="16,2 3,21 10,16 16,27 22,16 29,21" fill="url(#goldCrown)" stroke="#D97706" stroke-width="1.3"/><circle cx="16" cy="2" r="2.8" fill="#FEF3C7"/><circle cx="3" cy="21" r="2.2" fill="#F59E0B"/><circle cx="29" cy="21" r="2.2" fill="#F59E0B"/><polygon points="12,15 16,7 20,15" fill="rgba(255,255,255,0.3)"/><circle cx="16" cy="15" r="1.5" fill="#FEF3C7" opacity="0.7"/></svg>`;
  }
  if (type === 'diamond') {
    return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block"><defs><linearGradient id="diamondCrown" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#90C8FA"/><stop offset="50%" stop-color="#DCEBFD"/><stop offset="100%" stop-color="#44A7FC"/></linearGradient></defs><polygon points="16,2 3,20 10,15 16,28 22,15 29,20" fill="url(#diamondCrown)" stroke="#44A7FC" stroke-width="1.3"/><polygon points="16,7 12,15 16,20 20,15" fill="#EFF6FE" opacity="0.85"/><polygon points="10,15 16,7 22,15 16,20" fill="rgba(255,255,255,0.35)"/><circle cx="16" cy="2" r="2.8" fill="#FFFFFF"/><circle cx="3" cy="20" r="2" fill="#44A7FC"/><circle cx="29" cy="20" r="2" fill="#44A7FC"/><circle cx="16" cy="14" r="1.8" fill="#FFFFFF" opacity="0.95"/></svg>`;
  }
  if (type === 'legendary') {
    return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block"><defs><linearGradient id="lgCrown" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F59E0B"/><stop offset="50%" stop-color="#EF4444"/><stop offset="100%" stop-color="#B45309"/></linearGradient><radialGradient id="lgGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FEF3C7" stop-opacity="0.8"/><stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/></radialGradient></defs><circle cx="16" cy="15" r="10" fill="url(#lgGlow)"/><polygon points="16,2 4,20 10,15 16,28 22,15 28,20" fill="url(#lgCrown)" stroke="#B45309" stroke-width="1.2"/><circle cx="16" cy="2" r="3" fill="#FCD34D"/><circle cx="4" cy="20" r="2.2" fill="#EF4444"/><circle cx="28" cy="20" r="2.2" fill="#EF4444"/><circle cx="16" cy="15" r="3" fill="#FEF3C7" opacity="0.8"/><polygon points="12,12 16,6 20,12 16,16" fill="rgba(255,255,255,0.3)"/></svg>`;
  }
  return '';
}

export function tierIconSVG(key: string): string {
  const svgs: Record<string, string> = {
    regular: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28"><defs><linearGradient id="bronzeI" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#CD7F32"/><stop offset="100%" stop-color="#A0522D"/></linearGradient></defs><polygon points="16,4 5,22 10,18 16,28 22,18 27,22" fill="url(#bronzeI)" stroke="#A0522D" stroke-width="1.2"/><circle cx="16" cy="4" r="2.2" fill="#F4C17A"/><circle cx="5" cy="22" r="1.8" fill="#CD7F32"/><circle cx="27" cy="22" r="1.8" fill="#CD7F32"/></svg>`,
    silver: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28"><defs><linearGradient id="silverI" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#C8D6E2"/><stop offset="100%" stop-color="#94A3B8"/></linearGradient></defs><polygon points="16,3 4,21 10,17 16,27 22,17 28,21" fill="url(#silverI)" stroke="#94A3B8" stroke-width="1.3"/><circle cx="16" cy="3" r="2.2" fill="#F1F5F9"/><circle cx="4" cy="21" r="1.8" fill="#CBD5E1"/><circle cx="28" cy="21" r="1.8" fill="#CBD5E1"/></svg>`,
    gold: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28"><defs><linearGradient id="goldI" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FBBF24"/><stop offset="100%" stop-color="#D97706"/></linearGradient></defs><polygon points="16,2 3,21 10,16 16,27 22,16 29,21" fill="url(#goldI)" stroke="#D97706" stroke-width="1.3"/><circle cx="16" cy="2" r="2.5" fill="#FEF3C7"/><circle cx="3" cy="21" r="2" fill="#F59E0B"/><circle cx="29" cy="21" r="2" fill="#F59E0B"/><circle cx="16" cy="14" r="1.5" fill="#FEF3C7" opacity="0.7"/></svg>`,
    diamond: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28"><defs><linearGradient id="diamondI" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#90C8FA"/><stop offset="100%" stop-color="#44A7FC"/></linearGradient></defs><polygon points="16,2 3,20 10,15 16,28 22,15 29,20" fill="url(#diamondI)" stroke="#44A7FC" stroke-width="1.3"/><polygon points="16,7 12,15 16,20 20,15" fill="#EFF6FE" opacity="0.85"/><circle cx="16" cy="2" r="2.4" fill="#FFFFFF"/><circle cx="3" cy="20" r="1.8" fill="#44A7FC"/><circle cx="29" cy="20" r="1.8" fill="#44A7FC"/></svg>`,
    legendary: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28"><defs><linearGradient id="lgI" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F59E0B"/><stop offset="50%" stop-color="#EF4444"/><stop offset="100%" stop-color="#B45309"/></linearGradient></defs><polygon points="16,2 4,20 10,15 16,28 22,15 28,20" fill="url(#lgI)" stroke="#B45309" stroke-width="1.2"/><circle cx="16" cy="2" r="2.8" fill="#FCD34D"/><circle cx="4" cy="20" r="2.2" fill="#EF4444"/><circle cx="28" cy="20" r="2.2" fill="#EF4444"/><circle cx="16" cy="14" r="2.5" fill="#FEF3C7" opacity="0.8"/></svg>`,
  };
  return svgs[key] || svgs.regular;
}

// ══════════════════════════════════════════════════════════════════════
// 🎡 মেম্বারশিপ স্পিন হুইল ও ভিআইপি রিওয়ার্ড আর্কিটেকচার
// ══════════════════════════════════════════════════════════════════════

export interface SpinSlice {
  id: number;
  label: string;
  labelEn: string;
  value: number;
  type: 'fixed' | 'free_shipping';
  minOrder: number;
  weight: number; // ০ মানে কাস্টমার কখনোই এই স্লাইসে জিতবে না (ব্যবসায়িক সুরক্ষা)
  color: string;
  bg: string;
}

export interface TierSpinReward {
  tierKey: string;
  code: string;
  slice: SpinSlice;
  wonAt: number;
  expiresAt: number;
}

// ১. সিলভার স্পিন হুইল স্লাইস (Silver Cash Spin)
export const SILVER_SPIN_SLICES: SpinSlice[] = [
  { id: 0, label: '৳৫০ ছাড়', labelEn: '৳50 OFF', value: 50, type: 'fixed', minOrder: 800, weight: 70, color: '#0F172A', bg: '#F8FAFC' },
  { id: 1, label: '৳২০০ ছাড়', labelEn: '৳200 OFF', value: 200, type: 'fixed', minOrder: 2500, weight: 0, color: '#0F172A', bg: '#EFF6FE' },
  { id: 2, label: '৳২০ ছাড়', labelEn: '৳20 OFF', value: 20, type: 'fixed', minOrder: 500, weight: 25, color: '#0F172A', bg: '#F8FAFC' },
  { id: 3, label: '৳৫০০ ছাড়', labelEn: '৳500 OFF', value: 500, type: 'fixed', minOrder: 5000, weight: 0, color: '#0F172A', bg: '#EFF6FE' },
  { id: 4, label: '৳১০০ ছাড়', labelEn: '৳100 OFF', value: 100, type: 'fixed', minOrder: 1500, weight: 5, color: '#0F172A', bg: '#F8FAFC' },
  { id: 5, label: '৳৩০০ ছাড়', labelEn: '৳300 OFF', value: 300, type: 'fixed', minOrder: 3500, weight: 0, color: '#0F172A', bg: '#EFF6FE' },
];

// ২. গোল্ড স্পিন হুইল স্লাইস (Gold Magic Spinner)
export const GOLD_SPIN_SLICES: SpinSlice[] = [
  { id: 0, label: 'ফ্রি ডেলিভারি', labelEn: 'Free Delivery', value: 0, type: 'free_shipping', minOrder: 0, weight: 65, color: '#0F172A', bg: '#F8FAFC' },
  { id: 1, label: 'SAVE500', labelEn: 'SAVE500', value: 500, type: 'fixed', minOrder: 5000, weight: 0, color: '#0F172A', bg: '#FEF3C7' },
  { id: 2, label: 'SAVE100', labelEn: 'SAVE100', value: 100, type: 'fixed', minOrder: 1200, weight: 30, color: '#0F172A', bg: '#F8FAFC' },
  { id: 3, label: 'SAVE200', labelEn: 'SAVE200', value: 200, type: 'fixed', minOrder: 2500, weight: 0, color: '#0F172A', bg: '#FEF3C7' },
  { id: 4, label: 'SAVE150', labelEn: 'SAVE150', value: 150, type: 'fixed', minOrder: 2000, weight: 5, color: '#0F172A', bg: '#F8FAFC' },
  { id: 5, label: 'সারপ্রাইজ গিফট', labelEn: 'Mystery Gift', value: 0, type: 'free_shipping', minOrder: 0, weight: 0, color: '#0F172A', bg: '#FEF3C7' },
];

export interface SpinServerResult {
  ok: boolean;
  error?: string;
  alreadySpun?: boolean;
  index?: number;
  label?: string;
  code?: string;
  discountType?: string;
  discountValue?: number;
  minOrderAmount?: number;
  expiresAt?: string;
}

/**
 * বিজয়ী স্লাইস ও কুপন সার্ভার (spin_tier_wheel RPC) ঠিক করে — client শুধু ফেরত-আসা index অনুযায়ী
 * চাকাটা ঘুরিয়ে দেখায়।
 */
export async function spinTierWheel(supabase: SupabaseClient, tierKey: string): Promise<SpinServerResult> {
  try {
    const { data, error } = await supabase.rpc('spin_tier_wheel', { p_tier_key: tierKey });
    if (error || !data || data.ok !== true) {
      return { ok: false, error: data?.error || error?.message || 'unknown_error' };
    }
    return {
      ok: true,
      alreadySpun: !!data.already_spun,
      index: Number(data.index),
      label: data.label,
      code: data.code,
      discountType: data.discount_type,
      discountValue: Number(data.discount_value),
      minOrderAmount: Number(data.min_order_amount),
      expiresAt: data.expires_at,
    };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'network_error' };
  }
}

export interface LegendaryVoucherStatus {
  ok: boolean;
  error?: string;
  alreadyClaimed?: boolean;
  isAvailable?: boolean;
  used?: boolean;
  deliveredCount?: number;
}

/**
 * মেম্বারশিপ মডাল থেকে "ক্লেইম করুন" চাপলে কল হয়। সার্ভার নিজে (এখানেই,
 * একবারই) ইউজারের ডেলিভার্ড-অর্ডার গোনে — ১০+ হলে লাইফটাইমে-একবার একটা
 * ভাউচার ইস্যু করে। এরপর checkout শুধু এই ভাউচারের boolean flag দেখে,
 * অর্ডার-সংখ্যা আর নতুন করে গোনে না।
 */
export async function claimLegendaryReward(supabase: SupabaseClient): Promise<LegendaryVoucherStatus> {
  try {
    const { data, error } = await supabase.rpc('claim_legendary_reward');
    if (error || !data || data.ok !== true) {
      return { ok: false, error: data?.error || error?.message || 'unknown_error' };
    }
    return {
      ok: true,
      alreadyClaimed: !!data.already_claimed,
      isAvailable: !!data.is_available,
      used: !!data.used,
    };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'network_error' };
  }
}

/** checkout/অ্যাকাউন্ট পেজে দেখানোর জন্য — শুধু নিজের ভাউচারের স্ট্যাটাস পড়ে (RLS-সুরক্ষিত)। */
export async function getLegendaryVoucherStatus(supabase: SupabaseClient): Promise<LegendaryVoucherStatus> {
  try {
    // RLS পলিসি নিজেই শুধু auth.uid() = user_id সারি ফেরত দেয়, তাই আলাদা
    // করে userId ফিল্টার/prop পাস করার দরকার নেই।
    const { data, error } = await supabase
      .from('legendary_vouchers')
      .select('is_available, used_at')
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: true, alreadyClaimed: false, isAvailable: false, used: false };
    return { ok: true, alreadyClaimed: true, isAvailable: !!data.is_available, used: !!data.used_at };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'network_error' };
  }
}

// ══════════════════════════════════════════════════════════════════════
// 🛡️ ফিক্স (কুপন সিকিউরিটি রিডিজাইন, ২০২৬-০৯-৩০): আগে "আমি স্পিন করেছি
// কিনা / আমার রিওয়ার্ড এখনো সক্রিয় কিনা" — এই পুরো UI স্টেট শুধু ব্রাউজারের
// localStorage থেকে পড়া হতো। ফোন বদলালে বা ক্যাশ মুছলে ইউজার তার জেতা
// পুরস্কার "হারিয়ে" ফেলত (আসলে হারাতো না, কারণ চেকআউট সবসময় DB-ই চেক করত,
// কিন্তু UI ভুল দেখাতো)। এখন থেকে ডাটাবেজই (get_my_tier_rewards RPC) একমাত্র
// সত্য উৎস — localStorage সম্পূর্ণ বাদ। get_my_tier_rewards() প্রতিটা
// tier_key-এর জন্য একটা করে অবস্থা ফেরত দেয়:
//   locked    → এখনো ওই লেভেলে পৌঁছায়নি
//   available → লেভেলে আছে, এখনো স্পিন করেনি
//   active    → স্পিন করেছে, কুপন এখনো সক্রিয় ও মেয়াদ আছে
//   expired   → স্পিন করেছে কিন্তু ২৪ ঘণ্টার মেয়াদ শেষ (আবার চালু করা যাবে)
//   used      → কুপনটা ইতিমধ্যে অর্ডারে ব্যবহার হয়ে গেছে (স্থায়ীভাবে শেষ)
//   disabled  → এডমিন কুপনটা নিষ্ক্রিয় করে দিয়েছে
//   missed    → ইউজার এই লেভেল পার হয়ে উপরের লেভেলে চলে গেছে, স্পিন না করেই
// ══════════════════════════════════════════════════════════════════════

export interface TierRewardServerState {
  tier: string;
  state: 'locked' | 'available' | 'active' | 'expired' | 'used' | 'disabled' | 'missed';
  can_reactivate?: boolean;
  index?: number;
  label?: string;
  code?: string;
  discount_type?: string;
  discount_value?: number;
  min_order_amount?: number;
  expires_at?: string;
  reactivations?: number;
}

export interface MyTierRewards {
  ok: boolean;
  error?: string;
  delivered?: number;
  current_tier?: string | null;
  silver?: TierRewardServerState;
  gold?: TierRewardServerState;
}

/** মডাল খোলার সময় (এবং স্পিন/রিঅ্যাক্টিভেটের ঠিক আগে) ইউজারের আসল, ডাটাবেজ-ভিত্তিক অবস্থা আনে। */
export async function getMyTierRewards(supabase: SupabaseClient): Promise<MyTierRewards> {
  try {
    const { data, error } = await supabase.rpc('get_my_tier_rewards');
    if (error || !data) return { ok: false, error: error?.message || 'unknown_error' };
    return data as MyTierRewards;
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'network_error' };
  }
}

/** "আবার চালু করুন" — একই জেতা পুরস্কার আরেকটা ২৪ ঘণ্টার জন্য সক্রিয় করে, নতুন করে ঘোরায় না। */
export async function reactivateTierReward(supabase: SupabaseClient, tierKey: string): Promise<SpinServerResult> {
  try {
    const { data, error } = await supabase.rpc('reactivate_tier_reward', { p_tier_key: tierKey });
    if (error || !data || data.ok !== true) {
      return { ok: false, error: data?.error || error?.message || 'unknown_error' };
    }
    return {
      ok: true,
      alreadySpun: true,
      index: Number(data.index),
      label: data.label,
      code: data.code,
      discountType: data.discount_type,
      discountValue: Number(data.discount_value),
      minOrderAmount: Number(data.min_order_amount),
      expiresAt: data.expires_at,
    };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'network_error' };
  }
}

/** সার্ভারের raw স্টেট + এখানকার স্লাইস-আর্ট (রং/লেবেল ইত্যাদি) মিলিয়ে UI-এর জন্য দরকারি একটা অবজেক্ট বানায়। */
export interface ActiveTierReward {
  tierKey: string;
  code: string;
  slice: SpinSlice;
  expiresAt: number; // ms epoch
  reactivations: number;
}

export interface TierSpinUIState {
  status: TierRewardServerState['state'];
  reward?: ActiveTierReward;
  canReactivate: boolean;
}

export function buildTierSpinUIState(
  tierKey: string,
  slices: SpinSlice[],
  serverState?: TierRewardServerState,
): TierSpinUIState {
  if (!serverState) return { status: 'locked', canReactivate: false };
  const { state } = serverState;
  if (state === 'active' || state === 'expired') {
    const slice = (typeof serverState.index === 'number' && slices.find((s) => s.id === serverState.index)) || slices[0];
    return {
      status: state,
      canReactivate: !!serverState.can_reactivate,
      reward: {
        tierKey,
        code: serverState.code || '',
        slice,
        expiresAt: serverState.expires_at ? new Date(serverState.expires_at).getTime() : Date.now(),
        reactivations: serverState.reactivations || 0,
      },
    };
  }
  return { status: state, canReactivate: false };
}

/** স্পিন/রিঅ্যাক্টিভেট সফল হওয়ার পর ফেরত-আসা ফলাফল দিয়ে লোকাল state প্যাচ করার জন্য। */
export function patchTierRewardState(
  prev: MyTierRewards | null,
  tierKey: 'silver' | 'gold',
  result: SpinServerResult,
): MyTierRewards {
  const base: MyTierRewards = prev || { ok: true };
  const patched: TierRewardServerState = {
    tier: tierKey,
    state: 'active',
    index: result.index,
    label: result.label,
    code: result.code,
    discount_type: result.discountType,
    discount_value: result.discountValue,
    min_order_amount: result.minOrderAmount,
    expires_at: result.expiresAt,
    reactivations: ((tierKey === 'silver' ? base.silver?.reactivations : base.gold?.reactivations) || 0) + (result.alreadySpun ? 1 : 0),
    can_reactivate: false,
  };
  return { ...base, [tierKey]: patched };
}

/** সময় ফুরালে (কাউন্টডাউন ০ হলে) লোকাল state-কে 'expired'-এ নামিয়ে দেওয়ার জন্য, রিফেচ ছাড়াই। */
export function markTierRewardExpiredLocally(prev: MyTierRewards | null, tierKey: 'silver' | 'gold'): MyTierRewards | null {
  if (!prev) return prev;
  const current = tierKey === 'silver' ? prev.silver : prev.gold;
  if (!current || current.state !== 'active') return prev;
  return { ...prev, [tierKey]: { ...current, state: 'expired', can_reactivate: true } };
}
