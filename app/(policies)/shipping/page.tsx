import type { Metadata } from 'next';
import ShippingClient from './ShippingClient';
import { getServerLang } from '@/lib/i18n/getServerLang';
import { brandedTitle } from '@/lib/seoTitle';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return lang === 'en'
    ? {
        title: brandedTitle('Order & Shipping Policy - Vangcur'),
        description: "Learn about Vangcur's order verification process, home delivery timelines, closed-box shipping, and courier rates across Bangladesh.",
      }
    : {
        title: brandedTitle('অর্ডার ও শিপিং তথ্য - Vangcur'),
        description: 'Vangcur (ভাঙচুর)-এর অর্ডার ভেরিফিকেশন, হোম ডেলিভারি সময়সীমা, ক্লোজড-বক্স ডেলিভারি ও কুরিয়ার ট্র্যাকিং সংক্রান্ত পূর্ণাঙ্গ নীতিমালা।',
      };
}

export default function ShippingPage() {
  return <ShippingClient />;
}
