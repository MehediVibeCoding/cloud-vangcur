'use client';

import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n/useT';
import { RippleLayer, rippleThen } from '@/lib/ripple';
import { markScrollRestore } from '@/lib/scrollMemory';
import { canGoBackInApp } from '@/lib/navBack';

export const policyPClass = 'mb-3 font-body text-[13.5px] sm:text-[14px] leading-[1.85] text-ink/85';
export const policyUlClass = 'mb-3 list-none space-y-2.5 pl-0.5';
export const policyLiClass = 'flex items-start gap-2.5 font-body text-[13px] sm:text-[13.5px] leading-[1.75] text-ink/85';
export const policySubheadingClass = 'mb-2 mt-4 font-body text-[14px] sm:text-[14.5px] font-bold text-ink';

function HeaderDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.14]" aria-hidden="true">
      <svg width="34" height="34" className="absolute -left-1 top-2 -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <svg width="26" height="26" className="absolute right-14 top-3 rotate-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2.5" width="10" height="15" rx="3" />
        <path d="M10 5.5h4" />
        <circle cx="12" cy="20" r="1.6" />
      </svg>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-light">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function PhoneCallIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-light shrink-0">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MailLetterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-light shrink-0">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-light shrink-0">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function WarningTriangleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700 shrink-0">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function PolicyBulletPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className={policyLiClass}>
      <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" />
      <div className="flex-1">{children}</div>
    </li>
  );
}

export function PolicyHeader({
  icon,
  title,
  subtitle,
  updated,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  updated: string;
}) {
  const router = useRouter();
  const { t, lang } = useT();

  const handleBack = (e: React.MouseEvent<HTMLElement>) => {
    rippleThen(e, () => {
      if (canGoBackInApp()) {
        // ব্যাচ ১৪: গন্তব্য পেজে সেভ করা স্ক্রল-পজিশন ফেরানোর অনুরোধ
        markScrollRestore();
        router.back();
      } else {
        router.push('/');
      }
    });
  };

  return (
    <div className="relative mb-6 overflow-hidden rounded-[24px] border border-white/80 bg-gradient-to-b from-brand-bg/40 via-[#DCEBFD]/50 to-white/90 p-5 sm:p-7 shadow-sh2 backdrop-blur-md">
      <HeaderDecor />

      <div className="relative z-10 mb-4 flex items-center justify-between border-b border-ink/10 pb-3.5">
        <button
          type="button"
          onClick={handleBack}
          aria-label={lang === 'en' ? 'Back' : 'ফিরে যান'}
          className="vc-press group relative before:absolute before:content-[''] before:-inset-y-[10px] before:-left-3 before:-right-1 md:before:hidden inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 py-1.5 pl-2.5 pr-4 font-body text-xs font-bold text-ink shadow-xs backdrop-blur-md hover:border-brand-light hover:bg-white hover:text-brand-light cursor-pointer"
        >
          <RippleLayer />
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-light text-white shadow-2xs transition-transform duration-brand group-hover:scale-105">
            <ArrowLeftIcon />
          </div>
          <span>{lang === 'en' ? 'Back' : 'ফিরে যান'}</span>
        </button>

        <span className="font-body text-[11px] font-semibold text-muted">
          {t('সর্বশেষ আপডেট:')} {t(updated)}
        </span>
      </div>

      <div className="relative z-10 flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-light/35 bg-white text-brand-light shadow-xs">
          {icon || <ShieldCheckIcon />}
        </div>
        <div>
          <h1 className="font-body text-xl sm:text-2xl font-extrabold text-ink leading-tight">
            {t(title)}
          </h1>
          <p className="mt-1 font-body text-[12px] font-bold text-brand-light">
            {subtitle ? t(subtitle) : (lang === 'en' ? 'Official Legal Coverage' : 'অফিসিয়াল পলিসি কভারেজ')}
          </p>
        </div>
      </div>
    </div>
  );
}

export function PolicySection({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const { t } = useT();
  return (
    <section className="relative mb-5 overflow-hidden rounded-[20px] border border-white/80 bg-white/85 p-5 sm:p-6 shadow-xs backdrop-blur-md">
      <div className="mb-3.5 flex items-center gap-2.5 border-b border-ink/10 pb-2.5">
        {icon && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-bg text-brand-light shadow-2xs">
            {icon}
          </span>
        )}
        <h2 className="font-body text-[15px] sm:text-[16px] font-extrabold text-ink leading-snug">
          {t(title)}
        </h2>
      </div>
      <div className="text-ink/85">{children}</div>
    </section>
  );
}

export function PolicyNote({
  children,
  type = 'warning',
}: {
  children: React.ReactNode;
  type?: 'warning' | 'info';
}) {
  const isInfo = type === 'info';
  return (
    <div
      className={`my-3.5 flex items-start gap-2.5 rounded-[14px] border p-3.5 text-left shadow-xs ${
        isInfo
          ? 'border-brand-light/35 bg-brand-bg/25 text-ink'
          : 'border-amber-300/80 bg-amber-50/90 text-amber-950'
      }`}
    >
      {!isInfo && <WarningTriangleIcon />}
      {isInfo && (
        <span className="mt-0.5 text-brand-light">
          <ShieldCheckIcon />
        </span>
      )}
      <div className="font-body text-[12px] sm:text-[12.5px] font-medium leading-[1.7]">
        {children}
      </div>
    </div>
  );
}

export function PolicyContact() {
  const { t, lang } = useT();
  return (
    <PolicySection
      icon={<PhoneCallIcon />}
      title={lang === 'en' ? 'Legal & Customer Support Inquiries' : 'আইনি ও গ্রাহক সহায়তা যোগাযোগ'}
    >
      <p className={policyPClass}>
        {lang === 'en'
          ? 'For any queries, warranty verifications, or clarifications regarding our operating policies, please contact our authorized support desk:'
          : 'আমাদের যেকোনো পরিচালনা নীতিমালা, ওয়ারেন্টি যাচাই বা আদেশের শর্তাবলী সম্পর্কে তথ্যের জন্য সরাসরি আমাদের অফিসিয়াল সাপোর্টে যোগাযোগ করুন:'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <a
          href="tel:01897804055"
          className="flex items-center gap-2.5 rounded-[12px] border border-border-base bg-white/80 p-3 font-body text-[12.5px] font-bold text-ink transition-colors hover:border-brand-light hover:bg-white"
        >
          <PhoneCallIcon />
          <span>01897-804055 (WhatsApp / Call)</span>
        </a>

        <a
          href="mailto:support@vangcur.com"
          className="flex items-center gap-2.5 rounded-[12px] border border-border-base bg-white/80 p-3 font-body text-[12.5px] font-bold text-ink transition-colors hover:border-brand-light hover:bg-white"
        >
          <MailLetterIcon />
          <span>support@vangcur.com</span>
        </a>
      </div>

      <div className="mt-2.5 flex items-center gap-2 rounded-[12px] border border-border-base bg-white/60 p-3 font-body text-[12px] text-muted">
        <MapPinIcon />
        <span>{lang === 'en' ? 'Official Hub: Dhaka, Bangladesh' : 'অফিসিয়াল হাব: ঢাকা, বাংলাদেশ (সমগ্র দেশে কুরিয়ার পরিষেবা)'}</span>
      </div>
    </PolicySection>
  );
}
