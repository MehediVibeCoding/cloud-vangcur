import type { Metadata } from 'next';
import RefundPolicyClient from './RefundPolicyClient';
import { getServerLang } from '@/lib/i18n/getServerLang';
import { brandedTitle } from '@/lib/seoTitle';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return lang === 'en'
    ? {
      title: brandedTitle('Return & Refund Policy - Vangcur'),
      description: "Vangcur's full policy on product returns, exchanges, replacements, and refunds.",
    }
    : {
      title: brandedTitle('রিটার্ন ও রিফান্ড পলিসি - Vangcur'),
      description: 'Vangcur (ভাঙচুর)-এর প্রোডাক্ট রিটার্ন, এক্সচেঞ্জ, রিপ্লেসমেন্ট ও রিফান্ড সংক্রান্ত পূর্ণাঙ্গ নীতিমালা।',
    };
}

export default function RefundPolicyPage() {
  return <RefundPolicyClient />;
}
