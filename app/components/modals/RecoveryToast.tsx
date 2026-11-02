'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { usePathname, useRouter } from 'next/navigation';
import {
  eligibleDraft,
  markDraftDismissed,
  recordDraftImpression,
  type CheckoutDraft,
} from '@/lib/draftRecovery';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { hasExceededLocalOrderLimit } from '@/lib/productData';
import useHistoryModal, { suppressHistoryCleanup } from '@/lib/useHistoryModal';
import { useT } from '@/lib/i18n/useT';

const DISMISS_KEY = 'vc_recovery_dismissed';
const DISMISS_TIME_KEY = 'vc_toast_dismiss_time';
const HOMEPAGE_INITIAL_DELAY_MS = 5000;

function HeaderDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.14]" aria-hidden="true">
      <svg width="34" height="34" className="absolute -left-1 top-2 -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 13a8 8 0 0 1 16 0" />
        <rect x="3" y="13" width="4" height="6" rx="1.5" />
        <rect x="17" y="13" width="4" height="6" rx="1.5" />
      </svg>
      <svg width="26" height="26" className="absolute right-12 top-3 rotate-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2.5" width="10" height="15" rx="3" />
        <path d="M10 5.5h4" />
        <circle cx="12" cy="20" r="1.6" />
      </svg>
    </div>
  );
}

