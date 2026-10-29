'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import { OPEN_ORDER_LIMIT_EVENT } from '@/lib/uiEvents';
import {
  DEFAULT_WA_LINK,
  computeWaLink,
  fetchContactSettings,
} from '@/lib/floatButtonsData';
import useHistoryModal, { suppressHistoryCleanup } from '@/lib/useHistoryModal';
import { useT } from '@/lib/i18n/useT';

const lineIcon = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function ShieldLimitIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function HeaderDecor() {
  const deco = { ...lineIcon, strokeWidth: 1.4 };
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.14]">
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

export default function OrderRateLimitModal() {
  const { lang } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [waLink, setWaLink] = useState(DEFAULT_WA_LINK);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const closeAndGoHome = useCallback(() => {
    setOpen(false);
    // মডাল বন্ধ হওয়ার effect cleanup যেন নিচের router.push('/')-কে
    // deferred history.back() দিয়ে উল্টে না দেয়।
    suppressHistoryCleanup();
    router.push('/');
  }, [router]);

  useHistoryModal(open, closeAndGoHome, 'order-rate-limit-modal');

  useEffect(() => {
    const onTrigger = () => setOpen(true);
    window.addEventListener(OPEN_ORDER_LIMIT_EVENT, onTrigger);
    return () => window.removeEventListener(OPEN_ORDER_LIMIT_EVENT, onTrigger);
  }, []);

  useEffect(() => {
    if (open) lockBody();
    else unlockBody();
    return () => unlockBody();
  }, [open]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const contact = await fetchContactSettings(supabase);
      if (!cancelled && contact) setWaLink(computeWaLink(contact));
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleWhatsAppClick = () => {
    setOpen(false);
    const msg = lang === 'en'
      ? 'Hello Vangcur Support! I have reached the daily order limit of 3 orders. I need to place an urgent order. Please assist me.'
      : 'হ্যালো Vangcur সাপোর্ট! আমার দৈনিক ৩টি অর্ডারের লিমিট পূর্ণ হয়ে গেছে। আমার একটি জরুরী অর্ডার প্রয়োজন, অনুগ্রহ করে সহযোগিতা করুন।';
    window.open(`${waLink}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[1300] bg-ink/55 backdrop-blur-[3px] transition-opacity duration-brand"
        onClick={closeAndGoHome}
      />

      <div className="fixed inset-0 z-[1305] flex items-center justify-center p-4">
        <div className="relative flex max-h-[90vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white p-6 text-center shadow-sh3 transition-all duration-300 ease-brand animate-section-reveal">
          
          <HeaderDecor />

          <div className="relative z-10 mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-full border border-amber-200/80 bg-amber-50 text-amber-600 shadow-xs">
            <ShieldLimitIcon className="h-8 w-8" />
          </div>

          <h3 className="relative z-10 font-body text-[17px] font-extrabold text-ink">
            {lang === 'en' ? 'Daily Order Limit Reached' : 'দৈনিক অর্ডার সীমা পূর্ণ হয়েছে'}
          </h3>

          <p className="relative z-10 mt-2 font-body text-[13px] leading-relaxed text-ink/80">
            {lang === 'en' ? (
              <>You have completed the maximum of <strong className="font-bold text-brand-light">3 orders within the last 24 hours</strong>. To prevent spam and fake bookings, a maximum of 3 orders are permitted per device or number per day.</>
            ) : (
              <>আপনি গত ২৪ ঘণ্টায় সর্বোচ্চ <strong className="font-bold text-brand-light">৩টি অর্ডার সম্পন্ন করেছেন</strong>। স্প্যাম ও ফেক অর্ডার প্রতিরোধে একই ডিভাইস বা নম্বর থেকে ২৪ ঘণ্টায় সর্বোচ্চ ৩টি অর্ডার গ্রহণ করা হয়।</>
            )}
          </p>

          <div className="relative z-10 my-4 rounded-[12px] border border-brand-light/35 bg-white/85 p-3.5 text-left shadow-xs backdrop-blur-md">
            <p className="font-body text-[13px] leading-relaxed text-ink/85">
              {lang === 'en' ? (
                <>💡 Need to order more items urgently? Please contact our official WhatsApp support directly for immediate processing.</>
              ) : (
                <>💡 আপনার কি আরও কোনো প্রোডাক্ট অর্ডার করা প্রয়োজন? জরুরী অর্ডারের জন্য সরাসরি আমাদের অফিসিয়াল WhatsApp সাপোর্টে যোগাযোগ করুন।</>
              )}
            </p>
          </div>

          <div className="relative z-10 flex flex-col gap-2.5 pt-1">
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              onClick={handleWhatsAppClick}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-[12.5px] font-body text-[14px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-105"
            >
              <WhatsAppIcon />
              <span>{lang === 'en' ? 'Contact via WhatsApp' : 'WhatsApp এ যোগাযোগ করুন'}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              onClick={closeAndGoHome}
              className="w-full rounded-full bg-gradient-to-r from-info to-brand-light py-[12.5px] font-body text-[14px] font-bold text-white shadow-sh1 transition-[filter] duration-brand hover:brightness-[1.03]"
            >
              {lang === 'en' ? 'Got It / Go Home' : 'বুঝেছি'}
            </motion.button>
          </div>

        </div>
      </div>
    </>
  );
}
