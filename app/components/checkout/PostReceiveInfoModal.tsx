'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import useHistoryModal from '@/lib/useHistoryModal';
import { useT } from '@/lib/i18n/useT';

const CHECKLIST_BN = [
  'প্রোডাক্ট পাওয়ার সাথে সাথে উপর থেকে একটানা আনবক্সিং ভিডিও করুন',
  'ভিডিওতে কোনো কাট বা পজ দেওয়া যাবে না',
  'কুরিয়ারে প্রোডাক্ট ভাঙলে বা ত্রুটি থাকলে এই ভিডিও দিয়ে ওয়ারেন্টি ক্লেইম করুন',
  'প্রোডাক্ট মিসিং বা ভুল গেলে সম্পূর্ণ দায়ভার আমাদের',
];

const CHECKLIST_EN = [
  'Record a continuous unboxing video from above as soon as you receive the product',
  'The video must not contain any cuts or pauses',
  'Use this video to claim warranty if the product is damaged in transit or defective',
  'We take full responsibility if any product is missing or sent incorrectly',
];

const IMPORTANT_NOTES_BN = [
  'আনবক্সিং প্রমাণ ছাড়া কোনো ওয়ারেন্টি ক্লেইম গ্রহণযোগ্য নয়',
  'ওয়ারেন্টিযুক্ত প্রোডাক্টের অরিজিনাল বক্স ও ইনভয়েস পেপার সংরক্ষণ করুন',
];

const IMPORTANT_NOTES_EN = [
  'No warranty or replacement claim is accepted without continuous unboxing video proof',
  'Please preserve the original product box and invoice paper for warranty coverage',
];

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

function IconVideoBadge() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-light">
      <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
      <path d="M15.5 10.2 21 7v10l-5.5-3.2" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconWarningShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-600">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconCheckBadgeSolid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="shrink-0">
      <path d="M12 2 3 6v6c0 5.2 3.8 9.7 9 11 5.2-1.3 9-5.8 9-11V6l-9-4Zm-1.1 14.4-3.9-3.9 1.4-1.4 2.5 2.5 5.3-5.3 1.4 1.4-6.7 6.7Z" />
    </svg>
  );
}

export default function PostReceiveInfoModal() {
  const [open, setOpen] = useState(false);
  const { lang } = useT();
  const pathname = usePathname();

  const close = useCallback(() => setOpen(false), []);
  useHistoryModal(open, close, 'post-receive-info-modal');

  // ইনভয়েস পেজ থেকে "ফিরে যান"-এ ক্লিক করলে হোমে (pathname === '/') আসার পরই এই effect চলে —
  // router.replace('/') এখনো শেষ না হতেই যদি এই মডাল আগেভাগে খুলে হিস্ট্রিতে push করে ফেলত,
  // তাহলে পরে "বুঝেছি"-তে ক্লিক করলে history.back() ভুলভাবে সরাসরি ইনভয়েস পেজে ফিরে যেত এবং
  // ইনভয়েস আবার অটো-ডাউনলোড হয়ে যেত। pathname-ভিত্তিক চেক নিশ্চিত করে যে নেভিগেশন পুরোপুরি
  // শেষ হওয়ার পরই মডালটা খোলে, তাই হিস্ট্রি স্ট্যাক ঠিকভাবে সাজানো থাকে।
  useEffect(() => {
    if (pathname !== '/') return undefined;
    try {
      if (typeof window === 'undefined' || sessionStorage.getItem('vc_show_post_receive_after_invoice') !== '1') {
        return undefined;
      }
      sessionStorage.removeItem('vc_show_post_receive_after_invoice');
    } catch {
      return undefined;
    }
    const timer = setTimeout(() => setOpen(true), 350);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (open) lockBody();
    else unlockBody();
    return () => unlockBody();
  }, [open]);

  if (!open) return null;

  const checklist = lang === 'en' ? CHECKLIST_EN : CHECKLIST_BN;
  const importantNotes = lang === 'en' ? IMPORTANT_NOTES_EN : IMPORTANT_NOTES_BN;

  return (
    <>
      <div
        className="fixed inset-0 z-[1210] bg-ink/55 backdrop-blur-[3px] transition-opacity duration-brand"
        onClick={close}
      />

      <div className="fixed inset-0 z-[1215] flex items-center justify-center p-4">
        <div className="no-scrollbar relative w-full max-w-[440px] max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-[28px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white p-6 sm:p-7 text-center shadow-sh3 ring-1 ring-white/80 animate-section-reveal">
          <HeaderDecor />

          <div className="relative z-10 mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-full border border-brand-light/40 bg-brand-bg/60 shadow-[0_4px_20px_rgba(68,167,252,0.22)]">
            <IconVideoBadge />
          </div>

          <h2 className="relative z-10 mb-1.5 font-body text-xl font-extrabold text-ink">
            {lang === 'en' ? 'Important: What to do After Delivery' : 'প্রোডাক্ট পাওয়ার পর করণীয়'}
          </h2>

          <p className="relative z-10 mb-5 font-body text-[13px] leading-relaxed text-ink/80">
            {lang === 'en'
              ? 'To claim warranty or replacements seamlessly, please follow these essential instructions.'
              : 'ওয়ারেন্টি ক্লেইম নির্বিঘ্নে করতে নিচের নিয়মগুলো অবশ্যই মেনে চলুন।'}
          </p>

          <div className="relative z-10 mb-4 rounded-[12px] border border-white/90 bg-white/75 p-3.5 text-left shadow-xs backdrop-blur-md">
            <div className="mb-3 flex items-center gap-1.5 font-body text-[11px] font-bold uppercase tracking-wider text-brand-light">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-light" />
              {lang === 'en' ? 'Record Unboxing Video' : 'আনবক্সিং ভিডিও করুন'}
            </div>
            <ul className="list-none space-y-2.5">
              {checklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100 text-emerald-700 shadow-xs">
                    <IconCheck />
                  </span>
                  <span className="font-body text-[12.5px] leading-[1.6] text-ink/85">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mb-5 rounded-[10px] border border-amber-200/80 bg-amber-50/90 p-3.5 text-left shadow-xs">
            <div className="mb-2 flex items-center gap-2">
              <IconWarningShield />
              <span className="font-body text-[12.5px] font-bold text-amber-900">
                {lang === 'en' ? 'Important Notice' : 'গুরুত্বপূর্ণ'}
              </span>
            </div>
            <ul className="list-none space-y-1.5">
              {importantNotes.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-[6px] block h-[5px] w-[5px] shrink-0 rounded-full bg-amber-600" />
                  <span className="font-body text-[11.5px] leading-[1.65] text-amber-900/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            onClick={close}
            className="relative z-10 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-info to-brand-light py-[13.5px] font-body text-[14.5px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03]"
          >
            <IconCheckBadgeSolid />
            <span>{lang === 'en' ? 'Understood' : 'বুঝেছি, মনে রাখব'}</span>
          </motion.button>
        </div>
      </div>
    </>
  );
}
