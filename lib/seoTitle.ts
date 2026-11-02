// ফাইলের পাথ: lib/seoTitle.ts
// [NEW] SEO অডিট F3 — ব্রাউজার ট্যাব/Google টাইটেলে "Vangcur" দুবার বসা ঠেকানো।
//
// সমস্যা: app/layout.tsx-এর `title.template = '%s | Vangcur'` যেকোনো স্ট্রিং টাইটেলের শেষে
// আবার " | Vangcur" জুড়ে দেয়, অথচ প্রোডাক্ট/গাইডের meta_title (ডাটাবেজ) এবং বেশিরভাগ পেজের
// কোড-লেখা টাইটেলে ব্র্যান্ড আগে থেকেই আছে → "... | Vangcur | Vangcur"।
//
// সমাধান: টাইটেলে ব্র্যান্ড-নাম আগে থেকে থাকলে `{ absolute }` (টেমপ্লেট বাদ), না থাকলে সাধারণ
// স্ট্রিং (টেমপ্লেট নিজেই ব্র্যান্ড যোগ করবে)। শুধু <title> ট্যাগে প্রযোজ্য — openGraph/twitter
// টাইটেলে টেমপ্লেট কখনোই লাগে না, তাই সেগুলো আগের মতো সাধারণ স্ট্রিং থাকে।
import type { Metadata } from 'next';

const BRAND_RE = /vangcur/i;

export function brandedTitle(title: string): NonNullable<Metadata['title']> {
  const t = String(title || '').trim();
  return BRAND_RE.test(t) ? { absolute: t } : t;
}
