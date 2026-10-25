import type { Metadata } from 'next';
import { Suspense } from 'react';
import TrackOrderClient from './TrackOrderClient';
import { getServerLang } from '@/lib/i18n/getServerLang';
import { brandedTitle } from '@/lib/seoTitle';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return lang === 'en'
    ? {
      title: brandedTitle('Track Your Order - Vangcur'),
      description: 'Check the latest status of your Vangcur order using your order number and mobile number.',
    }
    : {
      title: brandedTitle('অর্ডার ট্র্যাক করুন - Vangcur'),
      description: 'অর্ডার নম্বর ও মোবাইল নম্বর দিয়ে আপনার Vangcur অর্ডারের সর্বশেষ অবস্থা দেখুন।',
    };
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={null}>
      <TrackOrderClient />
    </Suspense>
  );
}
