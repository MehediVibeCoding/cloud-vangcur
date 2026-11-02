import type { Metadata } from 'next';
import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getServerLang } from '@/lib/i18n/getServerLang';
import { brandedTitle } from '@/lib/seoTitle';
import { fetchActiveOffer, type ActiveOffer } from '@/lib/offerData';
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
    // F3: টাইটেলে ব্র্যান্ড আগে থেকেই আছে — টেমপ্লেট যেন আবার না জোড়ে
    title: brandedTitle(title),
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

// ⚡ অফার কনফিগ এখন সার্ভারে (ISR, উপরের revalidate) আনা হয় — আগে ব্রাউজারে হাইড্রেশনের পর Supabase কল হতো,
// তাই প্রথম HTML-এ শুধু স্কেলেটন থাকত এবং আসল কার্ড বসার সময় লেআউট শিফট (CLS) হতো। অ্যাডমিন অফার বদলালে
// /api/revalidate-catalog ইতিমধ্যে '/offers' পার্জ করে। আনা না গেলে `ok:false` যায় এবং ক্লায়েন্ট আগের মতোই আনে।
async function getInitialOffer(): Promise<ActiveOffer> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return { ok: false, config: null, model3Product: null };
  try {
    return await fetchActiveOffer(createClient(supabaseUrl, supabaseKey));
  } catch {
    return { ok: false, config: null, model3Product: null };
  }
}

// ⚠️ OffersPage নিজে sync থাকে; await শুধু নিজের <Suspense fallback={null}>-এর ভেতরের OffersLoader-এ।
// পেজ-কম্পোনেন্টই async হলে রুট/সেগমেন্টের loading.tsx বাউন্ডারি সাসপেন্ড হয়ে প্রি-রেন্ডারড HTML-এ হোমের স্কেলেটন
// ফলব্যাক হিসেবে ঢুকে যায় (HTML ~৪.৫x বড়, আর অফার পেজে হোম-স্কেলেটন ঝলক)। এই গঠনে আগের HTML-আকারই থাকে।
async function OffersLoader() {
  const initialOffer = await getInitialOffer();
  return <OffersClient initialOffer={initialOffer} />;
}

export default function OffersPage() {
  return (
    <Suspense fallback={null}>
      <OffersLoader />
    </Suspense>
  );
}
