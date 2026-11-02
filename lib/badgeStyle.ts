// ফাইলের পাথ: lib/badgeStyle.ts
// প্রোডাক্ট ব্যাজের লেখা অনুযায়ী রঙ — হোম কার্ড, প্রোডাক্ট পেজ ও স্কেলেটন সবখানে একই নিয়ম।
// SALE সবুজ · OFFER/অফার হলুদ · NEW বেগুনি · HOT ও বাকি সব সিগনেচার নীল।
// Mehediadmin-এর lib/badgeStyle.ts-এর সাথে হুবহু মিল রাখতে হবে।

export type BadgeKind = 'sale' | 'offer' | 'new' | 'hot' | 'other';

export function badgeKind(badge: string | null | undefined): BadgeKind {
  const t = (badge || '').trim().toLowerCase();
  if (!t) return 'other';
  if (t.includes('sale') || t.includes('সেল')) return 'sale';
  if (t.includes('offer') || t.includes('অফার')) return 'offer';
  if (t.includes('new') || t.includes('নতুন') || t.includes('নিউ')) return 'new';
  if (t.includes('hot') || t.includes('হট')) return 'hot';
  return 'other';
}

const CLASSES: Record<BadgeKind, string> = {
  sale: 'bg-emerald-500 text-white',
  offer: 'bg-amber-300 text-amber-950',
  new: 'bg-violet-500 text-white',
  hot: 'bg-brand-light text-white',
  other: 'bg-brand-light text-white',
};

/** ব্যাজের ব্যাকগ্রাউন্ড ও টেক্সট রঙের Tailwind ক্লাস */
export function badgeColorClass(badge: string | null | undefined): string {
  return CLASSES[badgeKind(badge)];
}
