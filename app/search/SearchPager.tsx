'use client';

// ফাইলের পাথ: app/search/SearchPager.tsx
// [NEW] সার্চ রেজাল্টের নাম্বার পেজিনেশন (১ ২ ৩ … পরের) — /products পেজের পেজিনেশনের হুবহু একই ডিজাইন।
// সার্চ ফলাফল ব্রাউজারে ইন-মেমোরি থাকে, তাই এখানে Link নয়, বাটন: ক্লিকে সাথে সাথে পেজ বদলায় (নেটওয়ার্ক ছাড়া)।

import { useT } from '@/lib/i18n/useT';

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

// অনেক পেজ হলে (…) দিয়ে সংক্ষিপ্ত — সবসময় প্রথম/শেষ/বর্তমান ও তার আশেপাশের দুটো
export function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | 'ellipsis')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('ellipsis');
    out.push(p);
  });
  return out;
}

// সরু ফোনেও এক সারিতে ধরার জন্য ≤৪০০px-এ বাটন একটু ছোট
const btn = 'flex h-9 min-w-9 items-center justify-center rounded-full border border-border-base/70 bg-white/80 px-2.5 font-body text-[13px] font-bold text-ink shadow-2xs transition-colors duration-150 hover:border-brand-light hover:bg-brand-bg/40 max-[400px]:h-8 max-[400px]:min-w-8 max-[400px]:px-2 cursor-pointer';
const btnOff = 'flex h-9 min-w-9 items-center justify-center rounded-full border border-border-base/40 bg-surface-muted px-2.5 text-muted/50 cursor-not-allowed max-[400px]:h-8 max-[400px]:min-w-8 max-[400px]:px-2';
const btnOn = 'flex h-9 min-w-9 items-center justify-center rounded-full bg-gradient-to-r from-info to-brand-light px-2.5 font-body text-[13px] font-bold text-white shadow-sh1 max-[400px]:h-8 max-[400px]:min-w-8 max-[400px]:px-2';

export default function SearchPager({
  page, totalPages, onChange,
}: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const { lang } = useT();
  if (totalPages <= 1) return null;
  const nums = getPageNumbers(page, totalPages);
  const fmt = (n: number) => String(n); // /products পেজের মতোই ইংরেজি অঙ্ক

  return (
    <nav aria-label="Pagination" className="mt-9 flex flex-wrap items-center justify-center gap-1.5 max-[400px]:gap-1">
      {page > 1 ? (
        <button type="button" className={btn} onClick={() => onChange(page - 1)} aria-label={lang === 'en' ? 'Previous page' : 'আগের পেজ'}>
          <ChevronLeftIcon />
        </button>
      ) : (
        <span className={btnOff}><ChevronLeftIcon /></span>
      )}

      {nums.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e${i}`} className="flex h-9 min-w-6 items-center justify-center text-[13px] text-muted max-[400px]:h-8">…</span>
        ) : p === page ? (
          <span key={p} className={btnOn} aria-current="page">{fmt(p)}</span>
        ) : (
          <button type="button" key={p} className={btn} onClick={() => onChange(p)}>{fmt(p)}</button>
        ),
      )}

      {page < totalPages ? (
        <button type="button" className={btn} onClick={() => onChange(page + 1)} aria-label={lang === 'en' ? 'Next page' : 'পরের পেজ'}>
          <ChevronRightIcon />
        </button>
      ) : (
        <span className={btnOff}><ChevronRightIcon /></span>
      )}
    </nav>
  );
}
