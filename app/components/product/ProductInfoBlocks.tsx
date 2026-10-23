'use client';

// প্রোডাক্ট ডিটেইল পেজের প্রথম-স্ক্রিনের যে অংশগুলো কার্ডের ডাটা (GRID_COLS) থেকেই পুরোপুরি বানানো যায়।
// আসল পেজ (ProductDetailClient) আর ক্লিকের সময় দেখানো প্রিভিউ (ProductDetailSkeleton) — দুজনেই
// এই একই কম্পোনেন্ট ব্যবহার করে, তাই মার্কআপ/মাপ/ফন্ট হুবহু এক; প্রিভিউ থেকে আসল ডাটায় বদলের সময়
// কোনো লাফ হয় না। এখানের মার্কআপ বদলালে দুই জায়গাতেই একসাথে বদলায়।
import { useT } from '@/lib/i18n/useT';
import { formatWarrantyLabel } from '@/lib/warrantyData';

export function ShieldIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/** ছবির উপরের কোণার ব্যাজ: স্টক শেষ হলে "Sold Out", নইলে প্রোডাক্টের ব্যাজ (যেমন HOT) — স্থির, অ্যানিমেশন নেই */
export function GalleryBadge({ sold, badge }: { sold: boolean; badge?: string }) {
  const { lang } = useT();
  if (sold) {
    return (
      <div className="absolute left-3.5 top-3.5 z-10 rounded-full bg-[#5A6578] px-3 py-1 font-body text-[11px] font-bold text-white shadow-xs">
        {lang === 'en' ? 'Sold Out' : 'স্টক শেষ'}
      </div>
    );
  }
  if (!badge) return null;
  return (
    <div className="absolute left-3.5 top-3.5 z-10 rounded-full bg-brand-light px-3 py-1 text-[11px] font-bold text-white shadow-sh1">
      {badge}
    </div>
  );
}

export function PriceRow({ price, old }: { price: number; old: number }) {
  const { lang } = useT();
  const discountPct = old && old > price ? Math.round((1 - price / old) * 100) : 0;
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span className="font-body text-[28px] font-bold text-brand-light sm:text-[32px]">৳{price.toLocaleString('en-US')}</span>
      {old > price && (
        <>
          <span className="text-[15px] text-muted line-through">৳{old.toLocaleString('en-US')}</span>
          {discountPct > 0 && (
            <span className="text-[13px] font-bold text-success">{lang === 'en' ? `${discountPct}% Off` : `${discountPct}% ছাড়`}</span>
          )}
        </>
      )}
    </div>
  );
}

export function StockLine({ stock }: { stock: number }) {
  const { t } = useT();
  return (
    <div className="mb-3 flex items-center gap-1.5 text-[12.5px] font-semibold">
      {stock <= 10 ? (
        <span className="text-brand-light">⚡ {t('মাত্র')} {stock}{t('টি বাকি — দ্রুত অর্ডার করুন')}</span>
      ) : (
        <span className="text-brand-light">{t('স্টকে আছে')} ({stock}{t('টি')})</span>
      )}
    </div>
  );
}

/** ওয়ারেন্টি ব্যানার। onClick না দিলে (প্রিভিউ) এটা শুধু দেখানোর জন্য, ফোকাস/ট্যাপযোগ্য নয়। */
export function WarrantyBanner({ warranty, onClick }: { warranty: string; onClick?: () => void }) {
  const { t, lang } = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={onClick ? undefined : -1}
      aria-hidden={onClick ? undefined : true}
      className="mb-5 flex w-full items-center justify-between gap-2 rounded-[10px] border border-success/30 bg-success/10 px-3.5 py-2.5 text-left transition-brand duration-brand hover:border-success/50"
    >
      <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-success">
        <ShieldIcon className="text-success" /> {formatWarrantyLabel(warranty, lang === 'en' ? 'en' : 'bn')}
      </span>
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-success/40 text-[10.5px] font-bold text-success"
        title={t('ওয়ারেন্টি বিস্তারিত')}
      >
        ?
      </span>
    </button>
  );
}
