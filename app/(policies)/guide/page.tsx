import type { Metadata } from 'next';
import GuideClient from './GuideClient';
import { getServerLang } from '@/lib/i18n/getServerLang';
import { brandedTitle } from '@/lib/seoTitle';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return lang === 'en'
    ? {
        title: brandedTitle('User Guide & How to Order - Vangcur'),
        description: 'Complete architecture and step-by-step user guide on how to search products, apply coupons, place orders, verify bKash payments, track deliveries, and submit reviews on Vangcur.',
        alternates: { canonical: '/guide' },
      }
    : {
        title: brandedTitle('ইউজার গাইড ও অর্ডার সহায়িকা - Vangcur'),
        description: 'Vangcur (ভাঙচুর) ওয়েবসাইট ব্যবহারের পূর্ণাঙ্গ নির্দেশিকা — কীভাবে পণ্য খুঁজবেন, কুপন ব্যবহার করবেন, ৩-ধাপে অর্ডার করবেন, বিকাশ পেমেন্ট নিশ্চিত করবেন, পার্সেল ট্র্যাক করবেন এবং রিভিউ প্রদান করবেন।',
        alternates: { canonical: '/guide' },
      };
}

export default function GuidePage() {
  return <GuideClient />;
}
