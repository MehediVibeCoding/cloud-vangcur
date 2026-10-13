import type { Metadata } from 'next';
import StatusClient from './StatusClient';
import { getServerLang } from '@/lib/i18n/getServerLang';

// 🛠️ বিল্ড-টাইম ফিক্স: checkout/page.tsx এর মতোই — StatusClient Supabase
// ক্লায়েন্ট বানায়, যা build-এর সময় static prerender করতে গেলে env var
// না থাকার কারণে crash করছিল। এই পেজও dynamic।
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return {
    title: lang === 'en' ? 'Order Status - Vangcur' : 'অর্ডার স্ট্যাটাস - Vangcur',
    robots: { index: false, follow: true },
  };
}

export default function CheckoutStatusPage() {
  return <StatusClient />;
}
