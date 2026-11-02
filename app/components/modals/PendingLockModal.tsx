'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import { OPEN_PENDING_LOCK_EVENT } from '@/lib/uiEvents';
import { PENDING_LOCK_MS, PENDING_VERIFY_WINDOW_MS, type PendingLockDetail } from '@/lib/pendingLock';
import useHistoryModal from '@/lib/useHistoryModal';
import { useT } from '@/lib/i18n/useT';

const lineIcon = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toBnDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

function HeaderDecor() {
  const deco = { ...lineIcon, strokeWidth: 1.4 };
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.14]" aria-hidden="true">
      <svg {...deco} width="34" height="34" className="absolute -left-1 top-2 -rotate-12" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <svg {...deco} width="26" height="26" className="absolute right-4 top-3 rotate-6" viewBox="0 0 24 24">
        <rect x="7" y="2.5" width="10" height="15" rx="3" />
        <path d="M10 5.5h4" />
        <circle cx="12" cy="20" r="1.6" />
      </svg>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg {...lineIcon} width="32" height="32" strokeWidth="1.9">
      <circle cx="12" cy="12" r="9.5" />
      <polyline points="12 6.5 12 12 15.5 14" />
    </svg>
  );
}

export default function PendingLockModal() {
  const { lang } = useT();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<PendingLockDetail | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useHistoryModal(open, close, 'pending-lock-modal');

  useEffect(() => {
    const onTrigger = (e: Event) => {
      const d = (e as CustomEvent<PendingLockDetail>).detail;
      if (!d) return;
      const t = Date.now();
      setDetail(d);
      setStartedAt(t - Math.max(0, d.ageSeconds) * 1000);
      setNow(t);
      setOpen(true);
    };
    window.addEventListener(OPEN_PENDING_LOCK_EVENT, onTrigger);
    return () => window.removeEventListener(OPEN_PENDING_LOCK_EVENT, onTrigger);
  }, []);

  useEffect(() => {
    if (open) lockBody();
    else unlockBody();
    return () => unlockBody();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

  if (!open || !detail) return null;

  const ageMs = Math.max(0, now - startedAt);
  const remainingMs = Math.max(0, PENDING_LOCK_MS - ageMs);
  const remainingMin = Math.max(1, Math.ceil(remainingMs / 60000));
  const released = remainingMs <= 0;
  const inFastTrack = ageMs < PENDING_VERIFY_WINDOW_MS;
  const num = lang === 'en' ? String(remainingMin) : toBnDigits(remainingMin);

  let title: string;
  let body: string;
  if (released) {
    title = lang === 'en' ? 'You can order now' : 'এখন অর্ডার করতে পারবেন';
    body = lang === 'en'
      ? 'The waiting time is over. Please try placing your new order again.'
      : 'অপেক্ষার সময় শেষ হয়েছে। অনুগ্রহ করে আপনার নতুন অর্ডারটি আবার করুন।';
  } else if (inFastTrack) {
    title = lang === 'en' ? 'Payment is being verified' : 'পেমেন্ট যাচাই চলছে';
    body = lang === 'en'
      ? `Your previous order (${detail.orderNum}) payment is being verified. Please wait a moment.`
      : `আপনার পূর্বের অর্ডারটির (${detail.orderNum}) পেমেন্ট যাচাই করা হচ্ছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।`;
  } else {
    title = lang === 'en' ? 'Your order is being verified' : 'আপনার অর্ডারটি যাচাই চলছে';
    body = lang === 'en'
      ? `Your order ${detail.orderNum} is being verified, so a new order cannot be placed right now. You will be able to place another order in ${num} min.`
      : `আপনার ${detail.orderNum} অর্ডারটি বর্তমানে যাচাই করা হচ্ছে। আপনি এখন নতুন অর্ডার করতে পারবেন না, তবে আর ${num} মিনিট পর আপনি চাইলে আরও একটি নতুন অর্ডার করতে পারবেন।`;
  }

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-ink/55 p-4 backdrop-blur-[3px]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="vc-pending-lock-title"
        className="relative w-full max-w-[400px] overflow-hidden rounded-[28px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white p-6 text-center shadow-sh3 ring-1 ring-white/80 animate-section-reveal"
      >
        <HeaderDecor />

        <div className="relative z-10 mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-full border border-amber-200/80 bg-amber-50 text-amber-600 shadow-xs">
          <ClockIcon />
        </div>

        <h3 id="vc-pending-lock-title" className="relative z-10 font-body text-[17px] font-extrabold text-ink">
          {title}
        </h3>

        <p className="relative z-10 mt-2 font-body text-[13px] leading-relaxed text-ink/80">
          {body}
        </p>

        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          onClick={close}
          className="relative z-10 mt-5 w-full rounded-full bg-gradient-to-r from-info to-brand-light py-[13px] font-body text-[14px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03]"
        >
          {lang === 'en' ? 'Got it' : 'বুঝেছি'}
        </motion.button>
      </div>
    </div>
  );
}
