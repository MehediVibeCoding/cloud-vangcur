'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { createOrder } from '@/app/actions/checkout';
import { getFingerprintId } from '@/lib/fingerprint';
import {
  checkOAuthCallback, mergeGuestOrdersToUser, signInWithGoogle,
} from '@/lib/authData';
import { useAuthStore } from '@/lib/store/authStore';
import { useCartStore } from '@/lib/store/cartStore';
import { showToast } from '@/lib/toast';
import { trackBeginCheckout, trackPurchase } from '@/lib/analytics';
import { recordLocalOrderTimestamp } from '@/lib/productData';
import { OPEN_ORDER_LIMIT_EVENT, OPEN_BULK_ORDER_EVENT } from '@/lib/uiEvents';
import { openPendingLockModal } from '@/lib/pendingLock';
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
import { getLegendaryVoucherStatus } from '@/lib/membershipData';

const LoginModal = dynamic(() => import('@/app/components/auth/LoginModal'), { ssr: false });
const PreConfirmLoginModal = dynamic(() => import('@/app/components/checkout/PreConfirmLoginModal'), { ssr: false });
const PolicyModal = dynamic(() => import('@/app/components/checkout/PolicyModal'), { ssr: false });

import {
  DISTRICTS,
  DEFAULT_SHIP_CFG,
  getShipOptions,
  getDistrictLabel,
  shipPrice,
  validatePhone,
  validateAddress,
  validateEmail,
  validateTxnId,
  fetchBkashNumber,
  fetchShipConfig,
  calculateAdvancePayment,
  MAX_ONLINE_ORDER_TOTAL,
  checkIsPrivilegedClient,
  type ShipConfig,
} from '@/lib/checkoutData';
import {
  sanitizePlainName, validateName, MAX_NAME_LEN,
  sanitizeEmailInput, sanitizeAddressInput, MAX_ADDR_LEN, sanitizePhoneInput, bnDigitsToEn, PHONE_INPUT_MAX_CHARS,
} from '@/lib/security';
import { saveDraft, clearDraft, getDraft } from '@/lib/draftRecovery';
import { sendLead } from '@/lib/leadCapture';
import { useT } from '@/lib/i18n/useT';
import { fetchMyProfile } from '@/lib/profileData';
import type { CartItem } from '@/types';
import { DesktopBackdrop } from '@/app/components/ui/DesktopBackdrop';

const MAX_COUPON_LEN = 25;
const MAX_EMAIL_LEN = 254;

interface CheckoutErrors {
  eN?: string;
  eP?: string;
  eD?: string;
  eA?: string;
  eEmail?: string;
  eShip?: string;
  eTxn?: string;
  eL4?: string;
}

const checkoutStepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -24 : 24 }),
};

const fieldLabelClass = 'mb-1.5 block font-body text-[12.5px] font-bold text-ink';
const optionalTagClass = 'font-body text-[11px] font-normal text-muted';
const fieldInputClass = (hasError?: boolean) =>
  `w-full rounded-[14px] border-[1.5px] bg-white pl-10 pr-3.5 py-2.5 font-body text-base text-ink transition-brand duration-brand outline-none ${
    hasError
      ? 'border-red-400 bg-red-50/50 focus:border-red-500'
      : 'border-border-base focus:border-brand-light focus:bg-white'
  }`;
const fieldIconClass = 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-light';
const fieldErrClass = 'mt-1.5 flex items-center gap-1 font-body text-[11.5px] font-semibold text-red-600';

// 🗺️ কাস্টম জেলা ড্রপডাউন — নেটিভ <select>-এ Android/Chrome এ প্রথমবার ওপেন করলে
// রেডিও-বাবলগুলো বাম পাশে ভুল জায়গায় ফ্ল্যাশ করে দেখানোর ব্রাউজার-নেটিভ বাগ এড়াতে
// পুরোপুরি কাস্টম লিস্টবক্স ব্যবহার করা হচ্ছে, যাতে রেন্ডারিং সবসময় আমাদের কন্ট্রোলে থাকে।
function DistrictSelect({
  value,
  onChange,
  options,
  getLabel,
  placeholder,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  getLabel: (d: string) => string;
  placeholder: string;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${fieldInputClass(hasError)} flex items-center justify-between pr-9 text-left`}
      >
        <span className={value ? '' : 'text-muted'}>{value ? getLabel(value) : placeholder}</span>
      </button>
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
        <IconChevronDown open={open} />
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[260px] overflow-y-auto rounded-[14px] border-[1.5px] border-border-base bg-white p-1.5 shadow-sh2"
          >
            {options.map((d) => (
              <button
                key={d}
                type="button"
                role="option"
                aria-selected={value === d}
                onClick={() => { onChange(d); setOpen(false); }}
                className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left font-body text-[13.5px] transition-colors ${
                  value === d ? 'bg-brand-bg/50 font-bold text-brand-light' : 'text-ink hover:bg-brand-bg/25'
                }`}
              >
                <span>{getLabel(d)}</span>
                {value === d && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
const btnNextClass =
  'shimmer-sheen w-full rounded-full bg-gradient-to-r from-info to-brand-light py-[13.5px] font-body text-[15px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03] disabled:opacity-60';

function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a4.5 4.5 0 0 0-4.5 4.5V9H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-.5V6.5A4.5 4.5 0 0 0 12 2Zm0 2.1A2.4 2.4 0 0 1 14.4 6.5V9H9.6V6.5A2.4 2.4 0 0 1 12 4.1ZM12 13.4a1.5 1.5 0 0 1 .82 2.76l-.17 2.24a.65.65 0 0 1-1.3 0l-.17-2.24A1.5 1.5 0 0 1 12 13.4Z" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function IconWarning() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path d="M13.24 3.87 21.4 18a2 2 0 0 1-1.73 3H4.32a2 2 0 0 1-1.73-3L10.76 3.87a2 2 0 0 1 3.48 0ZM12 8.75a.95.95 0 0 0-.95.95v4a.95.95 0 0 0 1.9 0v-4a.95.95 0 0 0-.95-.95Zm0 8.4a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z" />
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
function IconChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      className="transition-transform duration-300"
      style={open ? { transform: 'rotate(180deg)' } : undefined}
    >
      <path d="M5.5 8.5 12 15l6.5-6.5" />
    </svg>
  );
}
function IconSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.75" opacity="0.22" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12.75a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5Zm0 2.15c-4.55 0-8.75 2.28-8.75 5.7a1.35 1.35 0 0 0 1.35 1.35h14.8a1.35 1.35 0 0 0 1.35-1.35c0-3.42-4.2-5.7-8.75-5.7Z" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.1 2.5h2.32a1.3 1.3 0 0 1 1.26.98l.74 2.92a1.5 1.5 0 0 1-.4 1.44L9.4 9.46a1 1 0 0 0-.18 1.15 13.9 13.9 0 0 0 6.17 6.17 1 1 0 0 0 1.15-.18l1.62-1.62a1.5 1.5 0 0 1 1.44-.4l2.92.74a1.3 1.3 0 0 1 .98 1.26v2.32a1.65 1.65 0 0 1-1.8 1.65C10.99 19.71 4.29 13.01 3.45 4.3A1.65 1.65 0 0 1 5.1 2.5H7.1Z" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 22s7.5-6.6 7.5-12.2A7.5 7.5 0 1 0 4.5 9.8C4.5 15.4 12 22 12 22Zm0-9.15a2.85 2.85 0 1 1 0-5.7 2.85 2.85 0 0 1 0 5.7Z" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.7 2.35 10.55a1 1 0 0 0 .63 1.78h1.27v8.17a1 1 0 0 0 1 1H9.5a.5.5 0 0 0 .5-.5V15h4v6a.5.5 0 0 0 .5.5h4.25a1 1 0 0 0 1-1v-8.17h1.27a1 1 0 0 0 .63-1.78L12 2.7Z" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="currentColor" />
      <rect x="10.85" y="10.3" width="2.3" height="7.3" rx="1.15" fill="white" />
      <circle cx="12" cy="6.9" r="1.4" fill="white" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}
function IconBag() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.75 7V6a2.25 2.25 0 0 1 4.5 0v1H18a1 1 0 0 1 1 .93l.85 12.5a1.5 1.5 0 0 1-1.5 1.57H5.65a1.5 1.5 0 0 1-1.5-1.57L5 7.93A1 1 0 0 1 6 7h3.75Zm1.5-1v1h1.5V6a.75.75 0 0 0-1.5 0Z" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.5 2.5A1.5 1.5 0 0 0 5 4v16a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V8.5L13 2.5H6.5Zm6.5.94L18.06 8.5H14a1 1 0 0 1-1-1V3.44ZM8 12.75h8v1.5H8v-1.5Zm0 3.5h8v1.5H8v-1.5Zm0-7h4v1.5H8v-1.5Z" />
    </svg>
  );
}
function IconCard() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.5 5.5A2 2 0 0 1 5.5 3.5h13a2 2 0 0 1 2 2V8h-19V5.5Zm0 5.25V18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-7.25h-17ZM6 14h4.5v1.75H6V14Z" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12h15M13 5.5 20 12l-7 6.5" />
    </svg>
  );
}
function IconArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.5 12h-15M11 5.5 4 12l7 6.5" />
    </svg>
  );
}

