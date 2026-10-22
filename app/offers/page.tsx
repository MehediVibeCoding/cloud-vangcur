import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getServerLang } from '@/lib/i18n/getServerLang';
import OffersClient from './OffersClient';

const SITE_URL = 'https://vangcur.com';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  const title = lang === 'en' ? 'Special Offers & Deals - Vangcur' : 'চলতি অফারসমূহ - Vangcur';
  const description = lang === 'en'
    ? 'Browse the latest exclusive offers, promotional campaigns, and discount deals at Vangcur.'
    : 'Vangcur (ভাঙচুর)-এর চলমান বিশেষ অফার, ডিসকাউন্ট ক্যাম্পেইন ও এক্সক্লুসিভ ডিলসমূহ দেখুন।';

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/offers` },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/offers`,
      title,
      description,
      locale: lang === 'en' ? 'en_US' : 'bn_BD',
      siteName: 'Vangcur',
      images: [{ url: '/vangcur-logo.png', width: 991, height: 365, alt: 'Vangcur' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/vangcur-logo.png'],
    },
  };
}

export default function OffersPage() {
  return (
    <Suspense fallback={null}>
      <OffersClient />
    </Suspense>
  );
}
