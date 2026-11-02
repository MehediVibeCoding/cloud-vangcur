import type { Metadata } from 'next';
import { Suspense } from 'react';
import AccountClient from './AccountClient';
import { getServerLang } from '@/lib/i18n/getServerLang';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return {
    title: lang === 'en' ? 'My Profile - Vangcur' : 'মাই প্রোফাইল - Vangcur',
    description: lang === 'en'
      ? 'Manage your Vangcur account, track orders, view membership level and update profile details.'
      : 'আপনার Vangcur অ্যাকাউন্ট পরিচালনা করুন, অর্ডার ট্র্যাক করুন, মেম্বারশিপ লেভেল দেখুন এবং প্রোফাইল আপডেট করুন।',
    robots: { index: false, follow: false },
  };
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountClient />
    </Suspense>
  );
}
