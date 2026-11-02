'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import useHistoryModal from '@/lib/useHistoryModal';
import { useT } from '@/lib/i18n/useT';

interface PolicyModalProps {
  open: boolean;
  onClose: () => void;
  onAgreeAndConfirm: () => void;
}

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

function IconDocList() {
  return (
    <svg {...lineIcon} width="16" height="16" strokeWidth={2} className="text-white">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg {...lineIcon} width="15" height="15" strokeWidth={2} className="shrink-0 text-brand-light">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg {...lineIcon} width="15" height="15" strokeWidth={2} className="shrink-0 text-brand-light">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function IconVideoCamera() {
  return (
    <svg {...lineIcon} width="15" height="15" strokeWidth={2} className="shrink-0 text-brand-light">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <polygon points="22 7 16 12 22 17 22 7" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg {...lineIcon} width="15" height="15" strokeWidth={2} className="shrink-0 text-brand-light">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg {...lineIcon} width="15" height="15" strokeWidth={2} className="shrink-0 text-brand-light">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function IconAlertShield() {
  return (
    <svg {...lineIcon} width="15" height="15" strokeWidth={2} className="shrink-0 text-amber-700">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-[18px] border border-white/90 bg-white/85 p-4 sm:p-5 shadow-xs backdrop-blur-md">
      <h3 className="mb-2.5 flex items-center gap-2 font-body text-[14px] font-extrabold text-ink">
        {icon}
        <span>{title}</span>
      </h3>
      {children}
    </div>
  );
}

const pClass = 'mb-2 font-body text-[12.5px] sm:text-[13px] leading-[1.75] text-ink/85';
const ulClass = 'mb-2 list-none space-y-2 pl-0.5';
const liClass = 'flex items-start gap-2.5 font-body text-[12.5px] leading-[1.7] text-ink/85';

export default function PolicyModal({ open, onClose, onAgreeAndConfirm }: PolicyModalProps) {
  const { lang } = useT();

  useHistoryModal(open, onClose, 'policy-modal');

  useEffect(() => {
    if (open) lockBody();
    else unlockBody();
    return () => unlockBody();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeydown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9800] flex items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 bg-ink/55 backdrop-blur-[3px]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="sleek-scrollbar relative z-10 flex h-full min-h-dvh sm:min-h-0 sm:h-auto max-h-dvh sm:max-h-[92vh] w-full sm:max-w-[520px] flex-col overflow-y-auto sm:overflow-hidden rounded-none sm:rounded-[20px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white shadow-none sm:shadow-sh3 sm:ring-1 sm:ring-white/80"
          >
            <div className="sticky top-0 z-[20] flex shrink-0 items-center justify-between border-b border-ink/10 bg-white/95 px-5 sm:px-6 py-3.5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-light text-white shadow-xs">
                  <IconDocList />
                </span>
                <h3 className="font-body text-[16px] font-extrabold text-ink">
                  {lang === 'en' ? 'Terms & Policy Agreement' : 'নীতিমালা ও বিক্রয় শর্তাবলী'}
                </h3>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/80 text-ink/60 shadow-sh1 backdrop-blur-[8px] transition-colors hover:bg-white hover:text-ink focus-visible:outline-none"
                aria-label={lang === 'en' ? 'Close' : 'বন্ধ করুন'}
              >
                ✕
              </motion.button>
            </div>

            <div className="sleek-scrollbar relative flex-1 px-5 sm:px-6 pb-8 sm:pb-6 pt-4 sm:min-h-0 sm:overflow-y-auto">
              <HeaderDecor />

              <Section
                icon={<IconBox />}
                title={lang === 'en' ? '1. Order Terms & Verification' : '১. অর্ডার প্রদান ও ভেরিফিকেশন'}
              >
                <ul className={ulClass}>
                  <li className={liClass}>
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" />
                    <span>
                      {lang === 'en'
                        ? 'Ensure that your Full Name, 11-digit mobile number, district, detailed delivery address, and bKash transaction details are 100% accurate before confirming.'
                        : 'অর্ডার সম্পন্ন করার পূর্বে আপনার পূর্ণ নাম, ১১ ডিজিটের সচল মোবাইল নম্বর, জেলা, বিস্তারিত ঠিকানা এবং বিকাশ ট্রানজেকশন তথ্য সঠিকভাবে প্রদান করুন।'}
                    </span>
                  </li>
                  <li className={liClass}>
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" />
                    <span>
                      {lang === 'en'
                        ? 'Providing false or incomplete information gives Vangcur the complete right to cancel or hold the order to prevent fake bookings.'
                        : 'ভুল বা মিথ্যা তথ্য প্রদান করলে প্রতারণামূলক অর্ডার রোধে Vangcur কর্তৃপক্ষ উক্ত অর্ডার বাতিল করার পূর্ণ অধিকার রাখে।'}
                    </span>
                  </li>
                  <li className={liClass}>
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" />
                    <span>
                      {lang === 'en'
                        ? 'Orders are verified and handed over to courier logistics within 24 business hours.'
                        : 'অর্ডার কনফার্মেশনের ২৪ কার্যঘণ্টার মধ্যে পার্সেল কুরিয়ারে হস্তান্তর করা হয়।'}
                    </span>
                  </li>
                </ul>
              </Section>

              <Section
                icon={<IconTruck />}
                title={lang === 'en' ? '2. Closed-Box Home Delivery Protocol' : '২. ক্লোজড-বক্স ডেলিভারি নিয়মাবলী'}
              >
                <p className={pClass}>
                  {lang === 'en'
                    ? 'Vangcur operates closed-box home delivery across all 64 districts in Bangladesh via Pathao Courier:'
                    : 'Vangcur পাঠাও কুরিয়ারের মাধ্যমে সমগ্র বাংলাদেশে ক্লোজড-বক্স হোম ডেলিভারি পদ্ধতিতে পার্সেল সরবরাহ করে:'}
                </p>
                <ul className={ulClass}>
                  <li className={liClass}>
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" />
                    <span>
                      {lang === 'en'
                        ? 'Please pay the delivery agent the remaining Cash on Delivery (COD) balance first, then receive your parcel.'
                        : 'কুরিয়ার নিয়মানুযায়ী ডেলিভারিম্যানকে আগে অবশিষ্ট ক্যাশ অন ডেলিভারি টাকা পরিশোধ করে পার্সেল বুঝে নিন।'}
                    </span>
                  </li>
                  <li className={liClass}>
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" />
                    <span>
                      {lang === 'en'
                        ? 'Courier agents cannot approve returns on the spot for subjective dislike. Any genuine issue is handled through our free replacement policy.'
                        : 'ব্যক্তিগত অপছন্দের কারণে স্পটে ডেলিভারিম্যানের কাছে রিটার্ন দেওয়ার সুযোগ নেই; কোনো কারিগরি সমস্যা থাকলে তা ফ্রি রিপ্লেসমেন্টে সমাধান করা হয়।'}
                    </span>
                  </li>
                </ul>
              </Section>

              <Section
                icon={<IconVideoCamera />}
                title={lang === 'en' ? '3. Mandatory Unboxing Video Protocol' : '৩. আনবক্সিং ভিডিও নীতিমালা (বাধ্যতামূলক)'}
              >
                <p className={pClass}>
                  {lang === 'en'
                    ? 'To process any replacement claim securely, recording an uncut, continuous unboxing video is mandatory:'
                    : 'যেকোনো রিপ্লেসমেন্ট ক্লেইম দ্রুত সমাধান করতে পার্সেল খোলার সময় একটানা আনবক্সিং ভিডিও করা বাধ্যতামূলক:'}
                </p>
                <ul className={ulClass}>
                  <li className={liClass}>
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" />
                    <span>
                      {lang === 'en'
                        ? 'The video must start from the sealed courier package and continue in one continuous take without cuts, edits, or pauses.'
                        : 'ভিডিওটি সিলযুক্ত প্যাকেটের বাইরে থেকে শুরু করে ভেতরের সব পার্টস পর্যন্ত কোনো প্রকার কাট বা পজ ছাড়া একটানা রেকর্ড করতে হবে।'}
                    </span>
                  </li>
                  <li className={liClass}>
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" />
                    <span>
                      {lang === 'en'
                        ? 'For electronic devices, the video must demonstrate turning on the power or testing the device.'
                        : 'ইলেকট্রনিক পণ্যের ক্ষেত্রে ভিডিওতেই ডিভাইসটি পাওয়ার অন বা চার্জে দিয়ে টেস্ট করে দেখাতে হবে।'}
                    </span>
                  </li>
                </ul>

                <div className="my-3 flex items-start gap-2.5 rounded-[12px] border border-amber-300/80 bg-amber-50/90 p-3 text-left">
                  <IconAlertShield />
                  <span className="font-body text-[12px] font-bold leading-relaxed text-amber-950">
                    {lang === 'en'
                      ? 'Notice: As per e-commerce guidelines, no warranty, transit damage, or missing item claim can be processed without an uncut unboxing video.'
                      : 'সতর্কতা: একটানা আনবক্সিং ভিডিও প্রমাণ ছাড়া কোনো প্রকার ভাঙা বা ত্রুটিযুক্ত পণ্যের ওয়ারেন্টি বা রিপ্লেসমেন্ট ক্লেইম গ্রহণযোগ্য হবে না।'}
                  </span>
                </div>
              </Section>

              <Section
                icon={<IconShield />}
                title={lang === 'en' ? '4. Warranty & Replacement Policy' : '৪. ওয়ারেন্টি ও রিপ্লেসমেন্ট নীতিমালা'}
              >
                <ul className={ulClass}>
                  <li className={liClass}>
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" />
                    <span>
                      {lang === 'en'
                        ? 'Standard products carry a 1-week (7 days) replacement warranty. Selected items carry official coverage up to 6 months, 1 year, or 2 years.'
                        : 'সাধারণ পণ্যে ৭ দিনের ফ্রি রিপ্লেসমেন্ট ওয়ারেন্টি এবং নির্বাচিত প্রিমিয়াম পণ্যে ৬ মাস / ১ বছর / ২ বছর পর্যন্ত ওয়ারেন্টি সুবিধা রয়েছে।'}
                    </span>
                  </li>
                  <li className={liClass}>
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" />
                    <span>
                      {lang === 'en'
                        ? 'Genuine manufacturing defects and verified transit damages are replaced 100% free of charge with zero additional shipping fees.'
                        : 'ম্যানুফ্যাকচারিং ত্রুটি বা কুরিয়ারে পরিবহনকালীন ক্ষতির ক্ষেত্রে সম্পূর্ণ নিজ খরচে নতুন প্রোডাক্ট দিয়ে রিপ্লেস করে দেওয়া হবে।'}
                    </span>
                  </li>
                  <li className={liClass}>
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" />
                    <span>
                      {lang === 'en'
                        ? 'Exclusions: Physical breakage, accidental drops, burn marks, liquid/water damage, or unauthorized modifications are excluded.'
                        : 'হাত থেকে পড়ে ভাঙা, পোড়া দাগ, ওয়াটার ড্যামেজ কিংবা অনুমতি ছাড়া সার্ভিসিং করা পণ্যে কোনো ওয়ারেন্টি প্রযোজ্য নয়।'}
                    </span>
                  </li>
                </ul>

                <p className={`${pClass} font-bold text-ink mt-3`}>
                  {lang === 'en' ? 'Prerequisites for Claiming:' : 'ওয়ারেন্টি ক্লেইম করতে যা আবশ্যক:'}
                </p>
                <ul className={ulClass}>
                  <li className={liClass}>
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" />
                    <span>
                      {lang === 'en'
                        ? 'Original intact product box (damaged, taped, or torn boxes will void warranty).'
                        : 'মূল প্রোডাক্টের অক্ষত বক্স (ছেঁড়া বা অতিরিক্ত টেপ লাগানো বক্স গ্রহণযোগ্য নয়)।'}
                    </span>
                  </li>
                  <li className={liClass}>
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" />
                    <span>
                      {lang === 'en'
                        ? 'Original official paper invoice provided inside the parcel box.'
                        : 'পার্সেলের ভেতরে থাকা মূল অফিসিয়াল ইনভয়েস পেপার (সংরক্ষিত আসল কপি প্রদর্শন করতে হবে)।'}
                    </span>
                  </li>
                  <li className={liClass}>
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" />
                    <span>{lang === 'en' ? 'Continuous uncut unboxing video.' : 'একটানা ধারণকৃত আনবক্সিং ভিডিও প্রমাণ।'}</span>
                  </li>
                </ul>
              </Section>

              <Section
                icon={<IconRefresh />}
                title={lang === 'en' ? '5. Return & Refund Boundaries' : '৫. রিটার্ন ও রিফান্ড সংক্রান্ত নিয়ম'}
              >
                <p className={pClass}>
                  {lang === 'en'
                    ? 'No returns for subjective dislike / change of mind: Products cannot be returned, exchanged, or refunded simply due to personal preference where the item matches specifications and is free of defects.'
                    : 'পছন্দ না হওয়া বা মন পরিবর্তনের কারণে কোনো রিটার্ন নেই: Vangcur থেকে কেনাকাটার পর ব্যক্তিগত পছন্দ-অপছন্দ বা মন পরিবর্তনের (Change of Mind) কারণে পণ্য রিটার্ন বা রিফান্ডের কোনো সুযোগ নেই। যেকোনো জেনুইন সমস্যার ক্ষেত্রে আমরা সম্পূর্ণ ফ্রিতে নতুন প্রোডাক্ট রিপ্লেস করে দিই।'}
                </p>
              </Section>

              <div className="pt-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  onClick={onAgreeAndConfirm}
                  className="shimmer-sheen flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-info to-brand-light py-[13.5px] font-body text-[15px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03]"
                >
                  <IconCheck />
                  <span>
                    {lang === 'en' ? 'I Agree, Confirm Order' : 'ঠিক আছে, অর্ডার কনফার্ম করুন'}
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
