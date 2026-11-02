import type { Metadata } from 'next';
import AccountOrdersClient from './AccountOrdersClient';
import { getServerLang } from '@/lib/i18n/getServerLang';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return {
    title: lang === 'en' ? 'My Orders - Vangcur' : 'আমার অর্ডার সমূহ - Vangcur',
    robots: { index: false, follow: false },
  };
}

export default function AccountOrdersPage() {
  return <AccountOrdersClient />;
}
