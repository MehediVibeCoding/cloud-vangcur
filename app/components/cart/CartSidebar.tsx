'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { fetchCatalogIndex, QUICK_CART_EVENT } from '@/lib/productData';
import { useCartStore, cartTotal, cartCount } from '@/lib/store/cartStore';
import { refreshCartImages } from '@/lib/freshImages';
import { useAuthStore } from '@/lib/store/authStore';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import { showToast } from '@/lib/toast';
import { useT } from '@/lib/i18n/useT';
import { OPEN_BULK_ORDER_EVENT } from '@/lib/uiEvents';
import { MAX_ONLINE_ORDER_TOTAL } from '@/lib/checkoutData';
import {
  getAppliedCoupon,
  saveAppliedCoupon,
  removeAppliedCoupon,
  validateCoupon,
  localizeCouponError,
  recalculateDiscount,
  COUPON_CHANGE_EVENT,
  type AppliedCoupon,
} from '@/lib/couponData';
import useHistoryModal, { suppressHistoryCleanup } from '@/lib/useHistoryModal';
import type { Product } from '@/types';
import { guardPendingLock } from '@/lib/pendingLock';

const MAX_COUPON_LEN = 25;

function getCachedProds(): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem('vc_search_prods_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function CartItemThumb({ emoji }: { emoji?: string }) {
  const isUrl = typeof emoji === 'string' && (emoji.startsWith('http://') || emoji.startsWith('https://'));
  if (isUrl) {
    return (
      <img
        src={optimizeCloudinaryUrl(emoji, 120)}
        alt=""
        className="h-12 w-12 shrink-0 rounded-xl border border-white/80 bg-white object-cover object-top shadow-xs"
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/90 text-2xl shadow-xs">
      {emoji || '📦'}
    </span>
  );
}

function NavCartSvgIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function CouponSvgIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-brand-light">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <line x1="12" y1="9" x2="12" y2="15" strokeDasharray="2 2" />
    </svg>
  );
}

function LockSecurityIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="10.5" width="14" height="10" rx="3" />
      <path d="M8.25 10.5V8a3.75 3.75 0 0 1 7.5 0v2.5" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.75" opacity="0.22" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12.5 9.5 17.5 19.5 6" />
    </svg>
  );
}

function HeaderDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.14]">
      <svg width="34" height="34" className="absolute -left-1 top-2 -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 13a8 8 0 0 1 16 0" />
        <rect x="3" y="13" width="4" height="6" rx="1.5" />
        <rect x="17" y="13" width="4" height="6" rx="1.5" />
      </svg>
      <svg width="26" height="26" className="absolute right-14 top-3 rotate-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2.5" width="10" height="15" rx="3" />
        <path d="M10 5.5h4" />
        <circle cx="12" cy="20" r="1.6" />
      </svg>
    </div>
  );
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { t, lang } = useT();
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const currentUser = useAuthStore((s) => s.currentUser);
  
  const cart = useCartStore((s) => s.cart);
  const prodsRef = useRef<Product[]>([]);

  useHistoryModal(isOpen, onClose, 'cart-drawer');

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [couponError, setCouponError] = useState('');
  // 🔁 শেষ যে কুপন কোডটা সার্ভার রিজেক্ট করেছে (এবং তার এরর মেসেজ)। ইনপুটে হুবহু
  // এই কোডটাই থাকলে বাটনে "প্রয়োগ"-এর বদলে "মুছুন" দেখায়; একটা অক্ষর বদলালেই
  // (যোগ/বাদ/পরিবর্তন) আবার "প্রয়োগ" ফিরে আসে।
  const [failedCoupon, setFailedCoupon] = useState<{ code: string; msg: string } | null>(null);
  const isFailedCouponShown = !!failedCoupon && couponCode === failedCoupon.code;
  const shownCouponError = couponError || (isFailedCouponShown && failedCoupon ? failedCoupon.msg : '');

  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'verifying' | 'success'>('idle');

  // 🛡️ রিকোয়েস্ট-সেভিং: আগে ড্রয়ার বন্ধ থাকলেও (প্রতি পেজ-লোডে) /checkout ও / প্রিফেচ হতো।
  // এখন শুধু ড্রয়ার খুললে /checkout (চেকআউট বাটনের জন্য); `/` এর প্রিফেচ বাদ।
  useEffect(() => {
    if (isOpen) router.prefetch('/checkout');
  }, [router, isOpen]);

  useEffect(() => {
    setAppliedCoupon(getAppliedCoupon());
    const onCouponChange = (e: Event) => {
      const c = (e as CustomEvent<{ coupon: AppliedCoupon | null }>).detail?.coupon;
      setAppliedCoupon(c || null);
    };
    window.addEventListener(COUPON_CHANGE_EVENT, onCouponChange);
    return () => window.removeEventListener(COUPON_CHANGE_EVENT, onCouponChange);
  }, []);

  useEffect(() => {
    prodsRef.current = getCachedProds();
  }, []);

  // 🖼️ কার্ট খোলার সময় আইটেমের ছবি সর্বশেষ ছবিতে হালনাগাদ (৫ মিনিট ক্যাশসহ, খুব হালকা কোয়েরি)
  useEffect(() => {
    if (isOpen) refreshCartImages();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && prodsRef.current.length > 0) return;
    let cancelled = false;

    const loadProds = async () => {
      if (prodsRef.current.length > 0) return;
      const cached = getCachedProds();
      if (cached.length > 0) {
        prodsRef.current = cached;
        return;
      }
      try {
        const customRows = await fetchCatalogIndex(supabase);
        if (!cancelled && customRows.length) {
          prodsRef.current = customRows;
          try {
            sessionStorage.setItem('vc_search_prods_cache', JSON.stringify(customRows));
            sessionStorage.setItem('vc_search_cache_ts', String(Date.now()));
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    };

    if (isOpen) {
      loadProds();
    } else {
      const idleTimer = setTimeout(loadProds, 3000);
      return () => {
        cancelled = true;
        clearTimeout(idleTimer);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, supabase]);

  // QUICK_CART_EVENT ডিসপ্যাচ করার আগেই caller (ProductCard/ProductDetailClient/
  // WishlistDrawer/AccountClient) নিজে addToCart() কল করে ফেলে এবং নিজের
  // "কার্টে যোগ হয়েছে" toast-ও দেখিয়ে দেয় — এই ইভেন্টটা শুধু সাইডবারের product
  // ক্যাশ (prodsRef, updateQty-এর স্টক চেকের জন্য দরকার) রিফ্রেশ রাখতে ব্যবহার হয়।
  // আগে এখানে addToCart() আবার কল হতো, ফলে প্রতিটা অ্যাড-টু-কার্টে পণ্যটা দুইবার
  // যোগ হয়ে যেত এবং স্টক ঠিক শেষ হয়ে গেলে দ্বিতীয় (ডুপ্লিকেট) কলটা ব্যর্থ হয়ে
  // "স্টক শেষ!" টোস্টও একসাথে দেখাত।
  useEffect(() => {
    const onQuickCart = async (e: Event) => {
      const id = (e as CustomEvent).detail?.id;
      if (id === undefined) return;

      if (prodsRef.current.length === 0) {
        const cached = getCachedProds();
        if (cached.length > 0) {
          prodsRef.current = cached;
        } else {
          try {
            const rows = await fetchCatalogIndex(supabase);
            if (rows.length) prodsRef.current = rows;
          } catch {
            // ignore
          }
        }
      }
    };
    window.addEventListener(QUICK_CART_EVENT, onQuickCart);
    return () => window.removeEventListener(QUICK_CART_EVENT, onQuickCart);
  }, [supabase]);

  useEffect(() => {
    if (isOpen) lockBody();
    else {
      unlockBody();
      setCheckoutStatus('idle');
    }
  }, [isOpen]);

  const handleQty = (id: number | string, delta: number) => {
    const res = useCartStore.getState().updateQty(prodsRef.current, id, delta);
    if (!res.ok && res.reason === 'stock') {
      showToast(t(`সর্বোচ্চ স্টক সীমায় পৌঁছে গেছে ({count}টি)`).replace('{count}', String(res.maxStock)));
    } else if (!res.ok && res.reason === 'limit') {
      showToast(t('একটি পণ্য সর্বোচ্চ ১০টি নেওয়া যাবে'));
    }
  };

  const handleRemove = (id: number | string) => {
    useCartStore.getState().removeItem(id);
    showToast(t('কার্ট থেকে সরানো হয়েছে'));
  };

  const subtotal = cartTotal(cart);
  const totalCount = cartCount(cart);

  const { discountAmount, isValid: isCouponStillValid, reason: couponInvalidReason } = useMemo(() => {
    return recalculateDiscount(appliedCoupon, subtotal);
  }, [appliedCoupon, subtotal]);

  useEffect(() => {
    if (!isOpen) return;
    if (appliedCoupon && (!cart.length || (!isCouponStillValid && couponInvalidReason))) {
      removeAppliedCoupon();
      if (cart.length && couponInvalidReason) {
        showToast(localizeCouponError(couponInvalidReason, lang), 'warning');
      }
    }
  // NOTE (audit): এই react-hooks/exhaustive-deps warning ইচ্ছা করেই ঠিক করা হয়নি — dependency আন্দাজে যোগ করলে অসীম লুপ বা অপ্রত্যাশিত রি-রান হতে পারে।
  // বদলানোর আগে আচরণ ভালো করে যাচাই করুন (এই hook-এর জন্য আলাদা করে ইচ্ছাকৃত কিনা যাচাই হয়নি)।
  }, [isOpen, cart.length, appliedCoupon, isCouponStillValid, couponInvalidReason]);

  // কার্টের মোট বা ইউজার বদলালে আগের ব্যর্থ-কুপনের ফলাফল বাসি হয়ে যায় (যেমন "মিনিমাম
  // অর্ডার"-এর কারণে ফেল করা কুপন এখন পাস করতে পারে) — তাই আবার "প্রয়োগ" করতে দিই।
  useEffect(() => {
    setFailedCoupon(null);
    setCouponError('');
  }, [subtotal, currentUser?.id]);

  const couponClearedAtRef = useRef(0);
  const handleClearFailedCoupon = () => {
    couponClearedAtRef.current = Date.now();
    setCouponCode('');
    setCouponError('');
    setFailedCoupon(null);
  };

  const handleApplyCoupon = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    setCouponError('');
    
    const clean = (customCode !== undefined ? customCode : couponCode)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .slice(0, MAX_COUPON_LEN);

    if (!clean) {
      // "মুছুন"/Clear চাপার ঠিক পরপরই আসা ফাঁকা সাবমিটে ভুয়া ওয়ার্নিং দেখানো হবে না
      if (Date.now() - couponClearedAtRef.current < 800) return false;
      setCouponError(lang === 'en' ? 'Enter a coupon code' : 'কুপন কোড লিখুন');
      showToast(lang === 'en' ? 'Enter a coupon code' : 'কুপন কোড লিখুন');
      return false;
    }

    if (subtotal <= 0) {
      showToast(lang === 'en' ? 'Add products to cart first' : 'প্রথমে কার্টে পণ্য যোগ করুন');
      return false;
    }

    setCouponLoading(true);
    const res = await validateCoupon(clean, subtotal, currentUser?.phone, currentUser?.id);
    setCouponLoading(false);

    if (!res.ok || !res.coupon) {
      const errMsg = res.error || (lang === 'en' ? 'Invalid coupon code' : 'কুপন কোডটি সঠিক নয়');
      if (res.transient) {
        // রেট-লিমিট/নেটওয়ার্ক/সার্ভার সমস্যা — কোডটা ভুল প্রমাণিত হয়নি, তাই বাটন "প্রয়োগ"ই থাকে
        setCouponError(errMsg);
      } else {
        setCouponError('');
        setFailedCoupon({ code: clean, msg: errMsg });
      }
      showToast(errMsg, 'error');
      return false;
    }

    saveAppliedCoupon(res.coupon);
    setAppliedCoupon(res.coupon);
    setCouponCode('');
    setCouponError('');
    setFailedCoupon(null);
    showToast(lang === 'en' ? `Coupon "${res.coupon.code}" applied successfully!` : `কুপন "${res.coupon.code}" সফলভাবে যুক্ত হয়েছে!`);
    return true;
  };

  const handleRemoveCoupon = () => {
    removeAppliedCoupon();
    setAppliedCoupon(null);
    setCouponError('');
    showToast(lang === 'en' ? 'Coupon removed' : 'কুপন সরানো হয়েছে');
  };

  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleCheckout = () => guardPendingLock(() => { void proceedCheckout(); });

  const proceedCheckout = async () => {
    if (!cart.length || checkoutStatus !== 'idle') {
      if (!cart.length) showToast(t('কার্ট খালি!'));
      return;
    }

    try {
      let currentDiscount = discountAmount;

      if (couponCode.trim() && !appliedCoupon) {
        setCheckoutStatus('verifying');
        const success = await handleApplyCoupon(undefined, couponCode);
        if (!success) {
          setCheckoutStatus('idle');
          return;
        }

        await new Promise((r) => setTimeout(r, 900));

        const freshlyApplied = getAppliedCoupon();
        if (freshlyApplied) {
          currentDiscount = freshlyApplied.discountAmount || 0;
        }
        setCheckoutStatus('success');
        await new Promise((r) => setTimeout(r, 300));
      }

      const currentFinalTotal = Math.max(0, subtotal - currentDiscount);

      if (currentFinalTotal > MAX_ONLINE_ORDER_TOTAL) {
        setCheckoutStatus('idle');
        onClose();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(OPEN_BULK_ORDER_EVENT, { detail: { total: currentFinalTotal } }));
        }
        return;
      }

      try {
        sessionStorage.removeItem('vc_quick_order_items');
        localStorage.removeItem('vc_quick_order_items');
      } catch {
        // ignore
      }
      onClose();
      // ড্রয়ার বন্ধ হওয়ার effect cleanup যেন নিচের router.push()-কে
      // deferred history.back() দিয়ে উল্টে না দেয়।
      suppressHistoryCleanup();
      router.push('/checkout');
    } catch (err) {
      // আগে এখানে কোনো try/catch ছিল না — কোনো silent runtime error হলে
      // চেকআউট বাটনটা কোনো ফিডব্যাক ছাড়াই আটকে থাকত। এখন ব্যর্থ হলে
      // টোস্ট দেখিয়ে বাটন আবার সচল করে দেওয়া হয়।
      console.error('handleCheckout failed:', err);
      setCheckoutStatus('idle');
      showToast(t('একটি সমস্যা হয়েছে, আবার চেষ্টা করুন'), 'error');
    }
  };

  const goToProducts = () => {
    onClose();
    document.getElementById('prodSec')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[960] bg-ink/55 backdrop-blur-[3px] transition-opacity duration-brand ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-0 z-[965] flex h-full w-full flex-col overflow-hidden bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white shadow-sh3 transition-transform duration-brand sm:inset-y-0 sm:left-auto sm:right-0 sm:my-3 sm:mr-3 sm:h-[calc(100%-24px)] sm:max-w-[440px] sm:rounded-[28px] ${
          isOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-[calc(100%+2rem)]'
        }`}
      >
        <div className="relative shrink-0 overflow-hidden border-b border-ink/10 px-6 pb-3.5 pt-5 text-left">
          <HeaderDecor />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="font-body text-[17px] font-extrabold text-ink">
                🛒 {lang === 'en' ? 'Your Cart' : 'আপনার কার্ট'}
              </h2>
              <p className="mt-0.5 font-body text-[13px] font-semibold text-muted">
                {lang === 'en'
                  ? `${totalCount} ${totalCount === 1 ? 'item' : 'items'} selected`
                  : `${totalCount}টি প্রোডাক্ট নির্বাচিত`}
              </p>
            </div>
            <motion.button
              onClick={onClose}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 480, damping: 28 }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/80 text-ink/60 shadow-sh1 backdrop-blur-[8px] transition-brand hover:bg-white hover:text-ink focus-visible:outline-none"
              aria-label="Close"
            >
              ✕
            </motion.button>
          </div>
        </div>

        <div className="sleek-scrollbar flex-1 overflow-y-auto px-6 py-3.5">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-10">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white/80 text-brand-light shadow-sm">
                <NavCartSvgIcon className="h-8 w-8" />
              </div>
              <p className="mb-1 font-body text-[15px] font-bold text-ink">
                {t('আপনার কার্ট খালি')}
              </p>
              <p className="mb-5 max-w-xs font-body text-[13px] text-muted">
                {t('পছন্দের প্রোডাক্ট যোগ করে কেনাকাটা শুরু করুন')}
              </p>
              <button
                onClick={goToProducts}
                className="rounded-full bg-gradient-to-r from-brand-light to-brand-light-hover px-6 py-2.5 font-body text-xs font-bold text-white shadow-sh2 transition-brand hover:brightness-[1.03] active:scale-95"
              >
                {t('প্রোডাক্ট দেখুন')} →
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={isOpen ? 'cart-items-open' : 'cart-items-closed'} className="space-y-3.5">
                <AnimatePresence mode="popLayout" initial={false}>
                  {cart.map((item, i) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, x: -26, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } }}
                      transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                      className="flex items-start gap-3.5 pb-3.5 border-b border-ink/10"
                    >
                    <CartItemThumb emoji={item.emoji} />

                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 font-body text-[13.5px] font-bold text-ink">
                      {item.name}
                    </div>
                    <div className="mt-0.5 font-body text-[13px] text-muted">
                      ৳{item.price.toLocaleString('en-US')} / {lang === 'en' ? 'Pcs' : 'পিছ'}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                        onClick={() => handleQty(item.id, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-ink/25 bg-transparent font-body text-xs font-bold text-ink transition-brand hover:border-ink"
                        aria-label="Decrease"
                      >
                        −
                      </motion.button>
                      <span className="inline-flex h-4 min-w-[18px] items-center justify-center overflow-hidden text-center font-body text-xs font-bold text-ink">
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={item.qty}
                            initial={{ y: -8, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 8, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                          >
                            {item.qty}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                        onClick={() => handleQty(item.id, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-ink/25 bg-transparent font-body text-xs font-bold text-ink transition-brand hover:border-ink"
                        aria-label="Increase"
                      >
                        +
                      </motion.button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between self-stretch pl-1">
                    <div className="font-body text-[14px] font-bold text-ink">
                      ৳{(item.price * item.qty).toLocaleString('en-US')}
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                      onClick={() => handleRemove(item.id)}
                      title={t('সরান')}
                      className="mt-2 flex h-7 w-7 items-center justify-center rounded-lg bg-transparent text-muted/40 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <TrashIcon />
                    </motion.button>
                  </div>
                  </motion.div>
                  ))}
                </AnimatePresence>

              <div className="pt-0.5">
                {appliedCoupon && (
                  <div className="mb-2.5 flex items-center justify-between font-body text-[13px] font-bold text-muted px-0.5">
                    <span>{lang === 'en' ? 'Subtotal' : 'সাবটোটাল'}:</span>
                    <span>৳{subtotal.toLocaleString('en-US')}</span>
                  </div>
                )}

                <AnimatePresence mode="wait" initial={false}>
                {appliedCoupon ? (
                  <motion.div
                    key="coupon-applied"
                    initial={{ opacity: 0, scale: 0.92, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
                    className="flex items-center justify-between rounded-[12px] border border-emerald-300/80 bg-emerald-50/80 px-3.5 py-2.5 shadow-xs">
                    <div className="flex items-center gap-2">
                      <motion.span
                        initial={{ scale: 0, rotate: -35 }}
                        animate={{ scale: [0, 1.25, 1], rotate: 0 }}
                        transition={{ duration: 0.4, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow-xs">
                        ✓
                      </motion.span>
                      <div>
                        <div className="font-body text-[13px] font-bold text-emerald-800">
                          {appliedCoupon.code}
                        </div>
                        <div className="font-body text-[12px] font-medium text-emerald-700">
                          {appliedCoupon.freeShipping
                            ? (lang === 'en' ? 'Free Delivery Applied' : 'ফ্রি ডেলিভারি প্রযোজ্য')
                            : `${lang === 'en' ? 'Discount:' : 'ছাড়:'} -৳${discountAmount.toLocaleString('en-US')}`}
                        </div>
                      </div>
                    </div>
                    <motion.button
                      type="button"
                      onClick={handleRemoveCoupon}
                      whileTap={{ scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                      className="rounded-full bg-emerald-100 p-1 text-xs font-bold text-emerald-700 hover:bg-emerald-200 transition-colors"
                      title={lang === 'en' ? 'Remove coupon' : 'কুপন মুছুন'}
                    >
                      ✕
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="coupon-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-2 flex items-center gap-1.5 font-body text-[13px] font-bold text-ink">
                      <CouponSvgIcon />
                      <span>{lang === 'en' ? 'Insert coupon' : 'কুপন কোড'}</span>
                    </div>

                    <form
                      onSubmit={(e) => {
                        // রিজেক্টেড কোড ইনপুটে থাকা অবস্থায় Enter চাপলে একই ভুল কোড আবার সার্ভারে পাঠানো হবে না
                        if (isFailedCouponShown) { e.preventDefault(); return; }
                        handleApplyCoupon(e);
                      }}
                      className="relative flex flex-col gap-1"
                    >
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={couponCode}
                          maxLength={MAX_COUPON_LEN}
                          onFocus={() => setIsInputFocused(true)}
                          onBlur={() => setIsInputFocused(false)}
                          onChange={(e) => {
                            const clean = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, MAX_COUPON_LEN);
                            setCouponCode(clean);
                            if (couponError) setCouponError('');
                          }}
                          placeholder={lang === 'en' ? 'Coupon' : 'কুপন কোড লিখুন...'}
                          className={`w-full rounded-[10px] border bg-transparent py-2.5 pl-3.5 pr-20 font-body text-xs uppercase text-ink outline-none transition-brand placeholder:text-muted/60 ${
                            shownCouponError ? 'border-red-400 bg-red-50/40 focus:border-red-500' : 'border-ink/20 focus:border-brand-light'
                          }`}
                        />
                        <button
                          type={isFailedCouponShown ? 'button' : 'submit'}
                          onClick={isFailedCouponShown ? (e) => { e.preventDefault(); e.stopPropagation(); handleClearFailedCoupon(); } : undefined}
                          disabled={couponLoading}
                          className={`absolute right-3.5 top-1/2 -translate-y-1/2 font-body text-[12.5px] font-bold transition-opacity active:scale-95 ${
                            isFailedCouponShown ? 'text-red-500' : 'text-brand-light'
                          } ${
                            isInputFocused && !couponCode.trim() ? 'opacity-40' : 'opacity-100'
                          }`}
                        >
                          {couponLoading
                            ? (lang === 'en' ? 'Applying...' : 'যাচাই...')
                            : isFailedCouponShown
                            ? (lang === 'en' ? 'Clear' : 'মুছুন')
                            : (lang === 'en' ? 'Apply' : 'প্রয়োগ')}
                        </button>
                      </div>
                      {shownCouponError && (
                        <motion.p
                          key={shownCouponError}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: [0, -4, 4, -3, 3, 0] }}
                          transition={{ duration: 0.35 }}
                          className="pl-1 font-body text-[12px] font-semibold text-red-500"
                        >
                          {shownCouponError}
                        </motion.p>
                      )}
                    </form>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {cart.length > 0 && (
          <div className="shrink-0 px-6 pb-6 pt-3">
            <div className="mb-4 flex items-center justify-between px-2">
              <span className="font-body text-[13.5px] font-bold text-muted">
                {t('মোট')}:
              </span>
              <span className="font-body text-[18px] font-extrabold text-brand-light">
                ৳{finalTotal.toLocaleString('en-US')}
              </span>
            </div>

            <motion.button
              onClick={handleCheckout}
              disabled={checkoutStatus !== 'idle'}
              whileTap={checkoutStatus === 'idle' ? { scale: 0.96 } : undefined}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={`card-hover-glow flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-light to-brand-light-hover py-[13.5px] font-body text-[15px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03] disabled:opacity-90 ${
                checkoutStatus === 'idle' ? 'shimmer-sheen' : ''
              }`}
            >
              {checkoutStatus === 'verifying' ? (
                <>
                  <IconSpinner />
                  <span>{lang === 'en' ? 'Verifying Coupon...' : 'কুপন যাচাই হচ্ছে...'}</span>
                </>
              ) : checkoutStatus === 'success' ? (
                <>
                  <IconCheck />
                  <span>{lang === 'en' ? 'Success!' : 'সফল!'}</span>
                </>
              ) : (
                <span>{lang === 'en' ? 'Checkout' : 'চেকআউট করুন'}</span>
              )}
            </motion.button>

            <div className="mt-2.5 flex items-center justify-center gap-1.5 font-body text-[12px] font-medium text-muted">
              <LockSecurityIcon />
              <span>
                {lang === 'en'
                  ? '100% Safe & Secure Checkout'
                  : '১০০% নিরাপদ ও সুরক্ষিত চেকআউট'}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
