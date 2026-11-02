'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { fetchFullOrder, readLatestGuestOrder, clearPendingOrder } from '@/lib/orderStatus';
import { mapSupabaseOrderRow } from '@/lib/orderMapping';
import { useAuthStore } from '@/lib/store/authStore';
import { SHOW_BG_CONFIRM_EVENT } from '@/lib/uiEvents';
import { useT } from '@/lib/i18n/useT';
import type { Order } from '@/types';

const PENDING_CONFIRM_KEY = 'vc_pending_confirm';
const RESTORE_SHOW_DELAY_MS = 1200;

let lastPlayedOrderId: string | number | null = null;
let lastPlayedTime = 0;

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

function IconCheckBadge() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function SolidDownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path d="M12 3a1 1 0 0 1 1 1v9.1l2.3-2.3a1 1 0 1 1 1.42 1.4l-4.02 4.03a1 1 0 0 1-1.4 0L7.28 12.2a1 1 0 0 1 1.42-1.4L11 13.1V4a1 1 0 0 1 1-1Z" />
      <path d="M5 15a1 1 0 0 1 1 1v2.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V16a1 1 0 1 1 2 0v2.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 18.5V16a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

const successSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = [
      { freq: 523.25, start: 0, dur: 0.18, gain: 0.5 },
      { freq: 659.25, start: 0.14, dur: 0.18, gain: 0.45 },
      { freq: 783.99, start: 0.26, dur: 0.22, gain: 0.4 },
      { freq: 1046.5, start: 0.36, dur: 0.38, gain: 0.55 },
    ];
    notes.forEach(({ freq, start, dur, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gainNode.gain.setValueAtTime(0, ctx.currentTime + start);
      gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // Web Audio blocked or unsupported
  }
};

const playSoundOnce = (orderId?: string | number) => {
  const now = Date.now();
  if (orderId && lastPlayedOrderId === orderId && now - lastPlayedTime < 5000) {
    return;
  }
  lastPlayedOrderId = orderId || null;
  lastPlayedTime = now;
  successSound();
};

export default function BgConfirmPopup() {
  const { t, lang } = useT();
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const currentUser = useAuthStore((s) => s.currentUser);
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [copyLabel, setCopyLabel] = useState<string>(() => (lang === 'en' ? 'Copy' : 'কপি'));
  const orderRef = useRef<Order | null>(null);
  const phoneRef = useRef<string | undefined>(undefined);

  useEffect(() => { orderRef.current = order; }, [order]);
  useEffect(() => { phoneRef.current = phone; }, [phone]);

  const showPopup = useCallback((o: Order, p?: string, playAudio = true) => {
    if (typeof window !== 'undefined') {
      const alreadySeen = localStorage.getItem(`vc_confirm_seen_${o.id}`);
      if (alreadySeen) return;
    }

    const finalPhone = p || o.customer?.phone || (typeof window !== 'undefined' ? localStorage.getItem('vc_pending_phone_ls') || undefined : undefined);
    setOrder(o);
    setPhone(finalPhone);
    setOpen(true);
    if (playAudio) {
      playSoundOnce(o.id);
    }
  }, []);

  useEffect(() => {
    const onShow = (e: Event) => {
      const detail = (e as CustomEvent<{ order?: Order; phone?: string }>).detail;
      if (detail?.order) showPopup(detail.order, detail.phone, true);
    };
    window.addEventListener(SHOW_BG_CONFIRM_EVENT, onShow);
    return () => window.removeEventListener(SHOW_BG_CONFIRM_EVENT, onShow);
  }, [showPopup]);

  useEffect(() => {
    let cancelled = false;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(PENDING_CONFIRM_KEY);
    } catch {
      raw = null;
    }
    if (!raw) return undefined;
    let saved: { order?: Order; phone?: string } | null = null;
    try {
      saved = JSON.parse(raw);
    } catch {
      saved = null;
    }
    if (!saved?.order?.id) {
      try { localStorage.removeItem(PENDING_CONFIRM_KEY); } catch { /* ignore */ }
      return undefined;
    }

    if (typeof window !== 'undefined' && localStorage.getItem(`vc_confirm_seen_${saved.order.id}`)) {
      try { localStorage.removeItem(PENDING_CONFIRM_KEY); } catch { /* ignore */ }
      return undefined;
    }

    const timer = setTimeout(async () => {
      if (cancelled) return;
      const lookupPhone = saved!.phone || saved!.order?.customer?.phone || (typeof window !== 'undefined' ? localStorage.getItem('vc_pending_phone_ls') || readLatestGuestOrder()?.phone : undefined);
      try {
        const data = await fetchFullOrder(supabase, String(saved!.order!.id), lookupPhone);
        if (cancelled) return;
        if (data) {
          const mapped = mapSupabaseOrderRow(data as Record<string, unknown>);
          if (mapped.status === 'cancelled' || mapped.status === 'rejected') {
            try { localStorage.removeItem(PENDING_CONFIRM_KEY); } catch { /* ignore */ }
            return;
          }
          showPopup(mapped, lookupPhone, false);
          return;
        }
      } catch {
        // fail-open
      }
      if (!cancelled) showPopup(saved!.order!, lookupPhone, false);
    }, RESTORE_SHOW_DELAY_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [supabase, showPopup]);

  const copyOrderNum = async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(String(order.orderNum));
    } catch {
      // ignore
    }
    setCopyLabel(t('কপি হয়েছে!'));
    setTimeout(() => setCopyLabel(lang === 'en' ? 'Copy' : 'কপি'), 2000);
  };

  const downloadInvoice = () => {
    const o = orderRef.current;
    if (!o) return;
    const finalInvoicePhone = phoneRef.current 
      || o.customer?.phone 
      || (typeof window !== 'undefined' ? localStorage.getItem('vc_pending_phone_ls') || readLatestGuestOrder()?.phone || undefined : undefined);

    try {
      localStorage.setItem(`vc_confirm_seen_${o.id}`, '1');
      localStorage.removeItem(PENDING_CONFIRM_KEY);
      sessionStorage.setItem(`vc_confirm_dismissed_${o.id}`, '1');
    } catch {
      // ignore
    }

    clearPendingOrder();
    setOpen(false);
    setOrder(null);
    
    const phoneParam = finalInvoicePhone ? `&phone=${encodeURIComponent(finalInvoicePhone)}` : '';
    router.push(`/checkout/invoice?id=${encodeURIComponent(String(o.id))}${phoneParam}`);
  };

  return (
    <AnimatePresence>
      {open && order && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* ব্যাকড্রপ ব্লার এন্ট্রি ও এক্সিট */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 bg-ink/55 backdrop-blur-[3px]"
          />

          {/* সেন্ট্রালাইজড কনফার্মেশন উইন্ডো — স্প্রিং স্কেল এন্ট্রি ও এক্সিট */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[430px] overflow-hidden rounded-[28px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white p-6 sm:p-7 text-center shadow-sh3 ring-1 ring-white/80"
          >
            <HeaderDecor />

            {/* সাকসেস ব্যাজ আইকন */}
            <div className="relative z-10 mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100 shadow-[0_4px_20px_rgba(16,185,129,0.22)]">
              <IconCheckBadge />
            </div>

            {/* টাইটেল */}
            <h2 className="relative z-10 mb-1.5 font-body text-xl font-extrabold text-ink">
              {t('অর্ডার কনফার্ম হয়েছে!')}
            </h2>

            {/* সাবটাইটেল */}
            <p className="relative z-10 mb-4 font-body text-[13px] leading-relaxed text-ink/80">
              {lang === 'en' ? (
                <>Your payment has been verified and the order has been successfully confirmed.</>
              ) : (
                <>আপনার পেমেন্ট যাচাই হয়েছে এবং অর্ডারটি সফলভাবে কনফার্ম করা হয়েছে।</>
              )}
            </p>

            {/* অর্ডার নম্বর বক্স */}
            <div className="relative z-10 mb-4 flex items-center justify-center gap-2 rounded-[12px] border border-brand-light/35 bg-white/85 py-2.5 px-3.5 shadow-xs backdrop-blur-md">
              <span className="font-body text-xs font-bold text-muted">{t('অর্ডার নম্বর:')}</span>
              <span className="font-body text-sm font-extrabold text-brand-light">{order.orderNum}</span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={copyOrderNum}
                className="ml-1 inline-flex items-center gap-1 rounded-full border border-brand-light/40 bg-white px-2.5 py-1 font-body text-[11px] font-bold text-brand-light shadow-xs transition-colors hover:bg-brand-light hover:text-white"
              >
                {copyLabel === 'Copy' || copyLabel === 'কপি' ? <IconCopy /> : <IconCheck />}
                <span>{copyLabel}</span>
              </motion.button>
            </div>

            {/* ট্র্যাক অর্ডার তথ্য */}
            <p className="relative z-10 mb-5 text-center font-body text-[12.5px] text-muted">
              {lang === 'en' ? (
                <>To track your order, use the website&apos;s &quot;Track Order&quot; option.</>
              ) : (
                <>অর্ডার ট্র্যাক করতে ওয়েবসাইটের &quot;অর্ডার ট্র্যাক&quot; অপশন ব্যবহার করুন।</>
              )}
            </p>

            {/* ইনভয়েস ডাউনলোড সিগনেচার বাটন — স্প্রিং ট্যাপ ফিডব্যাক */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              onClick={downloadInvoice}
              className="relative z-10 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-info to-brand-light py-[13.5px] font-body text-[14.5px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03]"
            >
              <span>{t('ইনভয়েস ডাউনলোড করুন (বাধ্যতামূলক)')}</span>
              <SolidDownloadIcon />
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
