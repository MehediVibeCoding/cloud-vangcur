import type { Metadata } from 'next';
import { Suspense } from 'react';
import InvoiceClient from './InvoiceClient';
import { InvoiceLoadingSkeleton } from '@/app/components/ui/Skeletons';
import { getServerLang } from '@/lib/i18n/getServerLang';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return {
    title: lang === 'en' ? 'Invoice - Vangcur' : 'অর্ডার ইনভয়েস - Vangcur',
    robots: { index: false, follow: false },
  };
}

export default function CheckoutInvoicePage() {
  return (
    <Suspense fallback={<InvoiceLoadingSkeleton />}>
      <InvoiceClient />
    </Suspense>
  );
}