function ItemThumbnail({ imgVal }: { imgVal?: string }) {
  const isUrl = typeof imgVal === 'string' && (imgVal.startsWith('http://') || imgVal.startsWith('https://'));
  if (isUrl) {
    return (
      <img
        src={optimizeCloudinaryUrl(imgVal, 140)}
        alt="Product"
        className="h-12 w-12 shrink-0 rounded-xl border border-white/90 bg-white object-cover object-top shadow-xs"
        loading="lazy"
        decoding="async"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/90 bg-brand-bg/50 text-brand-light shadow-xs">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 9.4 7.55 4.24a1.8 1.8 0 0 0-1.8 0L2.5 6.1a1.8 1.8 0 0 0-.9 1.56v8.68a1.8 1.8 0 0 0 .9 1.56l3.25 1.86a1.8 1.8 0 0 0 1.8 0l8.95-5.16a1.8 1.8 0 0 0 .9-1.56V9.4z" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
      </svg>
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12h15M13 5.5 20 12l-7 6.5" />
    </svg>
  );
}

export default function RecoveryToast() {
  const { t, lang } = useT();
  const pathname = usePathname();
  const router = useRouter();
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);

  const dismiss = useCallback(() => {
    if (draft?.id) {
      markDraftDismissed(draft.id);
    }
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
      sessionStorage.setItem(DISMISS_TIME_KEY, String(Date.now()));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vc:toastDismissed', { detail: { type: 'recovery' } }));
      }
    } catch {
      // ignore
    }
    setDraft(null);
  }, [draft?.id]);

  useHistoryModal(Boolean(draft), dismiss, 'recovery-toast');

  useEffect(() => {
    if (pathname !== '/') {
      setDraft(null);
      return;
    }

    if (hasExceededLocalOrderLimit()) {
      setDraft(null);
      return;
    }

    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // ignore
    }

    const d = eligibleDraft();
    if (d && d.items && d.items.length > 0) {
      const timer = setTimeout(() => {
        if (!hasExceededLocalOrderLimit() && eligibleDraft()) {
          setDraft(d);
          recordDraftImpression(d.id);
        }
      }, HOMEPAGE_INITIAL_DELAY_MS);

      return () => clearTimeout(timer);
    }
  }, [pathname]);

  if (!draft || !draft.items || draft.items.length === 0) return null;

  const resume = () => {
    if (!draft || !draft.items || draft.items.length === 0) return;
    if (draft.id) {
      markDraftDismissed(draft.id);
    }
    try {
      sessionStorage.setItem('vc_quick_order_items', JSON.stringify(draft.items));
      sessionStorage.setItem('vc_form_draft', JSON.stringify({
        name: draft.name || '',
        phone: draft.phone || '',
        dist: draft.dist || '',
        addr: draft.addr || '',
        email: draft.email || '',
      }));
      if (draft.ship) {
        sessionStorage.setItem('vc_ship', draft.ship);
      }
      sessionStorage.setItem(DISMISS_KEY, '1');
      sessionStorage.setItem(DISMISS_TIME_KEY, String(Date.now()));
    } catch {
      // ignore
    }

    setDraft(null);
    // setDraft(null) উপরে useHistoryModal-এর isOpen false করে দেয়, যার
    // effect cleanup যেন নিচের router.push()-কে deferred history.back()
    // দিয়ে উল্টে না দেয়।
    suppressHistoryCleanup();
    router.push('/checkout?resume=1');
  };

  const firstItem = draft.items[0];
  const totalItemCount = draft.items.reduce((s, i) => s + (i.qty || 1), 0);
  const totalAmount = draft.items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
  const moreItemsCount = draft.items.length - 1;

  return (
    <div className="fixed inset-x-3 bottom-4 z-[950] sm:bottom-5 sm:left-auto sm:right-5 sm:w-[380px] animate-section-reveal">
      <div className="relative overflow-hidden rounded-[24px] border border-white/80 bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white p-5 shadow-sh3 ring-1 ring-white/70 backdrop-blur-md">
        
        <HeaderDecor />

        <motion.button
          type="button"
          onClick={dismiss}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 480, damping: 28 }}
          className="absolute right-3.5 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/80 text-ink/60 shadow-xs backdrop-blur-[8px] transition-colors duration-brand hover:bg-white hover:text-ink focus-visible:outline-none"
          aria-label={t('বন্ধ করুন')}
          title={t('বন্ধ করুন')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </motion.button>

        <div className="relative z-10 pr-7">
          <h3 className="font-body text-[15px] font-extrabold text-ink leading-tight">
            {lang === 'en' ? 'Complete Your Order' : 'পেন্ডিং অর্ডারটি সম্পন্ন করুন'}
          </h3>
          <p className="mt-0.5 font-body text-[12.5px] text-muted">
            {lang === 'en' ? 'You recently started an order for this item.' : 'আপনি সম্প্রতি একটি প্রোডাক্ট অর্ডার করতে চেয়েছিলেন।'}
          </p>
        </div>

        <div className="relative z-10 my-3 rounded-[16px] border border-white/90 bg-white/80 p-2.5 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-3">
            <ItemThumbnail imgVal={(firstItem?.emoji as string) || ''} />
            <div className="min-w-0 flex-1">
              <div className="line-clamp-1 font-body text-[13px] font-bold text-ink">
                {firstItem?.name}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="font-body text-[13.5px] font-extrabold text-brand-light">
                  ৳{totalAmount.toLocaleString('en-US')}
                </span>
                {moreItemsCount > 0 && (
                  <span className="rounded-full bg-brand-bg/60 px-2 py-0.5 font-body text-[10px] font-bold text-brand-light">
                    {lang === 'en' ? `+${moreItemsCount} more` : `+${moreItemsCount}টি আরও`}
                  </span>
                )}
                <span className="font-body text-[11px] text-muted">
                  ({totalItemCount} {lang === 'en' ? 'Pcs' : 'পিছ'})
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mb-3.5 flex items-center gap-2 rounded-[12px] border border-emerald-300/80 bg-emerald-50/90 px-3 py-1.5 shadow-xs">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-body text-[11.5px] font-bold text-emerald-800">
            {lang === 'en' ? 'Just 2 steps remaining' : 'মাত্র দুই ধাপ বাকি'}
          </span>
        </div>

        <button
          onClick={resume}
          className="relative z-10 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-info to-brand-light py-[11.5px] font-body text-[13.5px] font-bold text-white shadow-sh2 transition-all duration-brand hover:brightness-[1.03] active:scale-95"
        >
          <span>{lang === 'en' ? 'Yes, Continue Checkout' : 'হ্যাঁ, চালিয়ে যান'}</span>
          <ArrowRightIcon />
        </button>

      </div>
    </div>
  );
}