export default function CheckoutPage() {
  const { t, lang } = useT();
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const [step, setStep] = useState(1);
  const [stepDirection, setStepDirection] = useState(1);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isDirectQuickOrder, setIsDirectQuickOrder] = useState(false);
  const [hasZeroAdvanceVoucher, setHasZeroAdvanceVoucher] = useState(false);

  useEffect(() => {
    // 🎖️ Legendary সদস্যের অব্যবহৃত "Zero Advance" ভাউচার আছে কিনা — একবারই
    // চেক করা হয় (RLS নিজের সারি ছাড়া কিছু ফেরত দেয় না)। কোনো ভারী
    // অর্ডার-গণনা এখানে হয় না, শুধু একটা সস্তা boolean ফ্ল্যাগ পড়া হয়।
    const user = useAuthStore.getState().currentUser;
    if (!user) return;
    let cancelled = false;
    getLegendaryVoucherStatus(supabase).then((res) => {
      if (!cancelled && res.ok) setHasZeroAdvanceVoucher(!!res.isAvailable);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (step === 3) {
      router.prefetch('/checkout/status');
    }
  }, [step, router]);

  const [name, setName] = useState('');
  // 🛡️ হানিপট — মানুষের চোখে অদৃশ্য ফিল্ড, শুধু বট পূরণ করে (নিচে JSX-এ দেখুন)
  const [hp, setHp] = useState('');
  const [phone, setPhone] = useState('');
  const [dist, setDist] = useState('');
  const [addr, setAddr] = useState('');
  const [email, setEmail] = useState('');
  const [selectedShip, setSelectedShip] = useState('');
  const [errors, setErrors] = useState<CheckoutErrors>({});

  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [showCouponInputBox, setShowCouponInputBox] = useState(false);
  const [couponError, setCouponError] = useState('');
  // 🔁 শেষ যে কুপন কোডটা সার্ভার রিজেক্ট করেছে (এবং তার এরর মেসেজ)। ইনপুটে হুবহু
  // এই কোডটাই থাকলে বাটনে "প্রয়োগ"-এর বদলে "মুছুন" দেখায়; একটা অক্ষর বদলালেই
  // (যোগ/বাদ/পরিবর্তন) আবার "প্রয়োগ" ফিরে আসে।
  const [failedCoupon, setFailedCoupon] = useState<{ code: string; msg: string } | null>(null);
  const isFailedCouponShown = !!failedCoupon && couponInput === failedCoupon.code;
  const shownCouponError = couponError || (isFailedCouponShown && failedCoupon ? failedCoupon.msg : '');

  const [step1BtnStatus, setStep1BtnStatus] = useState<'idle' | 'verifying' | 'success'>('idle');

  const [showBreakdown, setShowBreakdown] = useState(false);

  const [txn, setTxn] = useState('');
  const [last4, setLast4] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [bkashNum, setBkashNum] = useState('01816365504');
  const [copyLabel, setCopyLabel] = useState('Copy');

  const [termsChecked, setTermsChecked] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [shake, setShake] = useState(false);
  const [shipCfg, setShipCfg] = useState<ShipConfig>(DEFAULT_SHIP_CFG);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const confirmLockRef = useRef(false);
  const fingerprintIdRef = useRef('');
  // (audit P2-B1) প্রতিটা চেকআউট-চেষ্টার জন্য একটাই কী; সফল হলে পরের অর্ডারের জন্য নতুন হয়
  const idempotencyKeyRef = useRef('');

  const [confirmAnim, setConfirmAnim] = useState<'idle' | 'loading' | 'success'>('idle');
  const confirmAnimStartRef = useRef(0);
  const CONFIRM_ANIM_MIN_MS = 500;

  const [showPreConfirm, setShowPreConfirm] = useState(false);
  const [preConfirmGoogleLoading, setPreConfirmGoogleLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginInitialMode, setLoginInitialMode] = useState<'login' | 'register'>('login');
  const submitOrderNowRef = useRef<(() => void) | null>(null);
  const trackedBeginCheckoutRef = useRef(false);

  useEffect(() => {
    router.prefetch('/');
  }, [router]);

  useEffect(() => {
    setAppliedCoupon(getAppliedCoupon());
    const onCouponChange = (e: Event) => {
      const c = (e as CustomEvent<{ coupon: AppliedCoupon | null }>).detail?.coupon;
      setAppliedCoupon(c || null);
    };
    window.addEventListener(COUPON_CHANGE_EVENT, onCouponChange);
    return () => window.removeEventListener(COUPON_CHANGE_EVENT, onCouponChange);
  }, []);

  const updateStep = (n: number) => {
    setStepDirection(n >= step ? 1 : -1);
    setStep(n);
    try {
      sessionStorage.setItem('vc_checkout_step', String(n));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let hasItems = false;
    let loadedItems: CartItem[] = [];

    // ১. কুইক অর্ডারের জন্য সেশন স্টোরেজ চেক
    try {
      const quickOrder = JSON.parse(sessionStorage.getItem('vc_quick_order_items') || 'null');
      if (Array.isArray(quickOrder) && quickOrder.length) {
        setCartItems(quickOrder);
        loadedItems = quickOrder;
        hasItems = true;
        setIsDirectQuickOrder(true);
      }
    } catch {
      // ignore
    }

    // ২. কুইক অর্ডারের জন্য লোকাল স্টোরেজ ব্যাকআপ চেক
    if (!hasItems) {
      try {
        const quickOrderLs = JSON.parse(localStorage.getItem('vc_quick_order_items') || 'null');
        if (Array.isArray(quickOrderLs) && quickOrderLs.length) {
          setCartItems(quickOrderLs);
          loadedItems = quickOrderLs;
          hasItems = true;
          setIsDirectQuickOrder(true);
        }
      } catch {
        // ignore
      }
    }

    // ৩. লাইভ ইন-মেমোরি Zustand কার্ট চেক
    if (!hasItems) {
      const storeCart = useCartStore.getState().cart;
      if (Array.isArray(storeCart) && storeCart.length > 0) {
        setCartItems(storeCart);
        loadedItems = storeCart;
        hasItems = true;
        setIsDirectQuickOrder(false);
      }
    }

    // ৪. লোকাল স্টোরেজের পারসিস্টেড কার্ট চেক
    if (!hasItems) {
      try {
        const cart = JSON.parse(localStorage.getItem('vc_cart') || '[]');
        const validCart = Array.isArray(cart) ? cart : [];
        if (validCart.length > 0) {
          setCartItems(validCart);
          loadedItems = validCart;
          hasItems = true;
          setIsDirectQuickOrder(false);
        }
      } catch {
        // ignore
      }
    }

    // ৫. পূর্বে পূরণ করা ড্রাফট অর্ডার চেক
    if (!hasItems) {
      try {
        const draft = getDraft();
        if (draft && Array.isArray(draft.items) && draft.items.length > 0) {
          setCartItems(draft.items);
          loadedItems = draft.items;
          hasItems = true;
          setIsDirectQuickOrder(draft.items.length === 1);
          if (draft.name) setName((prev) => prev || draft.name || '');
          if (draft.phone) setPhone((prev) => prev || draft.phone || '');
          if (draft.dist) setDist((prev) => prev || draft.dist || '');
          if (draft.addr) setAddr((prev) => prev || draft.addr || '');
          if (draft.email) setEmail((prev) => prev || draft.email || '');
          if (draft.ship) setSelectedShip((prev) => prev || draft.ship || '');
        }
      } catch {
        // ignore
      }
    }

    // কোনো উৎস থেকেই আইটেম না পাওয়া গেলে তবেই হোমপেজে নিরাপদ রিডাইরেক্ট
    if (!hasItems) {
      showToast(t('আপনার কার্ট খালি। অনুগ্রহ করে প্রথমে একটি প্রোডাক্ট কার্টে যোগ করুন।'));
      router.replace('/');
      return;
    }

    if (!trackedBeginCheckoutRef.current && loadedItems.length > 0) {
      trackedBeginCheckoutRef.current = true;
      const initialSubtotal = loadedItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
      trackBeginCheckout(
        loadedItems.map((i) => ({
          item_id: i.id,
          item_name: i.name,
          price: i.price,
          quantity: i.qty,
          item_category: i.cat,
        })),
        initialSubtotal,
      );
    }

    let draftLoaded = false;
    try {
      const sessionDraft = JSON.parse(sessionStorage.getItem('vc_form_draft') || 'null');
      // 🛠️ ফিক্স: persistentDraft (localStorage, ২৪ ঘণ্টা পর্যন্ত পুরনো হতে পারে)
      // আগে সবসময় লোড হতো — এমনকি প্রোফাইল সম্পূর্ণ থাকলেও, ফলে সেটাই
      // প্রোফাইল/লাস্ট-অর্ডার প্রায়োরিটি লজিককে সাইলেন্টলি বাইপাস করে দিত।
      // RecoveryToast এই ড্রাফটটা এক্সপ্লিসিটলি "resume" করার জন্যই বানানো
      // (?resume=1 দিয়ে পাঠায়), তাই এখন শুধু সেই ফ্লো থেকে এলেই এটা ব্যবহার
      // হবে। sessionDraft (একই ট্যাবে টাইপ করার সময়ের ড্রাফট) আগের মতোই
      // সবসময় কাজ করবে — রিফ্রেশে টাইপ করা ডেটা হারাবে না।
      const isResumeFlow = new URLSearchParams(window.location.search).get('resume') === '1';
      const persistentDraft = isResumeFlow ? getDraft() : null;
      const activeDraft = sessionDraft || persistentDraft;

      if (activeDraft && (activeDraft.name || activeDraft.phone || activeDraft.addr)) {
        draftLoaded = true;
        if (activeDraft.name) setName(activeDraft.name);
        if (activeDraft.phone) setPhone(activeDraft.phone);
        if (activeDraft.dist) setDist(activeDraft.dist);
        if (activeDraft.addr) setAddr(activeDraft.addr);
        if (activeDraft.email) setEmail(activeDraft.email);
        if (activeDraft.txn) setTxn(activeDraft.txn);
        if (activeDraft.l4) setLast4(activeDraft.l4);
        if (activeDraft.ship) setSelectedShip(activeDraft.ship);
      }
    } catch {
      draftLoaded = false;
    }

    if (!draftLoaded) {
      const user = useAuthStore.getState().currentUser;
      if (user?.id) {
        const userId = user.id; // TS closure-narrowing fix: capture as plain string before the nested async fn
        if (user.name) setName(user.name);
        if (user.email) setEmail(user.email);
        if (user.phone) setPhone(user.phone);

        (async () => {
          try {
            // 🆕 প্রথমে "Complete Your Profile"-এ সেভ করা তথ্য (এটাই ইউজারের
            // সবচেয়ে সাম্প্রতিক/ইচ্ছাকৃতভাবে সেট করা ডিফল্ট ঠিকানা)
            const profile = await fetchMyProfile(supabase, userId);
            if (profile) {
              if (profile.name) setName((prev) => prev || profile.name);
              if (profile.phone) setPhone((prev) => prev || profile.phone);
              if (profile.district) setDist((prev) => prev || profile.district);
              if (profile.address) setAddr((prev) => prev || profile.address);
              if (profile.email) setEmail((prev) => prev || profile.email);
            }

            // প্রোফাইলে ঠিকানা/জেলা সেট করা না থাকলে সর্বশেষ অর্ডার থেকে fallback
            if (!profile?.address || !profile?.district) {
              const { data: pastOrders } = await supabase
                .from('orders')
                .select('customer_name, customer_phone, customer_district, customer_address, customer_email, shipping')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1);

              if (pastOrders && pastOrders.length > 0) {
                const last = pastOrders[0];
                setName((prev) => prev || last.customer_name || user.name || '');
                setPhone((prev) => prev || last.customer_phone || user.phone || '');
                setDist((prev) => prev || last.customer_district || '');
                setAddr((prev) => prev || last.customer_address || '');
                setEmail((prev) => prev || last.customer_email || user.email || '');
                if (last.shipping) setSelectedShip((prev) => prev || last.shipping);
              }
            }
          } catch {
            // ignore
          }
        })();
      }
    }

    try {
      const savedStep = parseInt(sessionStorage.getItem('vc_checkout_step') || '1', 10);
      if (savedStep === 2 || savedStep === 3) {
        const sDraft = JSON.parse(sessionStorage.getItem('vc_form_draft') || 'null') || getDraft();
        const dName = sDraft?.name || '';
        const dPhone = sDraft?.phone || '';
        const dDist = sDraft?.dist || '';
        const dAddr = sDraft?.addr || '';

        if (validateName(dName) && validatePhone(dPhone) && dDist && validateAddress(dAddr)) {
          setStep(savedStep);
          // পেজ রিলোড/রিজিউমের পর ধাপ ২/৩ এ ফিরলে reachedStep2Ref-ও আবার true করা —
          // নাহলে রিলোডের পরের প্রথম তথ্যের পরিবর্তনেও লিড-সিঙ্ক ভুলভাবে আটকে যাবে
          reachedStep2Ref.current = true;
        } else {
          setStep(1);
          sessionStorage.setItem('vc_checkout_step', '1');
        }
      }
    } catch {
      setStep(1);
    }

    const savedShip = sessionStorage.getItem('vc_ship');
    if (savedShip) setSelectedShip(savedShip);

    fetchBkashNumber(supabase).then(setBkashNum);
    fetchShipConfig(supabase).then(setShipCfg);
    getFingerprintId().then((id) => { fingerprintIdRef.current = id; });
  }, [router, supabase, t]);

  useEffect(() => {
    (async () => {
      let action: string | null = null;
      try { action = localStorage.getItem('vc_post_login_action'); } catch { /* ignore */ }
      if (action !== 'confirmOrder') return;

      const safeUser = await checkOAuthCallback(supabase);
      const user = safeUser || useAuthStore.getState().currentUser;
      if (!user) return;

      if (safeUser) {
        // 🛡️ আগে গেস্ট-অর্ডার জোড়া লাগানোর কাজ সম্পূর্ণ শেষ করা হচ্ছে, তারপর লগইন-স্টেট সেট করা হচ্ছে
        await mergeGuestOrdersToUser(supabase, safeUser.phone || '', safeUser.id || '');
        useAuthStore.getState().setCurrentUser(safeUser);
      }
      try { localStorage.removeItem('vc_post_login_action'); } catch { /* ignore */ }

      let pending: Record<string, unknown> | null = null;
      try {
        const raw = localStorage.getItem('vc_pending_order_data');
        localStorage.removeItem('vc_pending_order_data');
        pending = raw ? JSON.parse(raw) : null;
      } catch { /* ignore */ }
      if (pending) {
        if (pending.name) setName(pending.name as string);
        if (pending.phone) setPhone(pending.phone as string);
        if (pending.dist) setDist(pending.dist as string);
        if (pending.addr) setAddr(pending.addr as string);
        if (pending.email !== undefined) setEmail(pending.email as string);
        if (pending.txn) setTxn(pending.txn as string);
        if (pending.l4) setLast4(pending.l4 as string);
        if (pending.ship) setSelectedShip(pending.ship as string);
      }

      showToast(t('লগইন সফল — অর্ডার সম্পন্ন হচ্ছে...'));
      setTimeout(() => submitOrderNowRef.current && submitOrderNowRef.current(), 350);
    })();
  }, [supabase, t]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        'vc_form_draft',
        JSON.stringify({ name, phone, dist, addr, email, txn, l4: last4 }),
      );
    } catch {
      // ignore
    }
    saveDraft({ name, phone, dist, addr, email, items: cartItems, ship: selectedShip });
  }, [name, phone, dist, addr, email, txn, last4, cartItems, selectedShip]);

  const leadIdRef = useRef<string | null>(null);
  const orderDoneRef = useRef(false);
  const lastLeadFiredTime = useRef<number>(0);
  // 🛡️ ফিক্স: ধাপ ১ সম্পূর্ণ/যাচাই হয়ে ধাপ ২-এ পৌঁছানোর আগে এই ফ্ল্যাগ false-ই থাকে।
  // তাই ট্যাব মিনিমাইজ/বন্ধ করার সময়কার ব্যাকআপ-ট্রিগার (নিচের pagehide/visibilitychange)
  // শুধু ফোন নম্বরের দৈর্ঘ্য দেখে অসম্পূর্ণ (ধাপ ১-এই আটকে থাকা) তথ্য গুগল শিটে পাঠাবে না —
  // local draft (lib/draftRecovery.ts) ঠিকই প্রতিটা ফিল্ডে সেভ হতে থাকে, শুধু শিট-সিঙ্ক
  // আটকানো হলো। goToStep2()-এ ধাপ ১ পুরোপুরি যাচাই হওয়ার পরই এটা true হয়।
  const reachedStep2Ref = useRef(false);

  const fireLeadSafe = useCallback(() => {
    if (orderDoneRef.current || !reachedStep2Ref.current || !phone || phone.length < 10) return;
    const now = Date.now();
    if (now - lastLeadFiredTime.current < 2000) return;
    lastLeadFiredTime.current = now;

    if (!leadIdRef.current) {
      try {
        leadIdRef.current = sessionStorage.getItem('vc_lead_id') || `LD-${Date.now()}`;
        sessionStorage.setItem('vc_lead_id', leadIdRef.current);
      } catch {
        leadIdRef.current = `LD-${Date.now()}`;
      }
    }

    sendLead({
      leadId: leadIdRef.current as string,
      name,
      phone,
      dist,
      addr,
      email,
      items: cartItems,
    });
  }, [name, phone, dist, addr, email, cartItems]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') fireLeadSafe();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', fireLeadSafe);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', fireLeadSafe);
    };
  }, [fireLeadSafe]);

  const shipOptions = getShipOptions(dist);

  useEffect(() => {
    if (shipOptions.length === 1) {
      if (selectedShip !== shipOptions[0].key) {
        setSelectedShip(shipOptions[0].key);
        try {
          sessionStorage.setItem('vc_ship', shipOptions[0].key);
        } catch {
          // ignore
        }
      }
      return;
    }
    if (selectedShip && !shipOptions.some((opt) => opt.key === selectedShip)) {
      setSelectedShip('');
      try {
        sessionStorage.removeItem('vc_ship');
      } catch {
        // ignore
      }
    }
  }, [dist, selectedShip, shipOptions]);

  const selectShip = (key: string) => {
    setSelectedShip(key);
    try {
      sessionStorage.setItem('vc_ship', key);
    } catch {
      // ignore
    }
  };

  const rawSc = shipPrice(selectedShip, shipCfg);
  const sub = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  const { discountAmount } = useMemo(() => {
    return recalculateDiscount(appliedCoupon, sub);
  }, [appliedCoupon, sub]);

  const effectiveShippingCost = appliedCoupon?.freeShipping ? 0 : rawSc;
  const effectiveProductSubtotal = Math.max(0, sub - discountAmount);
  const total = Math.max(0, effectiveProductSubtotal + effectiveShippingCost);

  const advanceInfo = useMemo(() => {
    const base = calculateAdvancePayment(total);
    // 🎖️ Legendary ভাউচার সক্রিয় থাকলে অগ্রিম শূন্য দেখানো হচ্ছে — সার্ভার
    // (app/actions/checkout.ts) নিজে আবার স্বাধীনভাবে ভাউচার যাচাই করে,
    // এটা শুধু UI-এর জন্য।
    if (hasZeroAdvanceVoucher) {
      return { ...base, baseAdvance: 0, totalAdvance: 0 };
    }
    return base;
  }, [total, hasZeroAdvanceVoucher]);

  const balance = Math.max(0, total - advanceInfo.totalAdvance);

  // সাবটোটাল বা ফোন নম্বর বদলালে আগের ব্যর্থ-কুপনের ফলাফল বাসি হয়ে যায় (যেমন "মিনিমাম
  // অর্ডার"-এর কারণে ফেল করা কুপন এখন পাস করতে পারে) — তাই আবার "প্রয়োগ" করতে দিই।
  useEffect(() => {
    setFailedCoupon(null);
    setCouponError('');
  }, [sub, phone]);

  const couponClearedAtRef = useRef(0);
  const handleClearFailedCoupon = () => {
    couponClearedAtRef.current = Date.now();
    setCouponInput('');
    setCouponError('');
    setFailedCoupon(null);
  };

  const handleApplyCoupon = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    setCouponError('');
    
    const clean = (customCode !== undefined ? customCode : couponInput)
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

    setCouponLoading(true);
    const user = useAuthStore.getState().currentUser;
    const res = await validateCoupon(clean, sub, phone || user?.phone, user?.id, fingerprintIdRef.current);
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
    setCouponInput('');
    setCouponError('');
    setFailedCoupon(null);
    setShowCouponInputBox(false);
    showToast(lang === 'en' ? `Coupon "${res.coupon.code}" applied successfully!` : `কুপন "${res.coupon.code}" সফলভাবে যুক্ত হয়েছে!`);
    return true;
  };

  const handleRemoveCoupon = () => {
    removeAppliedCoupon();
    setAppliedCoupon(null);
    setCouponError('');
    showToast(lang === 'en' ? 'Coupon removed' : 'কুপন সরানো হয়েছে');
  };

  const goToStep2 = async () => {
    if (cartItems.length === 0 || step1BtnStatus !== 'idle') {
      if (!cartItems.length) showToast(t('আপনার কার্ট খালি। অনুগ্রহ করে প্রথমে একটি প্রোডাক্ট কার্টে যোগ করুন।'));
      return;
    }

    // 🛡️ শুধুমাত্র DB-ভিত্তিক অ্যাডমিন/মডারেটর যাচাই (আগে হার্ডকোডেড ইমেইল ছিল)
    const user = useAuthStore.getState().currentUser;
    const isMod = await checkIsPrivilegedClient(supabase, user?.id);

    if (isDirectQuickOrder && couponInput.trim() && !appliedCoupon) {
      setStep1BtnStatus('verifying');
      const success = await handleApplyCoupon(undefined, couponInput);
      if (!success) {
        setStep1BtnStatus('idle');
        return;
      }

      await new Promise((r) => setTimeout(r, 900));
      setStep1BtnStatus('success');
      await new Promise((r) => setTimeout(r, 300));
      setStep1BtnStatus('idle');
    }

    if (!isMod && total > MAX_ONLINE_ORDER_TOTAL) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(OPEN_BULK_ORDER_EVENT, { detail: { total } }));
      }
      return;
    }

    const nextErrors: CheckoutErrors = {};
    if (!validateName(name)) nextErrors.eN = name.trim() ? t('নাম কমপক্ষে ৩ অক্ষরের হতে হবে') : t('নাম দিন');
    if (!validatePhone(phone.trim())) nextErrors.eP = t('দয়া করে সঠিক মোবাইল নম্বর দিন');
    if (!dist) nextErrors.eD = t('জেলা সিলেক্ট করুন');
    if (!validateAddress(addr.trim())) nextErrors.eA = t('দয়া করে বিস্তারিত ঠিকানা দিন (যেমন: রোড বা বাসা নম্বর)');
    if (email.trim() && !validateEmail(email.trim())) nextErrors.eEmail = t('সঠিক ইমেইল লিখুন (যেমন: name@gmail.com)');
    if (!selectedShip) nextErrors.eShip = t('শিপিং অপশন সিলেক্ট করুন');
    setErrors(nextErrors);
    
    if (Object.keys(nextErrors).length === 0) {
      reachedStep2Ref.current = true;
      fireLeadSafe();
      updateStep(2);
    }
  };

  const goToStep3 = () => {
    if (hasZeroAdvanceVoucher) {
      updateStep(3);
      return;
    }
    const txnUpper = txn.trim().toUpperCase();
    const l4 = last4.trim();
    if (!txnUpper && !l4) {
      setErrors((e) => ({ ...e, eTxn: t('ট্রানজেকশন আইডি অবশ্যই ১০ ক্যারেক্টার হতে হবে'), eL4: t('Transaction ID অথবা শেষ ৪ ডিজিট দিন') }));
      return;
    }
    if (txnUpper) {
      if (!validateTxnId(txnUpper)) {
        setErrors((e) => ({ ...e, eTxn: t('দয়া করে সঠিক ১০ সংখ্যার বিকাশ ট্রানজেকশন আইডি দিন') }));
        return;
      }
      setTxn(txnUpper);
    }
    if (l4 && l4.length !== 4) {
      setErrors((e) => ({ ...e, eL4: t('Transaction ID অথবা শেষ ৪ ডিজিট দিন') }));
      return;
    }
    setErrors((e) => ({ ...e, eTxn: undefined, eL4: undefined }));
    updateStep(3);
  };

  const goBack = (n: number) => updateStep(n);

  const toggleTerms = () => {
    setTermsChecked((v) => !v);
    setTermsError(false);
  };

  const policyAgreeAndConfirm = () => {
    setTermsChecked(true);
    setPolicyModalOpen(false);
    if (!useAuthStore.getState().currentUser) {
      setTimeout(() => {
        setShowPreConfirm(true);
      }, 150);
      return;
    }
    submitOrderNow();
  };

  const copyBkash = async () => {
    const num = bkashNum.replace(/\D/g, '');
    try {
      await navigator.clipboard.writeText(num);
    } catch {
      // ignore
    }
    setCopyLabel(t('কপি হয়েছে!'));
    setTimeout(() => setCopyLabel('Copy'), 2000);
  };

  const handleConfirmClick = () => {
    if (!termsChecked) {
      setTermsError(true);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    if (!useAuthStore.getState().currentUser) {
      setShowPreConfirm(true);
      return;
    }
    confirmAnimStartRef.current = Date.now();
    setConfirmAnim('loading');
    router.prefetch('/checkout/status');
    submitOrderNow();
  };

  const submitOrderNow = useCallback(async () => {
    if (confirmLockRef.current) return;

    // 🛡️ শুধুমাত্র DB-ভিত্তিক অ্যাডমিন/মডারেটর যাচাই (আগে হার্ডকোডেড ইমেইল ছিল)
    const user = useAuthStore.getState().currentUser;
    const isMod = await checkIsPrivilegedClient(supabase, user?.id);

    if (!isMod && total > MAX_ONLINE_ORDER_TOTAL) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(OPEN_BULK_ORDER_EVENT, { detail: { total } }));
      }
      setConfirmAnim('idle');
      return;
    }

    confirmLockRef.current = true;
    setSubmitting(true);

    if (!idempotencyKeyRef.current) {
      try {
        idempotencyKeyRef.current = crypto.randomUUID();
      } catch {
        idempotencyKeyRef.current = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
      }
    }

    // 🛠️ ফিক্স: আগে fingerprintIdRef শুধু mount-এ (fire-and-forget) সেট হতো —
    // ইউজার ফর্ম দ্রুত সাবমিট করলে (বা autofill থাকলে) প্রমিজ রিজলভ হওয়ার আগেই
    // খালি ভ্যালু পাঠিয়ে দিত, ফলে ডিভাইস-লিমিট চেকটাই স্কিপ হয়ে যেত। এখন সাবমিটের
    // ঠিক আগে (সর্বোচ্চ ২.৫ সেকেন্ড অপেক্ষা করে) ভ্যালু নিশ্চিত করা হচ্ছে।
    if (!fingerprintIdRef.current) {
      try {
        fingerprintIdRef.current = await Promise.race([
          getFingerprintId(),
          new Promise<string>((resolve) => setTimeout(() => resolve(''), 2500)),
        ]);
      } catch {
        // ফিঙ্গারপ্রিন্ট সত্যিই না পাওয়া গেলেও চেকআউট আটকানো হবে না —
        // সার্ভার-সাইড IP-ভিত্তিক ব্যাকস্টপ থাকায় এটা এখন নিরাপদ
      }
    }

    try {
      const result = await createOrder({
        hp,
        name: name.trim(),
        phone: phone.trim(),
        district: dist,
        address: addr.trim(),
        email: email.trim(),
        shipping: selectedShip,
        items: cartItems.map((i) => ({ id: String(i.id), qty: i.qty })),
        paymentTxn: txn.trim(),
        paymentLast4: last4.trim(),
        fingerprintId: fingerprintIdRef.current,
        idempotencyKey: idempotencyKeyRef.current,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        lang,
      });

      if (!result.ok || !result.data) {
        setSubmitting(false);
        setConfirmAnim('idle');
        confirmLockRef.current = false;

        if (result.lock) {
          openPendingLockModal(result.lock);
          return;
        }

        if (!isMod && (result.error?.includes('অপেক্ষা') || result.error?.includes('wait') || result.error?.includes('সীমা') || result.error?.includes('limit'))) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(OPEN_ORDER_LIMIT_EVENT));
          }
        } else if (!isMod && (result.error?.includes('২০,০০০') || result.error?.includes('20,000') || result.error?.includes('WhatsApp'))) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(OPEN_BULK_ORDER_EVENT, { detail: { total } }));
          }
        } else {
          showToast(result.error || t('দুঃখিত, অর্ডার সেভ করা যায়নি। আবার চেষ্টা করুন।'), 'error');
        }
        return;
      }

      const { id: orderId, orderNum: num } = result.data;
      idempotencyKeyRef.current = ''; // সফল — পরের অর্ডার নতুন কী পাবে
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id || null;

      recordLocalOrderTimestamp();
      removeAppliedCoupon();

      trackPurchase(
        num,
        total,
        effectiveShippingCost,
        cartItems.map((i) => ({
          item_id: i.id,
          item_name: i.name,
          price: i.price,
          quantity: i.qty,
          item_category: i.cat,
        })),
      );

      useCartStore.getState().clearCart();
      orderDoneRef.current = true;
      clearDraft();
      try {
        sessionStorage.removeItem('vc_form_draft');
        sessionStorage.removeItem('vc_lead_id');
        sessionStorage.removeItem('vc_quick_order_items');
        localStorage.removeItem('vc_quick_order_items');
        sessionStorage.removeItem('vc_checkout_step');
        localStorage.setItem('vc_pending_ls', String(orderId));
        localStorage.setItem('vc_pending_num_ls', num);
        localStorage.setItem('vc_pending_phone_ls', phone.trim());
        localStorage.setItem('vc_pending_ts', String(Date.now()));
        localStorage.setItem('vc_last_order_time', String(Date.now()));
        sessionStorage.setItem('vc_just_submitted', '1');
      } catch {
        // ignore
      }
      if (!currentUserId) {
        try {
          const guestOrders = JSON.parse(localStorage.getItem('vc_guest_orders') || '[]');
          guestOrders.push({ id: orderId, orderNum: num, phone: phone.trim() });
          localStorage.setItem('vc_guest_orders', JSON.stringify(guestOrders));
        } catch {
          // ignore
        }
      }

      const elapsed = Date.now() - confirmAnimStartRef.current;
      const remaining = Math.max(0, CONFIRM_ANIM_MIN_MS - elapsed);
      window.setTimeout(() => {
        setConfirmAnim('success');
        window.setTimeout(() => {
          router.push('/checkout/status');
        }, 650);
      }, remaining);
    } catch {
      setSubmitting(false);
      setConfirmAnim('idle');
      confirmLockRef.current = false;
      showToast(t('নেটওয়ার্ক সমস্যা হয়েছে। আবার চেষ্টা করুন।'));
    }
  }, [total, name, phone, dist, addr, email, selectedShip, cartItems, txn, last4, appliedCoupon, lang, effectiveShippingCost, router, supabase, t]);

  useEffect(() => { submitOrderNowRef.current = submitOrderNow; }, [submitOrderNow]);

  const preConfirmSkip = () => {
    setShowPreConfirm(false);
    submitOrderNow();
  };

  const preConfirmGoLogin = () => {
    setShowPreConfirm(false);
    setTimeout(() => {
      setLoginInitialMode('login');
      setShowLoginModal(true);
    }, 150);
  };

  const preConfirmGoGoogle = async () => {
    if (preConfirmGoogleLoading) return;
    setPreConfirmGoogleLoading(true);
    const pendingData = {
      items: cartItems, ship: selectedShip, name, phone, dist, addr, email, txn, l4: last4, savedAt: Date.now(),
    };
    try {
      localStorage.setItem('vc_pending_order_data', JSON.stringify(pendingData));
      localStorage.setItem('vc_post_login_action', 'confirmOrder');
    } catch {
      // ignore
    }
    // ⚠️ পপআপ এখানে বন্ধ করা হচ্ছে না: useHistoryModal বন্ধের সময় deferred history.back() চালায়,
    // যা গুগলে রিডাইরেক্টকে উল্টে দিত (বাটনে ক্লিক করলে শুধু পপআপ উধাও হতো)। রিডাইরেক্টে পেজ ছেড়ে গেলে পপআপ এমনিতেই যাবে।
    let failed = false;
    try {
      const { error } = await signInWithGoogle(supabase, '/checkout');
      failed = !!error;
    } catch {
      failed = true;
    }
    if (failed) {
      setPreConfirmGoogleLoading(false);
      showToast(t('Google লগইন ব্যর্থ হয়েছে'));
      try {
        localStorage.removeItem('vc_pending_order_data');
        localStorage.removeItem('vc_post_login_action');
      } catch {
        // ignore
      }
    }
  };

  return (
    <>
      <div className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-brand-bg/45 via-[#DCEBFD]/55 to-white sm:py-6 lg:bg-none lg:py-10">
        {/* 💻 শুধু ল্যাপটপ: ফিক্সড প্রিমিয়াম ব্যাকগ্রাউন্ড — স্ক্রলে নড়ে না */}
        <DesktopBackdrop />

        <div className="relative z-10 mx-auto min-h-dvh w-full max-w-[580px] overflow-hidden bg-gradient-to-b from-white/95 via-[#F3F8FE]/95 to-white shadow-sh3 sm:min-h-0 sm:rounded-[28px] sm:ring-1 sm:ring-white/80 lg:min-h-0 lg:rounded-[28px] lg:shadow-[0_30px_70px_-24px_rgba(0,88,199,0.32)] dark:lg:shadow-[0_30px_70px_-24px_rgba(0,0,0,0.6)] lg:ring-1 lg:ring-white/80">

          <div className="rounded-b-[22px] rounded-t-none bg-gradient-to-br from-[#85C2FA] to-brand-light px-5 pb-3.5 pt-3.5 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-brand-light shadow-xs">
                  <IconLock />
                </span>
                <h2 className="font-body text-[15.5px] font-extrabold text-white">
                  {step === 1 ? t('নিরাপদ চেকআউট') : step === 2 ? t('নিরাপদ পেমেন্ট') : t('নিরাপদ নিশ্চিতকরণ')}
                </h2>
              </div>
              {step === 1 ? (
                <motion.button
                  type="button"
                  aria-label={t('বন্ধ করুন')}
                  title={t('বন্ধ করুন')}
                  onClick={() => {
                    try {
                      sessionStorage.removeItem('vc_quick_order_items');
                      localStorage.removeItem('vc_quick_order_items');
                    } catch {
                      // ignore
                    }
                    // 🔁 এখানে ইচ্ছাকৃতভাবে router.replace('/') ব্যবহার করা হচ্ছে —
                    // চেকআউটে যে পথ (অ্যাকাউন্ট/হোম/ড্রাফট-রিকভারি, যেখান থেকেই)
                    // দিয়েই আসা হোক না কেন, ক্রস বাটন সবসময় ১০০% নিশ্চিতভাবে
                    // হোমপেজে (/) নিয়ে যাবে, এবং চেকআউট এন্ট্রিটা হিস্ট্রি
                    // স্ট্যাক থেকে replace হয়ে যাবে বলে হোম থেকে ফিজিক্যাল ব্যাক
                    // চাপলে আবার চেকআউটে ফিরে আসার কোনো সুযোগ থাকবে না।
                    router.replace('/');
                  }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/35 text-white shadow-xs backdrop-blur-[8px] transition-brand hover:bg-white/45"
                >
                  <IconClose />
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => goBack(step - 1)}
                  aria-label={t('আগের ধাপে যান')}
                  title={t('আগের ধাপে যান')}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/35 text-white shadow-xs backdrop-blur-[8px] transition-brand hover:bg-white/45"
                >
                  <IconArrowLeft />
                </motion.button>
              )}
            </div>
          </div>

          {step === 1 && isDirectQuickOrder && cartItems.length === 1 && (
            <div className="mx-6 mb-2 mt-3 rounded-[18px] border border-brand-light/35 bg-white/90 p-4 shadow-xs backdrop-blur-md">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-body text-[11.5px] font-bold uppercase tracking-wide text-brand-light">
                  <IconBag /> {lang === 'en' ? 'YOUR ORDER' : 'আপনার অর্ডার'}
                </div>
                
                {!appliedCoupon && (
                  <button
                    type="button"
                    onClick={() => setShowCouponInputBox((v) => !v)}
                    className="font-body text-[11.5px] font-bold text-brand-light hover:underline transition-colors cursor-pointer"
                  >
                    {showCouponInputBox ? (lang === 'en' ? 'Hide coupon' : 'লুকান') : (lang === 'en' ? 'Have a coupon code?' : 'কুপন কোড আছে?')}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1 text-ink">
                {cartItems.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-3 font-body text-[13.5px] font-bold">
                    <span className="line-clamp-2 leading-snug">{i.name} × {i.qty}</span>
                    <span className="shrink-0 font-extrabold text-brand-light">৳{(i.price * i.qty).toLocaleString('en-US')}</span>
                  </div>
                ))}
              </div>

              {!appliedCoupon && showCouponInputBox && (
                <div className="mt-3 pt-2.5 border-t border-border-base/70">
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
                        value={couponInput}
                        maxLength={MAX_COUPON_LEN}
                        onChange={(e) => {
                          const clean = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, MAX_COUPON_LEN);
                          setCouponInput(clean);
                          if (couponError) setCouponError('');
                        }}
                        placeholder={lang === 'en' ? 'Coupon' : 'কুপন কোড লিখুন...'}
                        className={`w-full rounded-[10px] border bg-white py-2 pl-3 pr-20 font-body text-xs uppercase text-ink outline-none transition-brand placeholder:text-muted/60 ${
                          shownCouponError ? 'border-red-400 bg-red-50/40 focus:border-red-500' : 'border-ink/20 focus:border-brand-light'
                        }`}
                      />
                      <button
                        type={isFailedCouponShown ? 'button' : 'submit'}
                        onClick={isFailedCouponShown ? (e) => { e.preventDefault(); e.stopPropagation(); handleClearFailedCoupon(); } : undefined}
                        disabled={couponLoading || !couponInput.trim()}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center font-body text-[12.5px] font-bold transition-colors disabled:opacity-40 active:scale-95 ${
                          isFailedCouponShown ? 'text-red-500 hover:text-red-600' : 'text-brand-light hover:text-brand-light-hover'
                        }`}
                      >
                        {couponLoading ? (lang === 'en' ? 'Applying...' : 'যাচাই...') : isFailedCouponShown ? (lang === 'en' ? 'Clear' : 'মুছুন') : (lang === 'en' ? 'Apply' : 'প্রয়োগ')}
                      </button>
                    </div>
                    {shownCouponError && (
                      <p className="pl-1 font-body text-[12px] font-semibold text-red-500">{shownCouponError}</p>
                    )}
                  </form>
                </div>
              )}

              {appliedCoupon && (
                <div className="mt-3 pt-2.5 border-t border-border-base/70">
                  <div className="flex items-center justify-between rounded-[12px] border border-emerald-300/80 bg-emerald-50/90 px-3.5 py-2 shadow-xs animate-section-reveal">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white shadow-xs">
                        ✓
                      </span>
                      <div>
                        <div className="font-body text-[12px] font-extrabold uppercase text-emerald-800 leading-tight">
                          {appliedCoupon.code}
                        </div>
                        <div className="font-body text-[10.5px] font-semibold text-emerald-700 leading-tight">
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
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex px-6 pb-2 pt-5 sm:pt-6">
            {[{ n: 1, label: t('তথ্য') }, { n: 2, label: t('পেমেন্ট') }, { n: 3, label: t('নিশ্চিত') }].map((s) => {
              const isDone = step > s.n;
              const isActive = step === s.n;
              return (
                <div
                  key={s.n}
                  className={`relative flex-1 text-center font-body text-[11.5px] font-semibold after:absolute after:left-1/2 after:top-3 after:z-[1] after:h-[2px] after:w-full after:content-[''] last:after:hidden ${isActive || isDone ? 'text-ink font-bold' : 'text-muted'} ${isDone ? 'after:bg-brand-light' : 'after:bg-brand-light/20'}`}
                >
                  <div
                    className={`relative z-10 mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] font-body text-[11px] font-bold transition-all duration-300 ${isDone || isActive ? 'border-brand-light bg-brand-light text-white shadow-xs' : 'border-brand-light/40 bg-white text-brand-light'}`}
                  >
                    {isDone ? <IconCheck /> : s.n}
                  </div>
                  <div>{s.label}</div>
                </div>
              );
            })}
          </div>

          <div className="px-6 pb-1 pt-1">
            <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-brand-light/15">
              <div
                className="h-full rounded-full bg-brand-light transition-[width] duration-300"
                style={{ width: `${{ 1: 33, 2: 66, 3: 100 }[step]}%` }}
              />
            </div>
            <div className="text-right font-body text-[11px] font-bold text-brand-light">
              {step === 3 ? t('প্রায় সম্পন্ন!') : step === 2 ? t('আর মাত্র ১ ধাপ!') : t('আর মাত্র ২ ধাপ!')}
            </div>
          </div>

          <AnimatePresence mode="wait" custom={stepDirection}>
          {step === 1 && (
            <motion.div
              key="checkout-step-1"
              custom={stepDirection}
              variants={checkoutStepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
              className="px-6 py-4"
            >
              {/* 🛡️ হানিপট ফিল্ড — মানুষের চোখে/স্ক্রিন-রিডারে একদমই দেখা যায় না, ট্যাব
                  করেও ফোকাস পাওয়া যায় না; শুধু অটো-ফিল করা বট/স্ক্রিপ্ট এটা ধরতে পারে।
                  সার্ভারে (app/actions/checkout.ts) এই ফিল্ডে কিছু এলেই বট ধরে বাতিল হয়। */}
              <input
                type="text"
                name="company_website"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  width: '1px',
                  height: '1px',
                  opacity: 0,
                  pointerEvents: 'none',
                }}
              />
              <div className="mb-3.5">
                <label className={fieldLabelClass}>{t('পূর্ণ নাম')}</label>
                <div className="relative">
                  <span className={fieldIconClass}><IconUser /></span>
                  <input
                    className={fieldInputClass(!!errors.eN)}
                    value={name}
                    maxLength={MAX_NAME_LEN}
                    onChange={(e) => setName(sanitizePlainName(e.target.value))}
                    placeholder={t('আপনার পূর্ণ নাম')}
                  />
                </div>
                {errors.eN && <div className={fieldErrClass}><IconWarning />{errors.eN}</div>}
              </div>

              <div className="mb-3.5">
                <label className={fieldLabelClass}>{t('ফোন নম্বর')} <span className={optionalTagClass}>{t('(বাংলাদেশি নম্বর)')}</span></label>
                <div className="relative">
                  <span className={fieldIconClass}><IconPhone /></span>
                  <input
                    className={fieldInputClass(!!errors.eP)}
                    value={phone}
                    maxLength={PHONE_INPUT_MAX_CHARS}
                    inputMode="tel"
                    onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
                {errors.eP && <div className={fieldErrClass}><IconWarning />{errors.eP}</div>}
              </div>

              <div className="mb-3.5">
                <label className={fieldLabelClass}>{t('জেলা')}</label>
                <div className="relative">
                  <span className={fieldIconClass}><IconPin /></span>
                  <DistrictSelect
                    value={dist}
                    onChange={setDist}
                    options={DISTRICTS}
                    getLabel={(d) => getDistrictLabel(d, lang)}
                    placeholder={lang === 'en' ? 'Select District' : 'জেলা সিলেক্ট করুন'}
                    hasError={!!errors.eD}
                  />
                </div>
                {errors.eD && <div className={fieldErrClass}><IconWarning />{errors.eD}</div>}
              </div>

              <div className="mb-3.5">
                <label className={fieldLabelClass}>{t('সম্পূর্ণ ডেলিভারি ঠিকানা')}</label>
                <div className="relative">
                  <span className={`${fieldIconClass} top-4 translate-y-0`}><IconHome /></span>
                  <textarea
                    className={fieldInputClass(!!errors.eA)}
                    rows={3}
                    value={addr}
                    maxLength={MAX_ADDR_LEN}
                    onChange={(e) => setAddr(sanitizeAddressInput(e.target.value))}
                    placeholder={t('গ্রাম/মহল্লা, রোড, বাসা নম্বর সহ বিস্তারিত লিখুন')}
                  />
                </div>
                {errors.eA && <div className={`${fieldErrClass} -mt-1`}><IconWarning />{errors.eA}</div>}
              </div>

              <div className="mb-3.5">
                <label className={fieldLabelClass}>{t('ইমেইল')} <span className={optionalTagClass}>{t('(ঐচ্ছিক — ইনভয়েস পাঠানো হবে)')}</span></label>
                <div className="relative">
                  <span className={fieldIconClass}><IconMail /></span>
                  <input
                    className={fieldInputClass(!!errors.eEmail)}
                    type="email"
                    value={email}
                    maxLength={MAX_EMAIL_LEN}
                    onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))}
                    placeholder="yourname@gmail.com"
                  />
                </div>
                {errors.eEmail && <div className={fieldErrClass}><IconWarning />{errors.eEmail}</div>}
              </div>

              {shipOptions.length > 0 && (
                <div className="mb-4">
                  <label className={fieldLabelClass}>{t('শিপিং')}</label>
                  <div className="flex flex-col gap-2.5">
                    {shipOptions.map((opt) => (
                      <label
                        key={opt.key}
                        className={`flex cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] px-3.5 py-3 transition-brand duration-brand ${selectedShip === opt.key ? 'border-brand-light bg-brand-bg/25 ring-1 ring-brand-light/30' : 'border-border-base bg-white/70 hover:bg-white'}`}
                        onClick={() => selectShip(opt.key)}
                      >
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${selectedShip === opt.key ? 'border-brand-light bg-brand-light' : 'border-border-base bg-white'}`}>
                          {selectedShip === opt.key && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="font-body text-[13px] font-bold text-ink">{lang === 'en' ? opt.nameEn : opt.name}</div>
                          <div className="font-body text-[11px] text-muted">{lang === 'en' ? opt.subEn : opt.sub}</div>
                        </div>
                        
                        {appliedCoupon?.freeShipping ? (
                          <div className="ml-auto flex items-center gap-2 rounded-[12px] border border-emerald-300/80 bg-emerald-50/90 px-3 py-1.5 shadow-xs">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white shadow-xs">
                              ✓
                            </span>
                            <div className="text-left">
                              <div className="font-body text-[12px] font-extrabold uppercase leading-tight text-emerald-800">
                                {appliedCoupon.code}
                              </div>
                              <div className="font-body text-[10.5px] font-semibold leading-tight text-emerald-700">
                                {lang === 'en' ? 'Free Delivery Applied' : 'ফ্রি ডেলিভারি প্রযোজ্য'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="ml-auto font-body text-sm font-extrabold text-brand-light">
                            ৳{shipPrice(opt.key, shipCfg)}
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                  {errors.eShip && <div className={fieldErrClass}><IconWarning />{errors.eShip}</div>}
                </div>
              )}

              <div className="pt-2">
                <motion.button
                  className={`${btnNextClass} flex items-center justify-center gap-2`}
                  onClick={goToStep2}
                  disabled={step1BtnStatus !== 'idle'}
                  whileTap={step1BtnStatus === 'idle' ? { scale: 0.97 } : undefined}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  {step1BtnStatus === 'verifying' ? (
                    <>
                      <IconSpinner />
                      <span>{lang === 'en' ? 'Verifying Coupon...' : 'কুপন যাচাই হচ্ছে...'}</span>
                    </>
                  ) : step1BtnStatus === 'success' ? (
                    <>
                      <IconCheck />
                      <span>{lang === 'en' ? 'Success!' : 'সফল!'}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('পরবর্তী ধাপ: পেমেন্ট')}</span>
                      <IconArrowRight />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="checkout-step-2"
              custom={stepDirection}
              variants={checkoutStepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
              className="px-6 py-4"
            >
              {hasZeroAdvanceVoucher ? (
                <>
                  <div className="mb-4 rounded-[20px] border border-emerald-300/70 bg-gradient-to-br from-emerald-50 via-white to-[#ECFDF5] p-5 text-center shadow-xs">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <IconCheck />
                    </div>
                    <h4 className="font-body text-[16px] font-extrabold text-emerald-900">
                      {lang === 'en' ? '100% Cash on Delivery — No Advance Needed' : '১০০% ক্যাশ অন ডেলিভারি — কোনো অগ্রিম লাগবে না'}
                    </h4>
                    <p className="mt-1.5 font-body text-[12.5px] leading-relaxed text-emerald-800/90">
                      {lang === 'en'
                        ? 'This is your one-time Legendary member reward. Pay the full amount in cash when your order is delivered.'
                        : 'এটি আপনার একবারের লিজেন্ডারি মেম্বার রিওয়ার্ড। ডেলিভারির সময় সম্পূর্ণ টাকা ক্যাশে পরিশোধ করবেন।'}
                    </p>
                    <div className="mt-3.5 flex items-center justify-center gap-2 font-body text-sm font-extrabold text-emerald-900">
                      <span>{lang === 'en' ? 'Amount due on delivery:' : 'ডেলিভারিতে পরিশোধযোগ্য:'}</span>
                      <span>৳{total.toLocaleString('en-US')}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <motion.button
                      className={`${btnNextClass} flex items-center justify-center gap-2 cursor-pointer`}
                      onClick={goToStep3}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <span>{t('পরবর্তী ধাপ: নিশ্চিত করুন')}</span>
                      <IconArrowRight />
                    </motion.button>
                  </div>
                </>
              ) : (
                <>
              <div className="mb-4 rounded-[20px] border border-border-base bg-white p-5 shadow-xs">
                <div className="mb-2 flex items-center gap-2 font-body text-[15px] font-bold text-ink">
                  <span className="text-brand-light"><IconCard /></span>
                  <span>{t('এডভান্স পেমেন্ট')}</span>
                  <span className="font-body text-[17px] font-extrabold text-brand-light">
                    ৳{advanceInfo.totalAdvance.toLocaleString('en-US')}
                  </span>
                </div>
                
                <p className="mb-3.5 font-body text-[12.5px] leading-[1.7] text-muted">
                  {advanceInfo.isHighValue ? (
                    lang === 'en' ? (
                      <>
                        To confirm your order, please Send Money{' '}
                        <strong className="text-ink">৳{advanceInfo.totalAdvance.toLocaleString('en-US')}</strong> (5% advance on total bill) to the bKash number below.{' '}
                        <button
                          type="button"
                          onClick={() => setShowBreakdown((v) => !v)}
                          className="inline font-bold text-brand-light transition-colors hover:text-brand-light-hover ml-1 cursor-pointer"
                        >
                          View Breakdown {showBreakdown ? '↑' : '↓'}
                        </button>
                      </>
                    ) : (
                      <>
                        আপনার অর্ডারটি নিশ্চিত করতে সর্বমোট বিলের ৫% অগ্রিম সহ মোট{' '}
                        <strong className="text-ink">{advanceInfo.totalAdvance.toLocaleString('en-US')} টাকা</strong> নিচের bKash নম্বরে Send Money করুন।{' '}
                        <button
                          type="button"
                          onClick={() => setShowBreakdown((v) => !v)}
                          className="inline font-bold text-brand-light transition-colors hover:text-brand-light-hover ml-1 cursor-pointer"
                        >
                          বিস্তারিত হিসাব {showBreakdown ? '↑' : '↓'}
                        </button>
                      </>
                    )
                  ) : (
                    lang === 'en' ? (
                      <>To confirm your order, please Send Money <strong className="text-ink">200 BDT</strong> to the bKash number below.</>
                    ) : (
                      <>অর্ডার নিশ্চিত করতে নিচের bKash নম্বরে ২০০ টাকা Send Money করুন।</>
                    )
                  )}
                </p>

                {advanceInfo.isHighValue && showBreakdown && (
                  <div className="mb-3.5 rounded-[14px] border border-brand-light/35 bg-[#F8FAFC] p-3.5 font-body text-xs shadow-xs transition-all duration-300 animate-section-reveal">
                    <div className="mb-2 font-bold text-ink flex items-center justify-between border-b border-border-base/70 pb-1.5">
                      <span className="font-bold text-ink">{lang === 'en' ? 'Advance Fee Breakdown' : 'অগ্রিম ফি হিসাব'}</span>
                      <span className="text-[11.5px] text-ink font-bold">
                        {lang === 'en' ? 'Total Bill:' : 'ডেলিভারি সহ মোট বিল:'} ৳{total.toLocaleString('en-US')}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5 text-muted font-normal">
                      <span>{lang === 'en' ? '• 5% Base Advance:' : '• ৫% মূল অগ্রিম:'}</span>
                      <span className="text-muted font-normal">৳{advanceInfo.baseAdvance.toLocaleString('en-US')}</span>
                    </div>
                    <div className="my-1.5 h-px border-t border-dashed border-border-base" />
                    <div className="flex justify-between py-0.5 text-brand-light font-bold">
                      <span>{lang === 'en' ? 'Total Advance Payment:' : 'টোটাল এডভান্স পেমেন্ট:'}</span>
                      <span className="font-extrabold text-[13px]">৳{advanceInfo.totalAdvance.toLocaleString('en-US')}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-ink font-bold">
                      <span>{lang === 'en' ? 'Due on Delivery (COD):' : 'বাকি ক্যাশ অন ডেলিভারি (COD):'}</span>
                      <span>৳{balance.toLocaleString('en-US')}</span>
                    </div>
                  </div>
                )}

                <div className="mb-2.5 flex flex-col gap-3 rounded-[16px] border border-brand-light/30 bg-gradient-to-br from-[#EFF6FF] to-[#DCEBFD]/80 p-3.5 min-[400px]:p-4">
                  <div className="flex items-center justify-between gap-2 min-[400px]:gap-3">
                    <div className="flex items-center gap-2.5 min-[400px]:gap-3 min-w-0">
                      <div className="flex h-11 w-11 min-[400px]:h-[52px] min-[400px]:w-[52px] shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/80 p-1 shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="https://res.cloudinary.com/dkjzleczw/image/upload/v1785388318/bkash-logo-icon_beuxfl.png" alt="bKash" className="h-7 w-7 min-[400px]:h-9 min-[400px]:w-9 shrink-0 object-contain" />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-0.5 font-body text-[9.5px] min-[400px]:text-[10px] font-bold uppercase tracking-wide text-muted truncate">bKash Send Money</div>
                        <div className="font-body text-[17px] min-[400px]:text-[19px] font-extrabold leading-none tracking-tight min-[400px]:tracking-wide text-brand-light">{bkashNum}</div>
                      </div>
                    </div>
                    <button
                      className="flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-brand-light/40 bg-white/80 px-2.5 py-2 min-[400px]:px-4 min-[400px]:py-2 font-body text-xs font-bold text-brand-light transition-colors duration-200 hover:bg-brand-light hover:text-white active:scale-95 shadow-xs cursor-pointer"
                      onClick={copyBkash}
                      style={copyLabel !== 'Copy' ? { background: '#10B981', color: '#fff', borderColor: '#10B981' } : undefined}
                      title={copyLabel === 'Copy' ? t('কপি করুন') : t('কপি হয়েছে!')}
                    >
                      {copyLabel === 'Copy' ? (
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      ) : (
                        <IconCheck />
                      )}
                      <span className="hidden min-[400px]:inline">{copyLabel}</span>
                    </button>
                  </div>
                  
                  <button className="mt-2 flex items-center justify-center gap-2 rounded-[12px] border border-dashed border-brand-light/50 bg-brand-bg/20 px-3.5 py-2.5 font-body text-[12.5px] font-bold text-brand-light transition-colors hover:bg-brand-bg/35 active:scale-98 cursor-pointer" onClick={() => setQrOpen((v) => !v)}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="3" height="3" /></svg>
                    <span>{qrOpen ? t('QR কোড বন্ধ করুন') : t('QR কোড দিয়ে পেমেন্ট করুন')}</span>
                    <IconChevronDown open={qrOpen} />
                  </button>

                  <div className={`overflow-hidden transition-[max-height,opacity] duration-[400ms] ${qrOpen ? 'mt-2 max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="flex items-start gap-3.5 rounded-[14px] border border-white/80 bg-white/90 p-3.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://res.cloudinary.com/dkjzleczw/image/upload/v1785388318/bkash-payment-qr_zmr6dz.jpg" alt="bKash QR" className="h-[130px] w-[130px] shrink-0 rounded-xl border border-border-base object-cover shadow-xs" />
                      <div className="pt-0.5">
                        <div className="mb-1.5 font-body text-[12.5px] font-bold text-brand-light">{t('বিকাশ অ্যাপ দিয়ে স্ক্যান করুন')}</div>
                        <div className="font-body text-[11.5px] leading-[1.85] text-ink/80">
                          {lang === 'en' ? (
                            <>1. Open the bKash app<br />2. Tap the QR Scan button<br />3. Scan this QR code<br />4. Enter amount ৳{advanceInfo.totalAdvance.toLocaleString('en-US')}<br />5. Complete payment</>
                          ) : (
                            <>১. বিকাশ অ্যাপ খুলুন<br />২. QR স্ক্যান বাটনে ট্যাপ করুন<br />৩. এই QR টি স্ক্যান করুন<br />৪. পরিমাণ ৳{advanceInfo.totalAdvance.toLocaleString('en-US')} দিন<br />৫. পেমেন্ট সম্পন্ন করুন</>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-2.5 rounded-r-xl border-l-[3px] border-brand-light bg-brand-bg/30 px-3.5 py-2.5 font-body text-xs leading-[1.6] text-ink">
                  <span className="mt-0.5 text-brand-light"><IconInfo /></span>
                  <span>{t('ভুল তথ্য দিলে পেমেন্ট যাচাই সম্ভব হবে না এবং অর্ডার বাতিল হবে।')}</span>
                </div>
              </div>

              <div className="mb-3 text-center font-body text-[12.5px] font-bold text-ink">
                {t('নিচের যেকোনো একটি দেওয়া বাধ্যতামূলক')}
              </div>

              <div className="mb-3.5">
                <label className={fieldLabelClass}>{t('ট্রানজেকশন আইডি')} <span className={optionalTagClass}>(10 ক্যারেক্টার, যেমন: 8N5O2A3BDE)</span></label>
                <div className="relative">
                  <span className={fieldIconClass}><IconDoc /></span>
                  <input
                    className={fieldInputClass(!!errors.eTxn)}
                    value={txn}
                    maxLength={10}
                    onChange={(e) => { setTxn(e.target.value.toUpperCase()); if (errors.eTxn) setErrors((err) => ({ ...err, eTxn: undefined })); }}
                    placeholder="bKash Transaction ID"
                  />
                </div>
                {errors.eTxn && <div className={fieldErrClass}><IconWarning />{errors.eTxn}</div>}
              </div>

              <div className="my-3.5 flex items-center gap-3 font-body text-[11px] font-bold tracking-wide text-muted before:h-[1.5px] before:flex-1 before:bg-border-base after:h-[1.5px] after:flex-1 after:bg-border-base">{t('অথবা')}</div>

              <div className="mb-4">
                <label className={fieldLabelClass}>{t('Send Money করা bKash নম্বরের শেষ ৪ ডিজিট')}</label>
                <div className="relative">
                  <span className={fieldIconClass}><IconPhone /></span>
                  <input
                    className={fieldInputClass(!!errors.eL4)}
                    value={last4}
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onChange={(e) => { setLast4(bnDigitsToEn(e.target.value).replace(/\D/g, '')); if (errors.eL4) setErrors((err) => ({ ...err, eL4: undefined })); }}
                    placeholder={t('যেমন: 5504')}
                  />
                </div>
                {errors.eL4 && <div className={fieldErrClass}><IconWarning />{errors.eL4}</div>}
              </div>

              <div className="pt-2">
                <motion.button
                  className={`${btnNextClass} flex items-center justify-center gap-2 cursor-pointer`}
                  onClick={goToStep3}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <span>{t('পরবর্তী ধাপ: নিশ্চিত করুন')}</span>
                  <IconArrowRight />
                </motion.button>
              </div>
                </>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="checkout-step-3"
              custom={stepDirection}
              variants={checkoutStepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
              className="px-6 py-4"
            >
              <div className="relative mb-4 rounded-[20px] border border-border-base bg-white p-5 shadow-xs">
                <span className="mb-3 block font-body text-[11.5px] font-bold uppercase tracking-wide text-brand-light">
                  {lang === 'en' ? 'Order Invoice' : 'অর্ডার মেমো'}
                </span>
                
                <div className="border-b border-border-base/70 pb-2 mb-2">
                  {cartItems.map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-2 py-1.5 font-body text-[13px] text-ink/85">
                      <span className="line-clamp-1 leading-snug">{i.name} × {i.qty}</span>
                      <span className="font-bold shrink-0">৳{(i.price * i.qty).toLocaleString('en-US')}</span>
                    </div>
                  ))}

                  {appliedCoupon && discountAmount > 0 && (
                    <div className="flex items-center justify-between gap-2 py-1.5 font-body text-[13px] font-bold text-emerald-600">
                      <span>{lang === 'en' ? `Coupon Discount (${appliedCoupon.code})` : `কুপন ছাড় (${appliedCoupon.code})`}</span>
                      <span>- ৳{discountAmount.toLocaleString('en-US')}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between py-1.5 font-body text-[13px] text-ink/80">
                  <span>{lang === 'en' ? 'Subtotal' : 'সাবটোটাল'}</span>
                  <span>৳{sub.toLocaleString('en-US')}</span>
                </div>

                <div className="flex justify-between items-center py-1.5 font-body text-[13px] text-ink/80">
                  {appliedCoupon?.freeShipping ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[12.5px]">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-xs">
                        ✓
                      </span>
                      <span>{appliedCoupon.code} · {lang === 'en' ? 'Free Delivery Applied' : 'ফ্রি ডেলিভারি প্রযোজ্য'}</span>
                    </div>
                  ) : (
                    <span>{lang === 'en' ? 'Delivery Charge' : 'ডেলিভারি চার্জ'}</span>
                  )}

                  {appliedCoupon?.freeShipping ? (
                    <span className="font-extrabold text-emerald-600">{lang === 'en' ? 'FREE' : 'ফ্রি'}</span>
                  ) : (
                    <span>৳{effectiveShippingCost}</span>
                  )}
                </div>

                <div className="my-2.5 h-px border-t border-dashed border-border-base" />

                <div className="flex flex-col gap-2 pt-0.5 pb-1">
                  <div className="flex justify-between font-body text-[14.5px] font-extrabold text-ink">
                    <span>{lang === 'en' ? 'Total Bill' : 'সর্বমোট বিল'}</span>
                    <span>৳{total.toLocaleString('en-US')}</span>
                  </div>

                  <div className="flex items-center justify-between font-body text-[13px] font-medium text-ink/75">
                    <span>
                      {advanceInfo.isHighValue
                        ? (lang === 'en' ? 'Advance Payment (5%)' : 'এডভান্স পেমেন্ট (৫%)')
                        : (lang === 'en' ? 'Advance Payment' : 'এডভান্স পেমেন্ট')}
                    </span>
                    <span className="font-semibold text-brand-light">- ৳{advanceInfo.totalAdvance.toLocaleString('en-US')}</span>
                  </div>

                  <div className="flex items-center justify-between font-body text-[14.5px] font-bold text-ink">
                    <span>{lang === 'en' ? 'Cash on Delivery' : 'ক্যাশ অন ডেলিভারি'}</span>
                    <span className="font-extrabold text-ink">৳{balance.toLocaleString('en-US')}</span>
                  </div>
                </div>

                <div className="my-3.5 h-px bg-border-base" />

                <span className="mb-2 block font-body text-[11px] font-bold uppercase tracking-wide text-brand-light">
                  {lang === 'en' ? 'Delivery Label' : 'ডেলিভারি লেবেল'}
                </span>
                <div className="flex items-center gap-2 py-0.5 font-body text-[12.5px] leading-[1.8] text-ink/80">
                  <div className="flex w-5 shrink-0 justify-center text-brand-light"><IconUser /></div>
                  <div className="font-bold">{name}</div>
                </div>
                <div className="flex items-center gap-2 py-0.5 font-body text-[12.5px] leading-[1.8] text-ink/80">
                  <div className="flex w-5 shrink-0 justify-center text-brand-light"><IconPhone /></div>
                  <div>{phone}</div>
                </div>
                <div className="flex items-start gap-2 py-0.5 font-body text-[12.5px] leading-[1.8] text-ink/80">
                  <div className="flex w-5 shrink-0 justify-center pt-1 text-brand-light"><IconPin /></div>
                  <div className="min-w-0 break-words">{dist && dist !== 'ঢাকা' ? `${getDistrictLabel(dist, lang)}, ${addr}` : addr}</div>
                </div>
              </div>

              <div
                className={`flex cursor-pointer items-start gap-2.5 rounded-[14px] border bg-surface-muted/70 px-3.5 py-3 transition-brand duration-brand ${shake ? 'animate-[shake_.4s]' : ''} ${termsError ? 'border-red-500 bg-red-50/50' : 'border-border-base hover:bg-surface-muted'}`}
                onClick={toggleTerms}
              >
                <div className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-brand duration-brand ${termsChecked ? 'border-brand-light bg-brand-light text-white' : 'border-border-base bg-white'}`}>
                  {termsChecked && <IconCheck />}
                </div>
                <div className="font-body text-xs leading-[1.6] text-ink">
                  {lang === 'en' ? (
                    <>
                      I have read and agree to Vangcur&apos;s{' '}
                      <span
                        onClick={(e) => { e.stopPropagation(); setPolicyModalOpen(true); }}
                        className="cursor-pointer font-bold text-brand-light underline hover:text-brand-light-hover"
                      >
                        Terms &amp; Conditions
                      </span>.
                    </>
                  ) : (
                    <>
                      আমি ভাঙচুরের সকল{' '}
                      <span
                        onClick={(e) => { e.stopPropagation(); setPolicyModalOpen(true); }}
                        className="cursor-pointer font-bold text-brand-light underline hover:text-brand-light-hover"
                      >
                        নীতিমালা ও শর্তাবলী
                      </span>{' '}
                      পড়েছি এবং মেনে নিচ্ছি।
                    </>
                  )}
                </div>
              </div>
              {termsError && (
                <div className={`${fieldErrClass} ml-3.5 mt-1.5`}>
                  <IconWarning />{t('অর্ডার কনফার্ম করতে শর্তাবলী মেনে নেওয়া আবশ্যক')}
                </div>
              )}

              <div className="pt-3">
                <motion.button
                  className={`${btnNextClass} relative flex items-center justify-center gap-2 overflow-hidden cursor-pointer`}
                  onClick={handleConfirmClick}
                  disabled={submitting || confirmAnim !== 'idle'}
                  whileTap={confirmAnim === 'idle' && !submitting ? { scale: 0.97 } : undefined}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <span
                    className={`pointer-events-none absolute inset-0 rounded-full bg-success transition-opacity duration-500 ease-out ${
                      confirmAnim === 'success' ? 'opacity-100' : 'opacity-0'
                    }`}
                  />

                  <span className="relative inline-flex items-center justify-center gap-2">
                    {confirmAnim === 'success' ? (
                      <>
                        <IconCheck />
                        {lang === 'en' ? 'Order Placed!' : 'অর্ডার সম্পন্ন হয়েছে!'}
                      </>
                    ) : confirmAnim === 'loading' || submitting ? (
                      <><IconSpinner /> {t('প্রক্রিয়া হচ্ছে')}</>
                    ) : (
                      t('অর্ডার কনফার্ম করুন')
                    )}
                  </span>
                </motion.button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      <PreConfirmLoginModal
        isOpen={showPreConfirm}
        onClose={() => setShowPreConfirm(false)}
        onLogin={preConfirmGoLogin}
        onGoogle={preConfirmGoGoogle}
        googleLoading={preConfirmGoogleLoading}
        onSkip={preConfirmSkip}
      />
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        orderMode
        initialMode={loginInitialMode}
        onAuthSuccess={() => {
          setShowLoginModal(false);
          submitOrderNow();
        }}
      />
      <PolicyModal
        open={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        onAgreeAndConfirm={policyAgreeAndConfirm}
      />
    </>
  );
}
