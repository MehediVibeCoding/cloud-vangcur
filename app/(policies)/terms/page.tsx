import type { Metadata } from 'next';
import TermsClient from './TermsClient';
import { getServerLang } from '@/lib/i18n/getServerLang';
import { brandedTitle } from '@/lib/seoTitle';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return lang === 'en'
    ? {
      title: brandedTitle('Terms & Conditions - Vangcur'),
      description: "Read Vangcur's order, delivery, unboxing video, warranty, and usage terms before shopping with us.",
      alternates: { canonical: '/terms' },
    }
    : {
      title: brandedTitle('শর্তাবলী (Terms & Conditions) - Vangcur'),
      description: 'Vangcur (ভাঙচুর) থেকে কেনাকাটার আগে আমাদের অর্ডার, ডেলিভারি, আনবক্সিং ভিডিও, ওয়ারেন্টি ও ব্যবহারের শর্তাবলী পড়ে নিন।',
      alternates: { canonical: '/terms' },
    };
}

export default function TermsPage() {
  return <TermsClient />;
}
