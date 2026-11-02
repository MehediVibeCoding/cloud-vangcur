'use client';

import { useT } from '@/lib/i18n/useT';

function CheckIconSvg({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 12.5 9.5 18 20 6" />
    </svg>
  );
}

// 🔵 Vangcur টিম/মডারেটরদের জন্য — শুধুমাত্র is_admin ইউজাররাই পান
export function TeamVerifiedBadge() {
  const { t } = useT();
  return (
    <span
      title={t('ভাঙচুর টিম ভেরিফিকেশন ব্যাজ')}
      className="inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-brand-light text-white shadow-xs"
    >
      <CheckIconSvg />
    </span>
  );
}

// 🟢 কাস্টমারের জন্য — যাদের প্রোফাইল (নাম+ফোন+জেলা+ঠিকানা) সম্পূর্ণ, তারাই পান।
// টিমের নীল ব্যাজ থেকে আলাদা রঙে যাতে দুটো গুলিয়ে না যায়।
export function VerifiedCustomerBadge() {
  const { t } = useT();
  return (
    <span
      title={t('প্রোফাইল ভেরিফায়েড কাস্টমার')}
      className="inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs"
    >
      <CheckIconSvg />
    </span>
  );
}
