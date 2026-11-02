'use client';

import Link from 'next/link';
import VangcurLogoMark from '@/app/components/ui/VangcurLogoMark';
import { useT } from '@/lib/i18n/useT';
import { DesktopBackdrop } from '@/app/components/ui/DesktopBackdrop';

const lineIcon = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function HeaderDecor() {
  const deco = { ...lineIcon, strokeWidth: 1.4 };
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.14]" aria-hidden="true">
      <svg {...deco} width="34" height="34" className="absolute -left-1 top-2 -rotate-12" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <svg {...deco} width="26" height="26" className="absolute right-14 top-3 rotate-6" viewBox="0 0 24 24">
        <rect x="7" y="2.5" width="10" height="15" rx="3" />
        <path d="M10 5.5h4" />
        <circle cx="12" cy="20" r="1.6" />
      </svg>
    </div>
  );
}

function CompassAlertIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-light">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function HomeSvgIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function SearchSvgIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function NotFound() {
  const { lang } = useT();

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-brand-bg/35 via-[#DCEBFD]/45 to-white flex flex-col items-center justify-center p-4 lg:bg-none">
      {/* 💻 শুধু ল্যাপটপ: ফিক্সড প্রিমিয়াম ব্যাকগ্রাউন্ড */}
      <DesktopBackdrop />

      <div className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-[28px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white p-6 sm:p-8 text-center shadow-sh3 ring-1 ring-white/80 animate-section-reveal lg:shadow-[0_0_0_6px_#fff,0_0_0_7px_rgba(68,167,252,0.16),0_30px_70px_-24px_rgba(0,88,199,0.32)] dark:lg:shadow-[0_0_0_6px_rgba(255,255,255,0.07),0_0_0_7px_rgba(68,167,252,0.14),0_30px_70px_-24px_rgba(0,0,0,0.6)] lg:ring-0">
        <HeaderDecor />

        <div className="relative z-10 mx-auto mb-4 flex justify-center">
          <Link prefetch={false} href="/" className="inline-block">
            <VangcurLogoMark
              aria-label="Vangcur Gadgets"
              className="h-8 w-auto select-none text-brand-light"
            />
          </Link>
        </div>

        <div className="relative z-10 mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-full border border-brand-light/40 bg-white text-brand-light shadow-xs">
          <CompassAlertIcon />
        </div>

        <div className="relative z-10 mb-1 font-body text-[32px] sm:text-[36px] font-extrabold tracking-tight text-brand-light leading-none">
          404
        </div>

        <h1 className="relative z-10 mb-2 font-body text-lg sm:text-xl font-extrabold text-ink">
          {lang === 'en' ? 'Page Not Found' : 'পেজটি খুঁজে পাওয়া যায়নি'}
        </h1>

        <p className="relative z-10 mb-6 font-body text-[12.5px] sm:text-[13px] leading-relaxed text-ink/80">
          {lang === 'en'
            ? 'Sorry, the link you clicked might be outdated, the product may have been moved, or the address was typed incorrectly.'
            : 'দুঃখিত, আপনি যে লিংকটি খুঁজছেন তা হয়তো সরানো হয়েছে, প্রোডাক্টের লিংক পরিবর্তিত হয়েছে অথবা টাইপো হয়েছে।'}
        </p>

        <div className="relative z-10 flex flex-col gap-2.5">
          <Link prefetch={false}
            href="/"
            className="shimmer-sheen flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-info to-brand-light py-[13px] font-body text-[14.5px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03] active:scale-95 no-underline"
          >
            <HomeSvgIcon />
            <span>{lang === 'en' ? 'Back to Homepage' : 'হোমপেজে ফিরে যান'}</span>
          </Link>

          <Link prefetch={false}
            href="/search"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border-base bg-white/85 py-[12px] font-body text-[13.5px] font-bold text-ink shadow-xs transition-colors hover:border-brand-light hover:bg-white active:scale-95 no-underline"
          >
            <SearchSvgIcon />
            <span>{lang === 'en' ? 'Search Products' : 'পণ্য খুঁজুন'}</span>
          </Link>
        </div>

        <div className="relative z-10 mt-6 border-t border-ink/10 pt-3.5 font-body text-[11px] text-muted">
          <span>{lang === 'en' ? 'Need help? Contact support on WhatsApp: 01897-804055' : 'সহায়তা প্রয়োজন? WhatsApp করুন: 01897-804055'}</span>
        </div>
      </div>
    </div>
  );
        }
