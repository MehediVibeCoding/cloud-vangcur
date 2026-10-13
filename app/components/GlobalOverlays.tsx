'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import FloatCartBadge from './cart/FloatCartBadge';
import ConfirmDialog from './ui/ConfirmDialog';
import { OPEN_CART_EVENT, OPEN_WISHLIST_EVENT, OPEN_TRACK_ORDER_EVENT } from '@/lib/uiEvents';
import { useLanguageStore } from '@/lib/store/languageStore';
import { useThemeStore } from '@/lib/store/themeStore';
import { useCartStore } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { useAuthStore } from '@/lib/store/authStore';
import { TOAST_EVENT, type ToastDetail, type ToastType, showToast } from '@/lib/toast';
import { RESERVED_URL_PREFIXES } from '@/types/guides';

const CartSidebar = dynamic(() => import('./cart/CartSidebar'), { ssr: false });
const WishlistDrawer = dynamic(() => import('./cart/WishlistDrawer'), { ssr: false });
const TrackOrderModal = dynamic(() => import('./cart/TrackOrderModal'), { ssr: false });
const PendingLockModal = dynamic(() => import('./modals/PendingLockModal'), { ssr: false });
const FloatContactButtons = dynamic(() => import('./layout/FloatContactButtons'), { ssr: false });
const BackToTopButton = dynamic(() => import('./layout/BackToTopButton'), { ssr: false });
const RareOverlays = dynamic(() => import('./RareOverlays'), { ssr: false });

// ────────────────────────────────────────────────────────────────────────
// টোস্ট আইকনসমূহ — বৃত্তাকার গাঢ় রঙের ভেতর সাদা SVG আইকন
// ────────────────────────────────────────────────────────────────────────
function ToastSuccessIcon() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white shadow-xs">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

function ToastErrorIcon() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-800 text-white shadow-xs">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </span>
  );
}

function ToastInfoIcon() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-800 text-white shadow-xs">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
      </svg>
    </span>
  );
}

function ToastWarningIcon() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-white shadow-xs">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    </span>
  );
}

const TOAST_THEMES: Record<ToastType, { bg: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-emerald-50/95 border-emerald-300/80',
    text: 'text-emerald-950',
    icon: <ToastSuccessIcon />,
  },
  error: {
    bg: 'bg-rose-50/95 border-rose-300/80',
    text: 'text-rose-950',
    icon: <ToastErrorIcon />,
  },
  info: {
    bg: 'bg-sky-50/95 border-sky-300/80',
    text: 'text-sky-950',
    icon: <ToastInfoIcon />,
  },
  warning: {
    bg: 'bg-amber-50/95 border-amber-300/80',
    text: 'text-amber-950',
    icon: <ToastWarningIcon />,
  },
};

