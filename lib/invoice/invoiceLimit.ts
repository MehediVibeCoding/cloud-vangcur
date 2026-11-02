import { DEFAULT_WA_LINK } from '@/lib/floatButtonsData';

export const MAX_INVOICE_DOWNLOADS = 3;

export function buildInvoiceWaLink(orderNum: string, lang: 'bn' | 'en'): string {
  const num = String(orderNum || '').trim();
  const msg =
    lang === 'en'
      ? `My order number is ${num}. I would like to download my invoice / view my order history and invoice. Kindly send me my invoice.`
      : `আমার অর্ডার নম্বর ${num}। আমি আমার ইনভয়েসটা ডাউনলোড করতে / অর্ডার হিস্ট্রি ও ইনভয়েস দেখতে চাই। কাইন্ডলি আমাকে ইনভয়েসটা দিন।`;
  return `${DEFAULT_WA_LINK}?text=${encodeURIComponent(msg)}`;
}
