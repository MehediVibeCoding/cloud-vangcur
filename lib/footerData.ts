import type { FooterContact, FooterLogo, ServiceLink } from '@/types';
import { sanitizeHref } from './security';
import { SUPPORT_PHONE_HREF, SUPPORT_PHONE_LABEL, SUPPORT_WA_LINK } from './siteContact';

export const DEFAULT_FOOTER = {
  logo: { mode: 'text' as const, main: 'Vangcur', sub: 'ভাঙচুর', img: null, alt: 'Vangcur Logo', height: 50 },
  desc: 'Vangcur - ভাঙচুর বাংলাদেশের একটি আধুনিক Gadget & Accessories ভিত্তিক E-commerce Brand। Official ও Unofficial সব ধরনের গ্যাজেট পাবেন Warranty Support সহ। সারা বাংলাদেশে Fast Home Delivery।',
  copy: '© 2026 Vangcur - ভাঙচুর. All rights reserved.',
  social: {
    fb: 'https://facebook.com/vangcurgadgets',
    ig: 'https://instagram.com/vangcurgadgets',
    tk: 'https://tiktok.com/@vangcur.com',
    wa: SUPPORT_WA_LINK,
    yt: 'https://youtube.com/@vangcurgadgets',
  },
  contact: {
    phoneLabel: SUPPORT_PHONE_LABEL,
    phoneHref: SUPPORT_PHONE_HREF,
    waHref: SUPPORT_WA_LINK,
    email: 'support@vangcur.com',
    fb: 'https://facebook.com/vangcurgadgets',
    addr: 'Dhaka, Bangladesh',
  },
};

export const DEFAULT_SERVICE_LINKS: ServiceLink[] = [
  { label: 'FAQ', action: 'faq' },
  { label: 'Shipping Info', action: 'info:shipping' },
  { label: 'Returns & Refunds', action: 'info:returns' },
  { label: 'Privacy Policy', action: 'info:privacy' },
  { label: 'Terms & Conditions', action: 'info:terms' },
];

export function resolveServiceLink(lnk: { url?: string; label?: string }): ServiceLink {
  const url = lnk.url || '#';
  const label = lnk.label || '';
  if (url.startsWith('#') || url === '') {
    const lower = url.toLowerCase();
    if (url === '#faqSec' || lower.includes('faq')) return { label, action: 'faq' };
    if (url === 'shipping' || url === '#shipping') return { label, action: 'info:shipping' };
    if (url === 'returns' || url === '#returns') return { label, action: 'info:returns' };
    if (url === 'privacy' || url === '#privacy') return { label, action: 'info:privacy' };
    if (url === 'terms' || url === '#terms') return { label, action: 'info:terms' };
    return { label, action: 'scroll', target: url };
  }
  return { label, action: 'external', href: sanitizeHref(url) };
}

export interface FooterSettingsRaw {
  vc_logo?: FooterLogo;
  vc_contact?: Partial<FooterContact> & { phone?: string; wa?: string; email?: string; fb?: string; addr?: string };
  vc_footer?: { desc?: string; copy?: string; fb?: string; ig?: string; tk?: string; yt?: string; wa?: string };
  vc_footer_links?: { url?: string; label?: string }[];
}
