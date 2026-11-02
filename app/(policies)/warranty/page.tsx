import type { Metadata } from 'next';
import WarrantyClient from './WarrantyClient';
import { getServerLang } from '@/lib/i18n/getServerLang';
import { brandedTitle } from '@/lib/seoTitle';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return lang === 'en'
    ? {
      title: brandedTitle('Warranty Policy - Vangcur'),
      description: 'Vangcur warranty policy: replacement, service and official warranty with a duration that depends on the product, what is covered, claim requirements and how to claim.',
      alternates: { canonical: '/warranty' },
    }
    : {
      title: brandedTitle('ওয়ারেন্টি নীতিমালা (Warranty Policy) - Vangcur'),
      description: 'Vangcur (ভাঙচুর)-এর ওয়ারেন্টি নীতিমালা: রিপ্লেসমেন্ট, সার্ভিস ও অফিসিয়াল ওয়ারেন্টি (মেয়াদ পণ্যভেদে আলাদা), কী কভার হয়, ক্লেইমের শর্ত ও ক্লেইম করার নিয়ম।',
      alternates: { canonical: '/warranty' },
    };
}

export default function WarrantyPage() {
  return <WarrantyClient />;
}
