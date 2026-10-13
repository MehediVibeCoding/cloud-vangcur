import type { Metadata } from 'next';
import WarrantyClient from './WarrantyClient';
import { getServerLang } from '@/lib/i18n/getServerLang';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return lang === 'en'
    ? {
      title: 'Warranty Policy - Vangcur',
      description: 'Vangcur warranty policy: 7-day replacement warranty, 6-month, 1-year and 2-year warranty on selected products, what is covered, claim requirements and how to claim.',
    }
    : {
      title: 'ওয়ারেন্টি নীতিমালা (Warranty Policy) - Vangcur',
      description: 'Vangcur (ভাঙচুর)-এর ওয়ারেন্টি নীতিমালা: ৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি, নির্বাচিত পণ্যে ৬ মাস / ১ বছর / ২ বছরের ওয়ারেন্টি, কী কভার হয়, ক্লেইমের শর্ত ও ক্লেইম করার নিয়ম।',
    };
}

export default function WarrantyPage() {
  return <WarrantyClient />;
}
