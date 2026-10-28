'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchFullOrder, readLatestGuestOrder, clearPendingOrder } from '@/lib/orderStatus';
import { mapSupabaseOrderRow } from '@/lib/orderMapping';
import { showToast } from '@/lib/toast';
import { DEFAULT_FOOTER } from '@/lib/footerData';
import { useT } from '@/lib/i18n/useT';
import { RippleLayer, rippleThen } from '@/lib/ripple';
import SkeletonTransition from '@/app/components/ui/SkeletonTransition';
import { InvoiceLoadingSkeleton } from '@/app/components/ui/Skeletons';
import { InvoiceCardBody, INVOICE_FIXED_WIDTH, type InvoiceContact } from '@/lib/invoice/InvoiceCardBody';
import { buildInvoiceViewModel } from '@/lib/invoice/invoiceViewModel';
import { OPEN_TRACK_ORDER_EVENT } from '@/lib/uiEvents';
import type { Order } from '@/types';
import { DesktopBackdrop } from '@/app/components/ui/DesktopBackdrop';
import { MAX_INVOICE_DOWNLOADS, buildInvoiceWaLink } from '@/lib/invoice/invoiceLimit';


function IconChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 19h14" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.29z" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}


export default function InvoiceClient() {
  const { t, lang } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useRef(createClient()).current;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadCount, setDownloadCount] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [statusReady, setStatusReady] = useState(false);
  const [serviceBlocked, setServiceBlocked] = useState(false);
  const [allowEmergencyClose, setAllowEmergencyClose] = useState(false);
  // vc_contact সেটিংটা এখন অ্যাডমিন প্যানেল থেকে এডিট করার কোনো উপায় নেই
  // (ফিচার সরানো হয়েছে), তাই এটা Supabase থেকে না এনে সরাসরি ডিফল্ট মান
  // ব্যবহার করা হচ্ছে।
  const contact: InvoiceContact = {
    phoneLabel: DEFAULT_FOOTER.contact.phoneLabel,
    email: DEFAULT_FOOTER.contact.email,
  };
  const [downloading, setDownloading] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [lookupPhone, setLookupPhone] = useState<string | undefined>(undefined);

  const autoDownloadedRef = useRef(false);
  const downloadRef = useRef<() => void>(() => {});

  // স্ক্রিনের মাপ অনুযায়ী মোবাইল ডিভাইসে জুম স্কেলিং হিসাব (কখনোই লেখা ভেঙে নিচে নামবে না)
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        const availableWidth = Math.min(window.innerWidth - 24, 480);
        const scale = availableWidth / INVOICE_FIXED_WIDTH;
        setPreviewScale(Math.min(1, Math.max(0.65, scale)));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const paramOrderId = searchParams.get('id') || searchParams.get('orderId');
      const paramPhone = searchParams.get('phone');

      const pendingLsId = typeof window !== 'undefined' ? localStorage.getItem('vc_pending_ls') : null;
      const pendingPhone = typeof window !== 'undefined' ? localStorage.getItem('vc_pending_phone_ls') : null;
      const latestGuest = readLatestGuestOrder();

      const finalOrderId = paramOrderId || pendingLsId || latestGuest?.id;
      const finalPhone = paramPhone || pendingPhone || latestGuest?.phone;

      if (!finalOrderId) {
        if (!cancelled) {
          showToast(t('❌ কোনো অর্ডার পাওয়া যায়নি'));
          router.replace('/');
        }
        return;
      }

      try {
        const row = await fetchFullOrder(supabase, String(finalOrderId), finalPhone || undefined);
        if (cancelled) return;

        if (!row) {
          showToast(t('❌ অর্ডার তথ্য পাওয়া যাচ্ছে না'));
          router.replace('/');
          return;
        }

        setOrder(mapSupabaseOrderRow(row));
        setLookupPhone(finalPhone || undefined);
        setLoading(false);
      } catch {
        if (!cancelled) {
          showToast(t('❌ সমস্যা হয়েছে, হোমপেজে নিয়ে যাওয়া হচ্ছে'));
          router.replace('/');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, supabase, router, t]);

  useEffect(() => {
    if (!order) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const params = new URLSearchParams({ id: String(order.id), status: '1' });
        if (lookupPhone) params.set('phone', lookupPhone);
        const res = await fetch(`/api/invoice/png?${params.toString()}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && json?.ok && typeof json.remaining === 'number') {
          setRemaining(json.remaining);
        }
      } catch {
        // অজানা থাকলে বাটন চালু থাকে; সীমা সার্ভারই আটকায়
      } finally {
        if (!cancelled) setStatusReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [order, lookupPhone]);

  useEffect(() => {
    const emergencyTimer = setTimeout(() => {
      setAllowEmergencyClose(true);
    }, 4000);

    return () => clearTimeout(emergencyTimer);
  }, []);

  // 🎯 সার্ভার-জেনারেটেড ডাউনলোড ইঞ্জিন — headless Chromium দিয়ে বানানো ছবি
  // fetch করে আনা হয়, তাই স্ক্রিনে যা দেখা যায় ঠিক তাই-ই ডাউনলোড হয়
  // (html2canvas আর ব্যবহার হচ্ছে না, তাই এর font/CSS-transform সীমাবদ্ধতাও নেই)।
  const downloadPNG = useCallback(async () => {
    if (downloading || !order || remaining === 0 || serviceBlocked) return;
    setDownloading(true);

    try {
      const params = new URLSearchParams({ id: String(order.id) });
      if (lookupPhone) params.set('phone', lookupPhone);

      const res = await fetch(`/api/invoice/png?${params.toString()}`, { cache: 'no-store' });

      if (res.status === 403) {
        const json = await res.json().catch(() => null);
        if (json?.limitReached) {
          setRemaining(0);
          return;
        }
      }

      if (res.status === 503) {
        setServiceBlocked(true);
        setAllowEmergencyClose(true);
        return;
      }

      if (!res.ok) throw new Error(`invoice png request failed: ${res.status}`);

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.download = `Vangcur_Invoice_${String(order.orderNum || '').replace('#', '')}.png`;
      link.href = objectUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);

      const headerRemaining = Number(res.headers.get('X-Invoice-Remaining'));
      setRemaining(Number.isFinite(headerRemaining) ? headerRemaining : (prev) => (prev === null ? null : Math.max(prev - 1, 0)));
      setDownloadCount((prev) => prev + 1);
    } catch {
      showToast(t('❌ ডাউনলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'));
      setAllowEmergencyClose(true);
    } finally {
      setDownloading(false);
    }
  }, [downloading, order, remaining, serviceBlocked, lookupPhone, t]);

  downloadRef.current = downloadPNG;

  // 🚀 গ্রাহকের পূর্বানুমোদিত নির্দেশে পেজে আসামাত্র জিরো-ক্লিক অটো-ডাউনলোড —
  // শুধু যদি এই অর্ডারের ইনভয়েস আগে কখনো ডাউনলোড না হয়ে থাকে।
  useEffect(() => {
    if (loading || !order || !statusReady || autoDownloadedRef.current) return undefined;
    if (remaining !== MAX_INVOICE_DOWNLOADS) {
      autoDownloadedRef.current = true;
      return undefined;
    }
    const timer = setTimeout(() => {
      autoDownloadedRef.current = true;
      downloadRef.current();
    }, 650);
    return () => clearTimeout(timer);
  }, [loading, order, statusReady, remaining]);

  const isLimitReached = remaining === 0;
  const showWhatsApp = isLimitReached || serviceBlocked;
  const hasDownloaded = downloadCount > 0 || (remaining !== null && remaining < MAX_INVOICE_DOWNLOADS);
  const canClose = hasDownloaded || showWhatsApp || allowEmergencyClose;

  const handleGoBack = () => {
    if (!canClose) return;

    const from = searchParams.get('from');

    // 🔁 এখানে ইচ্ছাকৃতভাবে router.replace() ব্যবহার করা হচ্ছে, router.push() নয়।
    // ইনভয়েস পেজে ঢোকার সময় হিস্ট্রি স্ট্যাকে ইতিমধ্যে একটা এন্ট্রি যোগ হয়ে গেছে
    // (ট্র্যাক-অর্ডার/অ্যাকাউন্ট পেজ থেকে)। এখান থেকে push করে ফিরে গেলে স্ট্যাকে
    // ওই একই পেজের আরেকটা ডুপ্লিকেট এন্ট্রি জমত, যার ফলে ব্যবহারকারী ফিজিক্যাল
    // ব্যাক বাটনে চাপ দিলে আবার এই ইনভয়েস পেজেই ফিরে আসতেন (ইনভয়েস ↔ ট্র্যাক-অর্ডার
    // অসীম লুপ)। replace() বর্তমান (ইনভয়েস) এন্ট্রিটাকেই বদলে দেয়, তাই স্ট্যাক
    // পরিষ্কার থাকে এবং লুপ তৈরি হয় না।
    if (from === 'account') {
      router.replace('/account/orders');
      return;
    }

    if (from === 'track') {
      router.replace('/track-order');
      return;
    }

    // 🆕 অ্যান-লগইন ইউজার যখন কোনো পেজের ওপর খোলা "অর্ডার ট্র্যাক করুন" পপআপ থেকে
    // ইনভয়েস খুলেছিলেন (পুরো /track-order পেজ থেকে নয়) — তখন সেই আগের পেজেই ফিরিয়ে
    // নিয়ে popup আবার খুলে দেওয়া হচ্ছে, যাতে /track-order পুরো পেজে চলে না যায়।
    // এখানে ইচ্ছাকৃতভাবে history.back()/useHistoryModal-এর স্ট্যাক স্পর্শ করা হচ্ছে না
    // (সেটা অন্য অনেক ফ্লো শেয়ার করে) — শুধু সরাসরি রিপ্লেস + একটা গ্লোবাল ইভেন্ট দিয়ে
    // পপআপ রিওপেন করা হচ্ছে, তাই অন্য কোনো back-navigation ফ্লো ভাঙার ঝুঁকি নেই।
    if (from === 'track-modal') {
      const returnTo = searchParams.get('returnTo') || '/';
      router.replace(returnTo);
      if (typeof window !== 'undefined') {
        setTimeout(() => window.dispatchEvent(new CustomEvent(OPEN_TRACK_ORDER_EVENT)), 150);
      }
      return;
    }

    try {
      if (order?.id) {
        sessionStorage.setItem(`vc_confirm_dismissed_${order.id}`, '1');
      }
      sessionStorage.setItem('vc_show_post_receive_after_invoice', '1');
    } catch {
      // ignore
    }
    clearPendingOrder();
    router.replace('/');
  };

  if (loading || !order) {
    return (
      <SkeletonTransition isReady={false} skeleton={<InvoiceLoadingSkeleton />}>
        {null}
      </SkeletonTransition>
    );
  }

  const { ds, advancePaid, balanceDue, isFreeShipping, dueMsg } = buildInvoiceViewModel(order);

  const waHref = buildInvoiceWaLink(String(order.orderNum || ''), lang === 'en' ? 'en' : 'bn');
  const toLocalDigits = (n: number) => (lang === 'en' ? String(n) : String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]));

  return (
    <SkeletonTransition isReady skeleton={<InvoiceLoadingSkeleton />}>
      <div className="sleek-scrollbar relative min-h-dvh sm:min-h-screen overflow-x-hidden bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white flex flex-col justify-between lg:bg-none">
        {/* 💻 শুধু ল্যাপটপ: ফিক্সড প্রিমিয়াম ব্যাকগ্রাউন্ড */}
        <DesktopBackdrop />
        <div className="sticky top-0 z-20 w-full border-b border-ink/10 bg-white/95 px-4 py-2.5 sm:py-3 shadow-xs backdrop-blur-md">
          <div className="mx-auto flex max-w-[520px] items-center justify-between gap-3">
            <button
              onClick={(e) => rippleThen(e, handleGoBack)}
              disabled={!canClose}
              title={canClose ? undefined : (lang === 'en' ? 'Downloading your invoice first…' : 'আগে ইনভয়েসটি ডাউনলোড হচ্ছে…')}
              className="vc-press relative flex items-center gap-1.5 rounded-full border border-border-base bg-white px-4 py-2 font-body text-[13px] font-bold text-ink disabled:cursor-default disabled:opacity-40 enabled:hover:bg-surface-muted cursor-pointer"
            >
              <RippleLayer />
              <IconChevronLeft />
              <span>{t('ফিরে যান')}</span>
            </button>

            {showWhatsApp ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-5 py-2 font-body text-[13px] font-bold text-white shadow-sh1 transition-all duration-brand enabled:hover:brightness-[1.03] active:scale-95 cursor-pointer"
              >
                <IconWhatsApp />
                <span>{lang === 'en' ? 'Get on WhatsApp' : 'WhatsApp-এ নিন'}</span>
              </a>
            ) : (
              <button
                onClick={downloadPNG}
                disabled={downloading}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-light to-brand-light-hover px-5 py-2 font-body text-[13px] font-bold text-white shadow-sh1 transition-all duration-brand disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:brightness-[1.03] enabled:active:scale-95 cursor-pointer"
              >
                {downloading ? (
                  <IconSpinner />
                ) : hasDownloaded ? (
                  <IconCheckCircle />
                ) : (
                  <IconDownload />
                )}
                <span>
                  {downloading
                    ? t('তৈরি হচ্ছে...')
                    : hasDownloaded
                    ? (lang === 'en'
                        ? `Download again${remaining !== null ? ` (${remaining} left)` : ''}`
                        : `আবার ডাউনলোড${remaining !== null ? ` (বাকি ${toLocalDigits(remaining)} বার)` : ''}`)
                    : t('ছবি ডাউনলোড')}
                </span>
              </button>
            )}
          </div>
        </div>

        {!canClose && (
          <div className="relative z-10 flex shrink-0 items-center justify-center gap-2 bg-brand-bg/40 py-2 font-body text-[12px] font-semibold text-brand-light border-b border-brand-light/20">
            <IconSpinner />
            <span>{t('আপনার ইনভয়েস প্রস্তুত হচ্ছে, একটু অপেক্ষা করুন...')}</span>
          </div>
        )}

        {showWhatsApp && (
          <div className="relative z-10 flex shrink-0 items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-center font-body text-[12px] font-semibold text-amber-800 border-b border-amber-200">
            <span>
              {serviceBlocked && !isLimitReached
                ? (lang === 'en'
                    ? 'The invoice is unavailable right now. Please get it on WhatsApp.'
                    : 'এই মুহূর্তে ইনভয়েস ডাউনলোড করা যাচ্ছে না। অনুগ্রহ করে WhatsApp-এ যোগাযোগ করুন।')
                : (lang === 'en'
                    ? 'You have used all 3 downloads for this order. Please get your invoice on WhatsApp.'
                    : 'এই অর্ডারের ৩ বার ডাউনলোডের সীমা শেষ। ইনভয়েস পেতে WhatsApp-এ যোগাযোগ করুন।')}
            </span>
          </div>
        )}

        {!showWhatsApp && canClose && downloadCount > 0 && (
          <div className="relative z-10 flex shrink-0 items-center justify-center gap-2 bg-emerald-50 py-2 font-body text-[12px] font-semibold text-emerald-700 border-b border-emerald-200">
            <IconCheckCircle />
            <span>{t('ইনভয়েস সফলভাবে ডাউনলোড হয়েছে')}</span>
          </div>
        )}

        {/* 🌟 সিঙ্গেল-সোর্স কার্ড: স্ক্রিন ও ডাউনলোডে ১০০% হুবহু এক */}
        <div className="relative z-10 flex-1 px-3 py-4 sm:p-7 flex flex-col items-center justify-start">
          <div
            style={{
              width: `${INVOICE_FIXED_WIDTH * previewScale}px`,
              height: 'auto',
              overflow: 'visible',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: `${INVOICE_FIXED_WIDTH}px`,
                minWidth: `${INVOICE_FIXED_WIDTH}px`,
                maxWidth: `${INVOICE_FIXED_WIDTH}px`,
                backgroundColor: '#FFFFFF',
                color: '#1E293B',
                fontFamily: "var(--font-dm-sans), 'Noto Sans Bengali', var(--font-bengali), sans-serif",
                boxSizing: 'border-box',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
                position: 'relative',
                overflow: 'hidden',
                WebkitTextSizeAdjust: '100%',
                transform: previewScale < 1 ? `scale(${previewScale})` : 'none',
                transformOrigin: 'top center',
                boxShadow: '0 8px 30px rgba(68,167,252,0.12)',
              }}
            >
              <InvoiceCardBody
                order={order}
                ds={ds}
                contact={contact}
                dueMsg={dueMsg}
                advancePaid={advancePaid}
                balanceDue={balanceDue}
                isFreeShipping={isFreeShipping}
              />
            </div>
          </div>
        </div>
      </div>
    </SkeletonTransition>
  );
}
