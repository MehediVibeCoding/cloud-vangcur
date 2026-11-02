import type { Metadata } from 'next';
import PrivacyPolicyClient from './PrivacyPolicyClient';
import { getServerLang } from '@/lib/i18n/getServerLang';
import { brandedTitle } from '@/lib/seoTitle';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return lang === 'en'
    ? {
      title: brandedTitle('Privacy Policy - Vangcur'),
      description: 'Learn what information Vangcur collects, how we use it, and how we keep it safe.',
      alternates: { canonical: '/privacy-policy' },
    }
    : {
      title: brandedTitle('প্রাইভেসি পলিসি - Vangcur'),
      description: 'Vangcur (ভাঙচুর) আপনার কী তথ্য সংগ্রহ করে, কীভাবে ব্যবহার করে এবং কীভাবে সুরক্ষিত রাখে তা জানুন।',
      alternates: { canonical: '/privacy-policy' },
    };
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />;
}
