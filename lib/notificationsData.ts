import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchProductById, productHref } from './productData';
import { getStockNotifications } from './accountData';
import { MEMBERSHIP_TIERS, getTier, getMyTierRewards } from './membershipData';
import type { Order, DraftOrder } from '@/types';

export interface NotificationItem {
  id: string;
  type: 'offer' | 'stock' | 'draft' | 'review' | 'tier' | 'code';
  title: string;
  subtitle?: string;
  href: string;
}

interface OfferModel1 {
  title: string;
  body: string;
  btn_text: string;
  btn_url: string;
}
interface OfferModel2 {
  img: string;
  url: string;
}
interface OfferModel3 {
  product_id: string;
  badge_text: string;
}
type OfferActiveModel = 'none' | 'model1' | 'model2' | 'model3';
interface OfferConfig {
  active_model: OfferActiveModel;
  model1: OfferModel1;
  model2: OfferModel2;
  model3: OfferModel3;
}

/**
 * এডমিন প্যানেল থেকে চালু করা লাইভ অফার (store_settings.vc_offer_popup) —
 * সক্রিয় থাকলে নোটিফিকেশন লিস্টে দেখানো হবে, ক্লিক করলে /offers পেজে নিয়ে যাবে।
 */
export async function fetchLiveOfferNotification(
  supabase: SupabaseClient,
  lang: 'bn' | 'en',
): Promise<NotificationItem | null> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('setting_value')
      .eq('setting_key', 'vc_offer_popup')
      .maybeSingle();
    if (error || !data?.setting_value) return null;

    const raw = data.setting_value;
    const cfg: OfferConfig = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!cfg || !cfg.active_model || cfg.active_model === 'none') return null;

    let title = '';
    if (cfg.active_model === 'model1' && cfg.model1?.title?.trim()) {
      title = cfg.model1.title.trim();
    } else if (cfg.active_model === 'model3' && cfg.model3?.badge_text?.trim()) {
      title = cfg.model3.badge_text.trim();
    } else if (cfg.active_model === 'model2' && cfg.model2?.img?.trim()) {
      title = lang === 'en' ? 'A special offer is live!' : 'একটি বিশেষ অফার চলছে!';
    }
    if (!title) return null;

    return {
      id: `offer:${cfg.active_model}:${title}`,
      type: 'offer',
      title,
      subtitle: lang === 'en' ? 'Tap to view the offer' : 'অফারটি দেখতে ট্যাপ করুন',
      href: '/offers',
    };
  } catch {
    return null;
  }
}

/**
 * "স্টকে আসলে জানান" — যেসব প্রোডাক্টে ইউজার নোটিফাই চেয়েছিল এবং এখন স্টকে এসেছে।
 */
export async function fetchStockBackNotifications(
  supabase: SupabaseClient,
  lang: 'bn' | 'en',
): Promise<NotificationItem[]> {
  const saved = getStockNotifications();
  if (!saved.length) return [];

  const results = await Promise.all(
    saved.map(async (item): Promise<NotificationItem | null> => {
      try {
        const product = await fetchProductById(supabase, item.prodId);
        if (!product || (product.stock || 0) <= 0) return null;
        const notification: NotificationItem = {
          id: `stock:${item.key}`,
          type: 'stock',
          title: item.prodName || product.name || (lang === 'en' ? 'Product' : 'প্রোডাক্ট'),
          subtitle: lang === 'en' ? 'Back in stock!' : 'স্টকে এসেছে!',
          href: productHref(product),
        };
        return notification;
      } catch {
        return null;
      }
    }),
  );

  return results.filter((x): x is NotificationItem => !!x);
}

/**
 * ড্রাফট অর্ডার — কেউ অর্ডার শুরু করে শেষ না করে রেখে দিয়েছে ("Pending" মানে
 * এখানে অসম্পূর্ণ/ড্রাফট অর্ডার, কনফার্ম করা অর্ডারের স্ট্যাটাস নয়)।
 */
