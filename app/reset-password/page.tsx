import { Suspense } from 'react';
import type { Metadata } from 'next';
import ResetPasswordClient from './ResetPasswordClient';
import { getServerLang } from '@/lib/i18n/getServerLang';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return {
    title: lang === 'en' ? 'Reset Password - Vangcur' : 'পাসওয়ার্ড রিসেট - Vangcur',
    robots: { index: false, follow: false },
  };
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordClient />
    </Suspense>
  );
}