export default function GlobalOverlays() {
  const [cartOpen, setCartOpen] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean } | null>(null);
  
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const lang = useLanguageStore((s) => s.lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // ইনস্ট্যান্ট চেকআউট ট্রানজিশনের জন্য প্রি-ফেচ
  // শুধু ব্রাউজার idle হলে প্রি-ফেচ — প্রথম লোডের (LCP/হাইড্রেশন) সাথে নেটওয়ার্ক-প্রতিযোগিতা এড়াতে
  useEffect(() => {
    const run = () => {
      router.prefetch('/checkout');
      router.prefetch('/');
    };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(run, 2500);
    return () => clearTimeout(t);
  }, [router]);

  useEffect(() => {
    useLanguageStore.getState().hydrateLanguage();
    useAuthStore.getState().hydrate();
    useCartStore.getState().hydrate();
    useWishlistStore.getState().hydrate();
    useThemeStore.getState().hydrate();
  }, []);

  // 🚀 ব্রাউজার Idle অবস্থায় পৌঁছালে শান্তভাবে ব্যাকগ্রাউন্ডে রেয়ার ওভারলে মাউন্ট করা (৯৫ KB Unused JS ফিক্স)
  useEffect(() => {
    let idleId: number | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(() => setMounted(true), { timeout: 3500 });
    } else {
      timerId = setTimeout(() => setMounted(true), 2500);
    }

    return () => {
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  // 🔔 সেন্ট্রালাইজড টোস্ট ইভেন্ট লিসেনার
  useEffect(() => {
    const onShowToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      if (!detail || !detail.message) return;

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }

      setToast({
        message: detail.message,
        type: detail.type || 'success',
        visible: true,
      });

      toastTimerRef.current = setTimeout(() => {
        setToast((prev) => (prev ? { ...prev, visible: false } : null));
      }, 2800);
    };

    window.addEventListener(TOAST_EVENT, onShowToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onShowToast);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // 🌐 অফলাইন ও অনলাইন নেটওয়ার্ক কানেকশন ট্র্যাকার
  useEffect(() => {
    const handleOffline = () => {
      showToast(lang === 'en' ? 'Internet connection disconnected' : 'ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে', 'warning');
    };
    const handleOnline = () => {
      showToast(lang === 'en' ? 'Internet connection restored' : 'ইন্টারনেট সংযোগ পুনরায় চালু হয়েছে', 'success');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [lang]);

  const hideFloatingBadges = pathname?.startsWith('/checkout') ?? false;
  const isProductPage = pathname?.startsWith('/product/') ?? false;
  const firstSegment = pathname?.split('/').filter(Boolean)[0] ?? '';
  const isGuidePage = pathname !== '/' && !RESERVED_URL_PREFIXES.includes(firstSegment);

  useEffect(() => {
    const onOpenCart = () => { setMounted(true); setCartOpen(true); };
    const onOpenWish = () => { setMounted(true); setWishOpen(true); };
    const onOpenTrack = () => { setMounted(true); setTrackOpen(true); };
    window.addEventListener(OPEN_CART_EVENT, onOpenCart);
    window.addEventListener(OPEN_WISHLIST_EVENT, onOpenWish);
    window.addEventListener(OPEN_TRACK_ORDER_EVENT, onOpenTrack);
    return () => {
      window.removeEventListener(OPEN_CART_EVENT, onOpenCart);
      window.removeEventListener(OPEN_WISHLIST_EVENT, onOpenWish);
      window.removeEventListener(OPEN_TRACK_ORDER_EVENT, onOpenTrack);
    };
  }, []);

  return (
    <>
      {/* 🌟 ইউনিভার্সাল ডায়নামিক টোস্ট রেন্ডারার */}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed bottom-7 left-1/2 z-[1300] flex -translate-x-1/2 items-center gap-2.5 rounded-full border px-4 py-2.5 shadow-sh2 backdrop-blur-md transition-all duration-300 ease-out max-w-[95vw] sm:max-w-xl ${
          toast && toast.visible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 pointer-events-none'
        } ${toast ? TOAST_THEMES[toast.type].bg : 'bg-sky-50/95 border-sky-300/80'}`}
      >
        {toast && TOAST_THEMES[toast.type].icon}
        <span
          className={`font-body text-[13px] font-bold tracking-normal leading-snug ${
            toast ? TOAST_THEMES[toast.type].text : 'text-sky-950'
          }`}
        >
          {toast?.message}
        </span>
      </div>

      <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <WishlistDrawer isOpen={wishOpen} onClose={() => setWishOpen(false)} />
      <TrackOrderModal isOpen={trackOpen} onClose={() => setTrackOpen(false)} />
      <PendingLockModal />
      <ConfirmDialog />
      
      {!hideFloatingBadges && !isGuidePage && <FloatCartBadge />}

      {mounted && (
        <>
          {!hideFloatingBadges && !isProductPage && !isGuidePage && <FloatContactButtons />}
          {!hideFloatingBadges && !isProductPage && <BackToTopButton />}
          <RareOverlays />
        </>
      )}
    </>
  );
}
