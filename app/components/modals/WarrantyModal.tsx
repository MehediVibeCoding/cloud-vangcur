'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { getWarrantyModalContent, formatWarrantyLabel } from '@/lib/warrantyData';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import { useT } from '@/lib/i18n/useT';
import useHistoryModal, { suppressHistoryCleanup } from '@/lib/useHistoryModal';

interface WarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  warrantyText?: string;
}

const lineIcon = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function ShieldSecurityIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

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

function ArrowLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17l9.2-9.2M17 17V8H8" />
    </svg>
  );
}

function WarningShieldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-700">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function WorkflowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-light">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}

export default function WarrantyModal({ isOpen, onClose, warrantyText }: WarrantyModalProps) {
  const { t, lang } = useT();
  const router = useRouter();
  const rawContent = useMemo(() => getWarrantyModalContent(warrantyText, lang === 'en' ? 'en' : 'bn'), [warrantyText, lang]);

  const content = useMemo(() => {
    let title = t(rawContent.title);
    let body = t(rawContent.body);

    if (lang === 'bn') {
      title = title
        .replace(/১ সপ্তাহ \(৭ দিন\)/g, '7 দিন (1 সপ্তাহ)')
        .replace(/৬ মাস/g, '6 মাস')
        .replace(/১ বছর \(১২ মাস\)/g, '1 বছর (12 মাস)')
        .replace(/২ বছর \(২৪ মাস\)/g, '2 বছর (24 মাস)');

      body = body
        .replace(/৭ দিন/g, '7 দিন')
        .replace(/১৮০ দিন \(৬ মাস\)/g, '180 দিন (6 মাস)')
        .replace(/৩৬৫ দিন/g, '365 দিন')
        .replace(/১ বছর/g, '1 বছর')
        .replace(/২ বছর/g, '2 বছর');
    }

    return { title, body };
  }, [rawContent, t, lang]);

  useHistoryModal(isOpen, onClose, 'warranty-modal');

  useEffect(() => {
    if (isOpen) {
      lockBody();
      router.prefetch('/warranty');
    } else {
      unlockBody();
    }
    return () => unlockBody();
  }, [isOpen, router]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [isOpen, onClose]);

  const handleNavigateToWarranty = (e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
    setTimeout(() => {
      // মডাল বন্ধ হওয়ার deferred cleanup (setTimeout(...,0)) এই push-এর
      // আগেই ফায়ার হয়ে গেছে, কিন্তু নিশ্চিত হতে push-এর ঠিক আগে আবার
      // suppress করা হচ্ছে — যদি এর মধ্যে অন্য কোনো মডাল স্লট নিয়ে থাকে।
      suppressHistoryCleanup();
      router.push('/warranty');
    }, 120);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1205] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 bg-ink/55 backdrop-blur-[3px]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white shadow-sh3 ring-1 ring-white/80"
          >
            <div className="relative shrink-0 overflow-hidden border-b border-ink/10 px-6 pb-3.5 pt-5 text-left">
              <HeaderDecor />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-white shadow-xs">
                    <ShieldSecurityIcon />
                  </span>
                  <div>
                    <h3 className="font-body text-[17px] font-extrabold text-ink leading-tight">
                      {lang === 'en' ? 'Official Warranty Coverage' : 'অফিসিয়াল ওয়ারেন্টি নীতিমালা'}
                    </h3>
                    <p className="font-body text-[12px] font-bold text-brand-light">
                      {formatWarrantyLabel(warrantyText, lang === 'en' ? 'en' : 'bn') || (lang === 'en' ? 'Brand Replacement Guarantee' : 'ব্র্যান্ড রিপ্লেসমেন্ট গ্যারান্টি')}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/80 text-ink/60 shadow-sh1 backdrop-blur-[8px] transition-colors hover:bg-white hover:text-ink focus-visible:outline-none"
                  aria-label={t('বন্ধ করুন')}
                >
                  ✕
                </motion.button>
              </div>
            </div>

            <div className="sleek-scrollbar flex-1 overflow-y-auto px-6 pb-4 pt-4 space-y-3.5">
              <div className="rounded-[16px] border border-white/90 bg-white/85 p-4 shadow-xs backdrop-blur-md">
                <h4 className="font-body text-[15px] font-bold text-ink leading-snug">
                  {content.title}
                </h4>
                <p className="mt-1.5 font-body text-[12.5px] leading-relaxed text-ink/80">
                  {content.body}
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 rounded-[14px] border border-white/80 bg-white/75 p-3 shadow-xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-light font-body font-bold text-[11px] text-white shadow-2xs">
                    1
                  </span>
                  <div className="font-body text-[12.5px] leading-[1.65] text-ink/85">
                    <strong>{lang === 'en' ? 'Unboxing Video Proof: ' : 'আনবক্সিং ভিডিও প্রমাণ: '}</strong>
                    {lang === 'en'
                      ? 'A continuous, uncut unboxing video recorded from the sealed parcel opening is mandatory for any warranty or replacement claim.'
                      : 'কুরিয়ার থেকে পার্সেল বুঝে নেওয়ার সময় প্যাকেটের বাইরে থেকে শুরু করে একটানা আন-কাট আনবক্সিং ভিডিও প্রমাণ হিসেবে সংরক্ষণ করতে হবে।'}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[14px] border border-white/80 bg-white/75 p-3 shadow-xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-light font-body font-bold text-[11px] text-white shadow-2xs">
                    2
                  </span>
                  <div className="font-body text-[12.5px] leading-[1.65] text-ink/85">
                    <strong>{lang === 'en' ? 'Packaging & Physical Invoice: ' : 'বক্স ও ইনভয়েস পেপার: '}</strong>
                    {lang === 'en'
                      ? 'The original product box, accessories, and the official clean paper invoice provided inside the parcel must be preserved and submitted during the claim.'
                      : 'ক্লেইম করার সময় প্রোডাক্টের অরিজিনাল বক্স, এক্সেসরিজ এবং পার্সেলের ভেতরে থাকা মূল অফিসিয়াল ইনভয়েস পেপার অক্ষত অবস্থায় জমা দিতে হবে।'}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[14px] border border-white/80 bg-white/75 p-3 shadow-xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-light font-body font-bold text-[11px] text-white shadow-2xs">
                    3
                  </span>
                  <div className="font-body text-[12.5px] leading-[1.65] text-ink/85">
                    <strong>{lang === 'en' ? 'Free Replacement: ' : '১০০% ফ্রি রিপ্লেসমেন্ট: '}</strong>
                    {lang === 'en'
                      ? 'Free replacement is provided for manufacturing defects or internal technical issues with zero additional logistics fees.'
                      : 'ম্যানুফ্যাকচারিং ত্রুটি বা অভ্যন্তরীণ টেকনিক্যাল সমস্যার ক্ষেত্রে সম্পূর্ণ ফ্রিতে নতুন প্রোডাক্ট রিপ্লেসমেন্ট প্রদান করা হবে।'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-[14px] border border-amber-300/80 bg-amber-50/90 p-3 shadow-xs text-left">
                <WarningShieldIcon />
                <div className="font-body text-[11.5px] leading-[1.65] text-amber-950">
                  <strong>{lang === 'en' ? 'Exclusions: ' : 'ওয়ারেন্টি বহির্ভূত: '}</strong>
                  {lang === 'en'
                    ? 'Physical breakage, accidental drops, burn marks, liquid/water damage, or unauthorized repairs are strictly excluded from warranty coverage.'
                    : 'হাত থেকে পড়ে ভাঙা, পোড়া দাগ, ওয়াটার ড্যামেজ, উচ্চ ভোল্টেজের শর্টসার্কিট কিংবা অনুমতি ছাড়া সার্ভিসিং করা পণ্যে ওয়ারেন্টি প্রযোজ্য নয়।'}
                </div>
              </div>

              <div className="rounded-[14px] border border-brand-light/35 bg-white/85 p-3 shadow-xs backdrop-blur-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-body text-[12px] text-ink/80">
                    <WorkflowIcon />
                    <span>
                      {lang === 'en'
                        ? 'Want to read full warranty terms?'
                        : 'ওয়ারেন্টির বিস্তারিত আইনি নীতিমালা দেখতে চান?'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleNavigateToWarranty}
                    className="inline-flex shrink-0 items-center gap-1 font-body text-[12px] font-extrabold text-brand-light transition-colors hover:text-brand-light-hover hover:underline cursor-pointer"
                  >
                    <span>{lang === 'en' ? 'Warranty Policy' : 'ওয়ারেন্টি নীতিমালা দেখুন'}</span>
                    <ArrowLinkIcon />
                  </button>
                </div>
              </div>
            </div>

            <div className="shrink-0 px-6 pb-6 pt-2">
              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                onClick={onClose}
                className="w-full rounded-full bg-gradient-to-r from-info to-brand-light py-[13px] font-body text-[14.5px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03] focus-visible:outline-none"
              >
                {lang === 'en' ? 'Got It' : 'বুঝেছি'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