export function buildDraftOrderNotifications(drafts: DraftOrder[], lang: 'bn' | 'en'): NotificationItem[] {
  return drafts.slice(0, 5).map((d) => {
    const first = d.items?.[0];
    const extra = (d.items?.length || 0) - 1;
    const namePart = first ? first.name : (lang === 'en' ? 'Your order' : 'আপনার অর্ডার');
    const suffix = extra > 0 ? (lang === 'en' ? ` +${extra} more` : ` +আরও ${extra}টি`) : '';
    return {
      id: `draft:${d.id}`,
      type: 'draft' as const,
      title: `${namePart}${suffix}`,
      subtitle: lang === 'en' ? 'Draft order — continue checkout' : 'অসম্পূর্ণ অর্ডার — চালিয়ে যান',
      href: '/account',
    };
  });
}

const REVIEW_DISMISSED_KEY = 'vc_review_dismissed_ids';

function getDismissedReviewIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(REVIEW_DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

export function dismissReviewNotification(orderId: string | number): void {
  try {
    const ids = getDismissedReviewIds();
    if (!ids.includes(String(orderId))) {
      ids.push(String(orderId));
      localStorage.setItem(REVIEW_DISMISSED_KEY, JSON.stringify(ids));
    }
  } catch {
    // storage unavailable
  }
}

/**
 * ডেলিভারড অর্ডারে রিভিউ দেওয়ার অনুরোধ — একবার নোটিফিকেশনে ক্লিক করে
 * দেখলে/dismiss করলে সেটা আর দেখাবে না (dismissReviewNotification দিয়ে)।
 */
export function buildReviewRequestNotifications(orders: Order[], lang: 'bn' | 'en'): NotificationItem[] {
  const dismissed = getDismissedReviewIds();
  return orders
    .filter((o) => o.status === 'delivered' && !dismissed.includes(String(o.id)))
    .slice(0, 5)
    .map((o) => {
      const first = o.items?.[0];
      const name = first ? first.name : (lang === 'en' ? 'Your product' : 'আপনার প্রোডাক্ট');
      return {
        id: `review:${o.id}`,
        type: 'review' as const,
        title: lang === 'en' ? `${name} was delivered!` : `${name} ডেলিভারড হয়েছে!`,
        subtitle: lang === 'en' ? 'Leave a review for it' : 'একটা রিভিউ দিয়ে যান',
        href: '/account/orders',
      };
    });
}

const LAST_NOTIFIED_TIER_KEY = 'vc_last_notified_tier';

export function getLastNotifiedTier(): string {
  try {
    return localStorage.getItem(LAST_NOTIFIED_TIER_KEY) || '';
  } catch {
    return '';
  }
}

export function setLastNotifiedTier(tierKey: string): void {
  try {
    localStorage.setItem(LAST_NOTIFIED_TIER_KEY, tierKey);
  } catch {
    // storage unavailable
  }
}

/**
 * মেম্বারশিপ লেভেল আপ — অর্ডার কনফার্ম/সাকসেস হয়ে নতুন টায়ারে উঠলে একবার
 * জানানো হবে, একবার নোটিফিকেশন প্যানেল খুললেই এই টায়ারটা মার্ক-সিন হয়ে
 * ভবিষ্যতে আর দেখাবে না (setLastNotifiedTier দিয়ে)।
 */
export function buildTierUpgradeNotification(completedOrders: number, lang: 'bn' | 'en'): NotificationItem | null {
  const tier = getTier(completedOrders);
  const tierIndex = MEMBERSHIP_TIERS.findIndex((t) => t.key === tier.key);
  if (tierIndex <= 0) return null; // 'regular' (ডিফল্ট) নিয়ে নোটিফাই করার দরকার নেই

  if (getLastNotifiedTier() === tier.key) return null;

  const tierName = lang === 'en' ? tier.en : tier.bn;
  return {
    id: `tier:${tier.key}`,
    type: 'tier',
    title: lang === 'en' ? `You've reached ${tierName}!` : `আপনি এখন ${tierName}!`,
    subtitle: lang === 'en' ? 'Congratulations on the upgrade' : 'মেম্বারশিপ লেভেল আপ হয়েছে, অভিনন্দন',
    // 🆕 শুধু /account-এ ল্যান্ড না করে সরাসরি মেম্বারশিপ মডাল খুলে দেওয়ার জন্য
    href: '/account?open=membership',
  };
}

/**
 * স্পিন-হুইল থেকে পাওয়া গোপন ডিসকাউন্ট কোড, যেটা এক্সপায়ার হয়ে যাওয়ার
 * আগেই ইউজারকে জানানো দরকার।
 * 🛡️ ফিক্স: আগে localStorage থেকে পড়া হতো (ডিভাইস বদলালে/ক্যাশ মুছলে ভুল
 * দেখাতো), এখন get_my_tier_rewards() RPC দিয়ে ডাটাবেজ থেকে আসল অবস্থা আনা হয়।
 */
export async function buildSecretCodeNotifications(supabase: SupabaseClient, lang: 'bn' | 'en'): Promise<NotificationItem[]> {
  const items: NotificationItem[] = [];
  const rewards = await getMyTierRewards(supabase);
  if (!rewards.ok) return items;
  for (const tier of MEMBERSHIP_TIERS) {
    const state = tier.key === 'silver' ? rewards.silver : tier.key === 'gold' ? rewards.gold : undefined;
    if (!state || state.state !== 'active' || !state.code || !state.expires_at) continue;
    const expiresAtMs = new Date(state.expires_at).getTime();
    const hoursLeft = Math.max(1, Math.ceil((expiresAtMs - Date.now()) / (60 * 60 * 1000)));
    items.push({
      id: `code:${tier.key}:${state.code}`,
      type: 'code',
      title: lang === 'en' ? `Code ${state.code} is waiting` : `কোড ${state.code} অপেক্ষা করছে`,
      subtitle: lang === 'en' ? `Expires in ~${hoursLeft}h — use it before checkout` : `প্রায় ${hoursLeft} ঘণ্টা পর এক্সপায়ার হবে — চেকআউটে ব্যবহার করুন`,
      href: '/account',
    });
  }
  return items;
}

const DISMISSED_NOTIF_KEY = 'vc_notif_dismissed_ids';
const DISMISSED_NOTIF_MAX = 200; // অসীম বৃদ্ধি ঠেকাতে সর্বোচ্চ কতগুলো id রাখা হবে

/**
 * ব্যবহারকারী কোনো নোটিফিকেশন সোয়াইপ/ক্লিক করে মুছে ফেললে তার id এখানে জমা
 * থাকে, পরের বার loadNotifications() কল হলে এই id-গুলো লিস্ট থেকে বাদ যাবে।
 */
export function getDismissedNotifIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_NOTIF_KEY) || '[]');
  } catch {
    return [];
  }
}

export function dismissNotification(id: string): void {
  try {
    const ids = getDismissedNotifIds();
    if (!ids.includes(id)) {
      ids.push(id);
      const trimmed = ids.slice(-DISMISSED_NOTIF_MAX);
      localStorage.setItem(DISMISSED_NOTIF_KEY, JSON.stringify(trimmed));
    }
  } catch {
    // storage unavailable
  }
}

const SEEN_SIG_KEY = 'vc_notif_seen_sig';

export function buildNotifSignature(items: NotificationItem[]): string {
  return items.map((i) => i.id).sort().join('|');
}

export function getNotifSeenSignature(): string {
  try {
    return localStorage.getItem(SEEN_SIG_KEY) || '';
  } catch {
    return '';
  }
}

export function setNotifSeenSignature(sig: string): void {
  try {
    localStorage.setItem(SEEN_SIG_KEY, sig);
  } catch {
    // storage unavailable — নীরবে উপেক্ষা করা হচ্ছে
  }
        }
