import type { Language } from '@/lib/store/languageStore';

export const LANG_COOKIE = 'vc_lang';

/**
 * সার্ভারে ভাষা সবসময় বাংলা ('bn') ধরা হয়।
 *
 * ⚠️ আগে এখানে `cookies()` পড়া হতো। রুট layout-এ `cookies()` পড়লে Next.js পুরো সাইটকে
 * "ডায়নামিক" বানিয়ে দেয় — ফলে `export const revalidate = ...` (ISR) কাজ করত না, প্রতিটা
 * ভিজিটে পেজ নতুন করে রেন্ডার হতো ও Supabase-এ কোয়েরি যেত (TTFB ~১.৫ সেকেন্ড)।
 *
 * এখন সার্ভারের HTML সবার জন্য এক (বাংলা) এবং CDN-এ ক্যাশ হয়। যারা ইংরেজি বেছে নিয়েছেন
 * তাদের ভাষা ক্লায়েন্টে `vc_lang` কুকি থেকে হাইড্রেশনের পর প্রয়োগ হয়
 * (lib/store/languageStore.ts → hydrateLanguage, app/components/GlobalOverlays.tsx)।
 * সার্চ ইঞ্জিন বট কুকি পাঠায় না, তাই SEO-তে আগের মতোই বাংলা মেটাডেটা যায়।
 *
 * ফাংশনের সিগনেচার (async) অপরিবর্তিত রাখা হয়েছে যাতে কলারদের কোনো ফাইল বদলাতে না হয়।
 */
export async function getServerLang(): Promise<Language> {
  return 'bn';
}

/** Small helper for building a bn/en pair inline in metadata exports. */
export function pickLang<T>(lang: Language, bn: T, en: T): T {
  return lang === 'en' ? en : bn;
}
