'use client';

import {
  useCallback, useEffect, useId, useRef, useState,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import {
  fetchFullOrder, watchOrderStatus, readPendingOrder, clearPendingOrder, softenPendingOrder, isPendingQuiet,
  RESOLVED_ORDER_STATUSES, readLatestGuestOrder,
} from '@/lib/orderStatus';
import { mapSupabaseOrderRow } from '@/lib/orderMapping';
import { useAuthStore } from '@/lib/store/authStore';
import { DEFAULT_FOOTER } from '@/lib/footerData';
import {
  OPEN_WAIT_OVERLAY_EVENT, SHOW_BG_CONFIRM_EVENT,
} from '@/lib/uiEvents';
import { useT } from '@/lib/i18n/useT';
import WaitingGame from '@/app/components/checkout/WaitingGame';
import type { Order, OrderStatus } from '@/types';
import WaitingTip from './WaitingTip';

// অর্ডারের বয়স এর বেশি হলে "প্রসেস হচ্ছে" বাবল/কার্ড আর দেখানো হয় না (কোয়াইট মোড) — শুধু কনফার্ম/রিজেক্টে পপআপ আসে।
const QUIET_AFTER_MS = 30 * 60 * 1000;

function readPendingAgeMs(): number {
  try {
    const ts = parseInt(localStorage.getItem('vc_pending_ts') || '0', 10);
    return ts ? Date.now() - ts : 0;
  } catch {
    return 0;
  }
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

// 🏺 রিয়েলস্টিক লাইভ স্যান্ড-ফল অ্যানিমেশন
function AnimatedLiveHourglass() {
  const uid = useId();
  const gradId = `vc-sand-grad-${uid}`;
  const topClipId = `vc-sand-top-${uid}`;
  const bottomClipId = `vc-sand-bottom-${uid}`;

  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <clipPath id={topClipId}>
          <rect x="6" y="2" width="12" height="10">
            <animate attributeName="y" values="2;11.6" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1" />
            <animate attributeName="height" values="10;0.4" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1" />
          </rect>
        </clipPath>
        <clipPath id={bottomClipId}>
          <rect x="6" y="21.6" width="12" height="0.4">
            <animate attributeName="y" values="21.6;12" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1" />
            <animate attributeName="height" values="0.4;10" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1" />
          </rect>
        </clipPath>
      </defs>

      <path
        d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"
        fill={`url(#${gradId})`}
        clipPath={`url(#${topClipId})`}
      />

      <circle cx="12" cy="11.3" r="0.55" fill="#D97706">
        <animate attributeName="cy" values="11.3;20.6" dur="0.85s" repeatCount="indefinite" begin="0s" />
      </circle>
      <circle cx="12" cy="11.3" r="0.48" fill="#D97706">
        <animate attributeName="cy" values="11.3;20.6" dur="0.85s" repeatCount="indefinite" begin="0.28s" />
      </circle>
      <circle cx="12" cy="11.3" r="0.4" fill="#D97706">
        <animate attributeName="cy" values="11.3;20.6" dur="0.85s" repeatCount="indefinite" begin="0.56s" />
      </circle>

      <path
        d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"
        fill={`url(#${gradId})`}
        clipPath={`url(#${bottomClipId})`}
      />

      <path
        d="M5 2h14M5 22h14M6 2v3.5c0 2.2 1.5 4 3.5 5l1.5.8-1.5.8c-2 1-3.5 2.8-3.5 5V22M18 2v3.5c0 2.2-1.5 4-3.5 5l-1.5.8 1.5.8c2 1 3.5 2.8 3.5 5V22"
        stroke="#B45309"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconCircleTarget() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
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

function IconWarningShield({ className = 'shrink-0 text-amber-600' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconBulb({ className = 'shrink-0 text-brand-light' }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
      <path d="M12 2.7 2.35 10.55a1 1 0 0 0 .63 1.78h1.27v8.17a1 1 0 0 0 1 1H9.5a.5.5 0 0 0 .5-.5V15h4v6a.5.5 0 0 0 .5.5h4.25a1 1 0 0 0 1-1v-8.17h1.27a1 1 0 0 0 .63-1.78L12 2.7Z" />
    </svg>
  );
}

function IconCrossShield() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function WaitingOverlay() {
  const { t, lang } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useRef(createClient()).current;
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [copyLabel, setCopyLabel] = useState<string>(() => (lang === 'en' ? 'Copy' : 'কপি'));
  const currentUser = useAuthStore((s) => s.currentUser);
  const orderRef = useRef<Order | null>(null);
  const phoneRef = useRef<string>('');

  useEffect(() => { orderRef.current = order; }, [order]);

  const openForPending = useCallback(async (id: string, orderNum: string, phone: string, opts?: { startMinimized?: boolean; quiet?: boolean }) => {
    if (typeof window !== 'undefined') {
      const alreadySeen = localStorage.getItem(`vc_confirm_seen_${id}`);
      const alreadyRejected = localStorage.getItem(`vc_reject_seen_${id}`);
      const alreadyDismissed = sessionStorage.getItem(`vc_confirm_dismissed_${id}`);
      if (alreadySeen || alreadyRejected || alreadyDismissed) {
        clearPendingOrder();
        return;
      }
    }

    phoneRef.current = phone;
    setOrderId(id);
    setStatus('pending');
    const data = await fetchFullOrder(supabase, id, phone);
    const mapped: Order = data
      ? mapSupabaseOrderRow(data as Record<string, unknown>)
      : {
        id, orderNum, date: new Date().toISOString(), status: 'pending', total: 0, items: [], customer: {},
      };

    if (['confirmed', 'shipped', 'delivered'].includes(mapped.status)) {
      clearPendingOrder();
      const seenKey = `vc_confirm_seen_${mapped.id}`;
      const dismissedKey = `vc_confirm_dismissed_${mapped.id}`;
      if (typeof window !== 'undefined' && (localStorage.getItem(seenKey) || sessionStorage.getItem(dismissedKey))) {
        return;
      }
      window.dispatchEvent(new CustomEvent(SHOW_BG_CONFIRM_EVENT, {
        detail: { order: mapped, phone: phone || mapped.customer?.phone },
      }));
      return;
    }

    setOrder(mapped);
    setStatus(mapped.status);

    const resolvedNegative = mapped.status === 'cancelled' || mapped.status === 'rejected';
    if (resolvedNegative) {
      setVisible(true);
      setMinimized(false);
      return;
    }
    if (opts?.quiet) {
      setVisible(false);
      setMinimized(false);
      return;
    }
    setVisible(true);
    setMinimized(!!opts?.startMinimized);
  }, [supabase]);

  useEffect(() => {
    if (pathname?.startsWith('/checkout/status') || pathname?.startsWith('/checkout/invoice')) {
      return;
    }
    if (orderId) return;
    const pending = readPendingOrder();
    if (pending) {
      if (typeof window !== 'undefined' && (localStorage.getItem(`vc_confirm_seen_${pending.id}`) || localStorage.getItem(`vc_reject_seen_${pending.id}`) || sessionStorage.getItem(`vc_confirm_dismissed_${pending.id}`))) {
        clearPendingOrder();
        return;
      }
      const quiet = isPendingQuiet() || readPendingAgeMs() >= QUIET_AFTER_MS;
      openForPending(pending.id, pending.orderNum, pending.phone, { startMinimized: true, quiet });
    }
  }, [pathname, orderId, openForPending]);

  useEffect(() => {
    const onOpen = () => {
      if (orderRef.current) {
        setVisible(true);
        setMinimized(false);
      }
    };
    window.addEventListener(OPEN_WAIT_OVERLAY_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_WAIT_OVERLAY_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!orderId || pathname?.startsWith('/checkout/status') || pathname?.startsWith('/checkout/invoice')) return undefined;
    const stop = watchOrderStatus(supabase, orderId, phoneRef.current, (newStatus) => {
      if (newStatus === 'confirmed' || newStatus === 'shipped' || newStatus === 'delivered') {
        clearPendingOrder();
        const updatedOrder = orderRef.current ? { ...orderRef.current, status: newStatus } : orderRef.current;
        setVisible(false);
        setMinimized(false);

        if (orderId && typeof window !== 'undefined') {
          const seenKey = `vc_confirm_seen_${orderId}`;
          const dismissedKey = `vc_confirm_dismissed_${orderId}`;
          if (localStorage.getItem(seenKey) || sessionStorage.getItem(dismissedKey)) {
            return;
          }
        }

        const confirmPhone = phoneRef.current 
          || updatedOrder?.customer?.phone 
          || (typeof window !== 'undefined' ? localStorage.getItem('vc_pending_phone_ls') || readLatestGuestOrder()?.phone || undefined : undefined);

        window.dispatchEvent(new CustomEvent(SHOW_BG_CONFIRM_EVENT, {
          detail: { order: updatedOrder, phone: confirmPhone },
        }));
      } else {
        setStatus(newStatus);
        setOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
        if (newStatus === 'cancelled' || newStatus === 'rejected') {
          clearPendingOrder();
          setVisible(true);
          setMinimized(false);
        }
      }
    });
    return stop;
  }, [orderId, supabase, pathname]);

  useEffect(() => {
    if (!visible || status !== 'pending') return undefined;
    const remaining = Math.max(0, QUIET_AFTER_MS - readPendingAgeMs());
    const timer = setTimeout(() => {
      softenPendingOrder();
      setVisible(false);
      setMinimized(false);
    }, remaining);
    return () => clearTimeout(timer);
  }, [visible, status]);

  useEffect(() => {
    // শুধু নিজে লক করলেই cleanup-এ আনলক — নইলে শেয়ার্ড কাউন্টার থেকে অন্য মডালের লক কমে যেত।
    if (!visible || minimized) return undefined;
    lockBody();
    return () => unlockBody();
  }, [visible, minimized]);

  if (visible && (pathname?.startsWith('/checkout/status') || pathname?.startsWith('/checkout/invoice'))) return null;
  if (!visible || !order) return null;

  const isPending = status === 'pending';
  const isRejected = status === 'cancelled' || status === 'rejected';
  const isGuest = !currentUser;
  const advanceAmount = order.advancePaid || 200;

  const dismissForce = () => {
    if (isRejected && orderId && typeof window !== 'undefined') {
      try { localStorage.setItem(`vc_reject_seen_${orderId}`, '1'); } catch { /* ignore */ }
    }
    clearPendingOrder();
    setVisible(false);
    setMinimized(false);
    setOrderId(null);
    setOrder(null);
  };

  const retryOrder = () => {
    dismissForce();
    router.push('/');
  };

  const copyOrderNum = async () => {
    try {
      await navigator.clipboard.writeText(String(order.orderNum));
    } catch {
      // ignore
    }
    setCopyLabel(t('কপি হয়েছে!'));
    setTimeout(() => setCopyLabel(lang === 'en' ? 'Copy' : 'কপি'), 2000);
  };

  // 🌟 মিনিমাইজড অবস্থায় স্প্রিং বাবল বাটন — মূল পজিশন: ডান-নিচের কোণে
  if (minimized) {
    return (
      <motion.button
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        onClick={() => setMinimized(false)}
        className="fixed bottom-44 right-4 z-[65] flex items-center gap-2 rounded-full border border-brand-light/35 bg-white/90 px-4 py-2.5 font-body text-[12.5px] font-bold text-ink shadow-sh2 backdrop-blur-md transition-all duration-brand hover:bg-white hover:border-brand-light animate-section-reveal"
      >
        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        <span>{lang === 'en' ? `${order.orderNum} processing...` : `${order.orderNum} প্রসেস হচ্ছে...`}</span>
      </motion.button>
    );
  }

  return (
    <>
      {/* ব্যাকড্রপ ব্লার */}
      <div
        className="fixed inset-0 z-[1200] bg-ink/55 backdrop-blur-[3px] transition-opacity duration-brand"
        onClick={() => (isPending ? setMinimized(true) : dismissForce())}
      />

      {/* মোবাইলে ১০০% এজ-টু-এজ ফুলস্ক্রিন ও ডেস্কে সেন্ট্রাল মোডাল */}
      <div className="fixed inset-0 z-[1205] flex items-center justify-center p-0 sm:p-4">
        <div className="no-scrollbar relative w-full h-full min-h-dvh sm:min-h-0 sm:h-auto sm:max-w-[440px] sm:max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-none sm:rounded-[28px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white p-6 sm:p-7 text-center shadow-none sm:shadow-sh3 sm:ring-1 sm:ring-white/80 animate-section-reveal flex flex-col justify-center sm:justify-start">
          <HeaderDecor />

          {/* ========================================================================= */}
          {/* ১. পেন্ডিং ও ভেরিফিকেশন স্টেট */}
          {/* ========================================================================= */}
          {isPending && (
            <>
              {/* স্যান্ড-গ্লাস আইকন ব্যাজ */}
              <div className="relative z-10 mx-auto mb-3.5 flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border border-amber-300/80 bg-[#FEF3C7] shadow-[0_4px_16px_rgba(245,158,11,0.20)]">
                <AnimatedLiveHourglass />
              </div>

              {/* টাইটেল */}
              <h2 className="relative z-10 mb-1.5 font-body text-xl font-extrabold text-ink">
                {t('ধন্যবাদ!')}
              </h2>

              {/* ক্লাসিক মূল বাক্য */}
              <p className="relative z-10 mb-4 font-body text-[13px] leading-relaxed text-ink/80">
                {lang === 'en' ? (
                  <>Your order is pending. We are verifying your ৳{advanceAmount.toLocaleString('en-US')} payment. You will usually get confirmation <strong className="text-ink font-bold">within 5–10 minutes</strong> (maximum 30 minutes).</>
                ) : (
                  <>আপনার অর্ডারটি পেন্ডিং অবস্থায় আছে। আপনার ৳{advanceAmount.toLocaleString('en-US')} টাকার পেমেন্ট আমরা যাচাই করছি। সাধারণত <strong className="text-ink font-bold">৫–১০ মিনিটের মধ্যে</strong> কনফার্মেশন পাবেন (সর্বোচ্চ ৩০ মিনিট)।</>
                )}
              </p>

              {/* অর্ডার নম্বর বক্স */}
              <div className="relative z-10 mb-4 flex items-center justify-center gap-2 rounded-[12px] border border-brand-light/35 bg-white/85 py-2.5 px-3.5 shadow-xs backdrop-blur-md">
                <span className="font-body text-xs font-bold text-muted">{t('অর্ডার নম্বর:')}</span>
                <span className="font-body text-sm font-extrabold text-brand-light">{order.orderNum}</span>
                <button
                  onClick={copyOrderNum}
                  className="ml-1 inline-flex items-center gap-1 rounded-full border border-brand-light/40 bg-white px-2.5 py-1 font-body text-[11px] font-bold text-brand-light shadow-xs transition-colors hover:bg-brand-light hover:text-white active:scale-95"
                >
                  {copyLabel === 'Copy' || copyLabel === 'কপি' ? <IconCopy /> : <IconCheck />}
                  <span>{copyLabel}</span>
                </button>
              </div>

              {/* আন-লগইন গেস্ট কার্ড — কনসেন্ট্রিক রেডিয়াস ফিক্স (rounded-[12px]) */}
              {isGuest && (
                <div className="relative z-10 mb-4 rounded-[12px] border border-amber-200/80 bg-amber-50/90 p-3 text-center font-body text-[12.5px] leading-[1.65] text-amber-900 shadow-xs">
                  <IconWarningShield className="relative -top-[1px] mr-1 inline-block align-middle text-amber-600" />
                  {lang === 'en' ? (
                    <>You are currently <strong>not logged in</strong>. To track your order in the future, click the website&apos;s <strong>Login button</strong> to log in.</>
                  ) : (
                    <>আপনি এই মুহূর্তে <strong>আনলগইন</strong> অবস্থায় আছেন। ভবিষ্যতে অর্ডার ট্র্যাক করতে ওয়েবসাইটের <strong>লগইন বাটন</strong>-এ ক্লিক করে লগইন করুন।</>
                  )}
                </div>
              )}

              {/* ৩-ধাপের স্ট্যাটাস টাইমলাইন — কনসেন্ট্রিক রেডিয়াস ফিক্স (rounded-[12px]) */}
              <div className="relative z-10 mb-4 rounded-[12px] border border-white/90 bg-white/75 p-3.5 text-left shadow-xs backdrop-blur-md space-y-2.5">
                {/* ধাপ ১: রিসিভড */}
                <div className="flex items-center gap-3 border-b border-border-base/70 pb-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100 text-emerald-700 shadow-xs">
                    <IconCheck />
                  </span>
                  <div>
                    <strong className="block font-body text-[12.5px] font-bold text-ink">{t('অর্ডার রিসিভড')}</strong>
                    <span className="font-body text-[11px] text-muted">{t('সিস্টেমে সফলভাবে জমা হয়েছে')}</span>
                  </div>
                </div>

                {/* ধাপ ২: পেমেন্ট ভেরিফিকেশন */}
                <div className="flex items-center gap-3 border-b border-border-base/70 pb-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-100 text-amber-700 shadow-[0_0_16px_rgba(245,158,11,0.55)]">
                    <IconSearch />
                  </span>
                  <div>
                    <strong className="block font-body text-[12.5px] font-bold text-ink">{t('পেমেন্ট ভেরিফিকেশন')}</strong>
                    <span className="font-body text-[11px] text-muted">{t('বিকাশ ট্রানজেকশন যাচাই করা হচ্ছে')}</span>
                  </div>
                </div>

                {/* ধাপ ৩: কনফার্মেশন */}
                <div className="flex items-center gap-3 pt-0.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-light/40 bg-brand-bg/50 text-brand-light shadow-xs">
                    <IconCircleTarget />
                  </span>
                  <div>
                    <strong className="block font-body text-[12.5px] font-bold text-ink">{t('অর্ডার কনফার্ম')}</strong>
                    <span className="font-body text-[11px] text-muted">{t('পেমেন্ট সঠিক হলে কনফার্ম হবে')}</span>
                  </div>
                </div>
              </div>

              {/* ফ্রেশ স্কাই-ব্লু টিপ বক্স — কনসেন্ট্রিক রেডিয়াস ফিক্স (rounded-[10px]) */}
              <WaitingTip
                className="rounded-[10px]"
                icon={<IconBulb className="relative -top-[1px] mr-1 inline-block align-middle text-brand-light" />}
                line1={t('আপনি চাইলে এখন ওয়েবসাইট ব্রাউজ করতে পারেন অথবা গেম খেলতে পারেন।')}
                line2={t('অর্ডার কনফার্ম হলে স্বয়ংক্রিয় নোটিফিকেশন দেখাবে।')}
              />

              {/* 🎮 মিনি গেম — শুধু "গেম খেলুন" বাটন; সাবমিটের ৫ মিনিট পর আর দেখায় না */}
              <WaitingGame variant="overlay" active={isPending} />

              {/* সোশ্যাল মিডিয়া আইকনসমূহ */}
              <div className="relative z-10 mb-5">
                <div className="mb-2.5 font-body text-[10.5px] font-bold uppercase tracking-wider text-muted">{t('আমাদের ফলো করুন')}</div>
                <div className="flex justify-center gap-2.5">
                  <a
                    className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#1877F2] text-white shadow-xs transition-transform hover:scale-110 active:scale-95 [&_svg]:h-[17px] [&_svg]:w-[17px] [&_svg]:fill-white"
                    href={DEFAULT_FOOTER.social.fb}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Facebook"
                  >
                    <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </a>

                  <a
                    className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#833AB4] text-white shadow-xs transition-transform hover:scale-110 active:scale-95 [&_svg]:h-[17px] [&_svg]:w-[17px] [&_svg]:fill-white"
                    href={DEFAULT_FOOTER.social.ig}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Instagram"
                  >
                    <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                  </a>

                  <a
                    className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#010101] text-white shadow-xs transition-transform hover:scale-110 active:scale-95 [&_svg]:h-[17px] [&_svg]:w-[17px] [&_svg]:fill-white"
                    href={DEFAULT_FOOTER.social.tk}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="TikTok"
                  >
                    <svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
                  </a>

                  <a
                    className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-xs transition-transform hover:scale-110 active:scale-95 [&_svg]:h-[17px] [&_svg]:w-[17px] [&_svg]:fill-white"
                    href={DEFAULT_FOOTER.social.wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="WhatsApp"
                  >
                    <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  </a>

                  <a
                    className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#FF0000] text-white shadow-xs transition-transform hover:scale-110 active:scale-95 [&_svg]:h-[17px] [&_svg]:w-[17px] [&_svg]:fill-white"
                    href={DEFAULT_FOOTER.social.yt}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="YouTube"
                  >
                    <svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                  </a>
                </div>
              </div>

              {/* ওয়েবসাইটে ফিরে যাওয়ার প্রাইমারি বাটন — স্প্রিং ফিডব্যাক */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                onClick={() => setMinimized(true)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-info to-brand-light py-[13.5px] font-body text-[14.5px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03]"
              >
                <IconHome />
                <span>{t('ওয়েবসাইটে ফিরে যান')}</span>
              </motion.button>
            </>
          )}

          {/* ========================================================================= */}
          {/* ২. রিজেক্টেড ও ক্যানসেল্ড স্টেট */}
          {/* ========================================================================= */}
          {isRejected && (
            <>
              {/* রিজেক্ট শিল্ড ব্যাজ */}
              <div className="relative z-10 mx-auto mb-3.5 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-red-200/80 bg-red-50 text-red-600 shadow-xs">
                <IconCrossShield />
              </div>

              <h2 className="relative z-10 mb-1.5 font-body text-xl font-extrabold text-red-600">
                {t('দুঃখিত!')}
              </h2>
              <p className="relative z-10 mb-5 font-body text-[13px] leading-relaxed text-ink/80">
                {t('আপনার পেমেন্ট তথ্যটি সঠিক নয়। সঠিক তথ্য দিয়ে আবার চেষ্টা করুন অথবা সরাসরি WhatsApp-এ যোগাযোগ করুন।')}
              </p>

              <div className="relative z-10 flex flex-col gap-2.5">
                <motion.a
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  href={DEFAULT_FOOTER.social.wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-[13px] font-body text-sm font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-105 no-underline"
                >
                  <IconWhatsApp />
                  <span>{t('WhatsApp এ যোগাযোগ করুন')}</span>
                </motion.a>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  onClick={retryOrder}
                  className="w-full rounded-full border border-border-base bg-white py-[12px] font-body text-[13.5px] font-bold text-ink transition-colors duration-brand hover:bg-surface-muted"
                >
                  {t('আবার চেষ্টা করুন')}
                </motion.button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
