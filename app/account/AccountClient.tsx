'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { showToast } from '@/lib/toast';
import { sanitizeSvgHtml } from '@/lib/sanitize';
import { productHref, QUICK_CART_EVENT } from '@/lib/productData';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { useCartStore, cartCount } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useLanguageStore, type Language } from '@/lib/store/languageStore';
import { useThemeStore } from '@/lib/store/themeStore';
import { useT } from '@/lib/i18n/useT';
import { RippleLayer, rippleThen } from '@/lib/ripple';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { formatSafeDate } from '@/lib/safeLocaleDate';
import { logout } from '@/lib/authData';
import {
  OPEN_CART_EVENT, OPEN_WISHLIST_EVENT, OPEN_TRACK_ORDER_EVENT,
} from '@/lib/uiEvents';
import {
  computeCelestialState, fetchIsRaining, formatLiveTimeDate, getGreeting,
  fetchMyOrders, orderStats,
  getStockNotifications, removeStockNotification, clearAllStockNotifications,
  fetchDrafts, deleteDraft, deleteAllDrafts,
} from '@/lib/accountData';
import {
  getTier, tierIconSVG, crownSVG,
} from '@/lib/membershipData';
import { fetchMyProfile, isProfileComplete } from '@/lib/profileData';
import { VerifiedCustomerBadge } from '@/app/components/product/VerifiedBadges';
import Footer from '@/app/components/layout/Footer';
import NotificationBell from '@/app/components/layout/NotificationBell';
import AccountNavTabs, { type AccountNavTabItem } from '@/app/components/account/AccountNavTabs';
import OrderCard from '@/app/components/orders/OrderCard';
import SkeletonTransition from '@/app/components/ui/SkeletonTransition';
import { CompactOrderListSkeleton } from '@/app/components/ui/Skeletons';
import AccountMainSkeleton from './AccountMainSkeleton';
import MembershipFromUrlSync from './MembershipFromUrlSync';
import type { Order, DraftOrder, StockNotification } from '@/types';
import { guardPendingLock } from '@/lib/pendingLock';

const LoginModal = dynamic(() => import('@/app/components/auth/LoginModal'));
const MembershipModal = dynamic(() => import('@/app/components/modals/MembershipModal'), { ssr: false });
const CompleteProfileModal = dynamic(() => import('@/app/components/account/CompleteProfileModal'), { ssr: false });

const STATE_BG: Record<string, string> = {
  dawn: 'bg-gradient-to-b from-[#3d2145] via-[#7c4a6b] to-[#e8935f]',
  morning: 'bg-gradient-to-b from-[#4a90c2] via-[#87ceeb] to-[#c8e6f5]',
  noon: 'bg-gradient-to-b from-[#3a8fd1] via-[#6bb6e8] to-[#a8d8f0]',
  sunset: 'bg-gradient-to-b from-[#2d1b4e] via-[#a8456b] to-[#f4a261]',
  night: 'bg-gradient-to-b from-[#0a0e27] via-[#141b3d] to-[#1e2951]',
  rain: 'bg-gradient-to-b from-[#3d4451] via-[#5a6472] to-[#7d8a99]',
};

function IconOrdersBox({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconCartBag({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconBellNotify({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconLockAlt({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconEmptyBox({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCalendarSmall({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
    </svg>
  );
}

function ItemThumb({ imgVal }: { imgVal?: string }) {
  const isUrl = typeof imgVal === 'string' && imgVal.startsWith('http');
  if (isUrl) {
    return (
      <img
        src={optimizeCloudinaryUrl(imgVal, 120)}
        alt=""
        className="h-10 w-10 shrink-0 rounded-xl border border-white/90 bg-white object-cover object-top shadow-xs"
        loading="lazy"
        decoding="async"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-bg/40 text-brand-light shadow-xs">
      <IconOrdersBox className="h-5 w-5" />
    </div>
  );
}

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconTrash({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconCrownNavbar() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

function IconLogoutWarning() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function AccountClient() {
  const { t, lang } = useT();
  const router = useRouter();
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const supabase = useRef(createClient()).current;

  const cartQty = useCartStore((s) => cartCount(s.cart));
  const wishQty = useWishlistStore((s) => s.wishlist.length);
  const currentUser = useAuthStore((s) => s.currentUser);
  // লগইন-স্টেট localStorage থেকে হাইড্রেট হওয়ার আগে (সার্ভারের HTML + প্রথম ক্লায়েন্ট রেন্ডার) আসল ইউজার জানা যায় না;
  // তখন "লগইন করুন" কার্ড না দেখিয়ে স্কেলেটন দেখানো হয়।
  const authReady = useAuthStore((s) => s.hydrated);

  const [loginOpen, setLoginOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const openMembership = useCallback(() => setMembershipOpen(true), []);
  const [completeProfileOpen, setCompleteProfileOpen] = useState(false);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  const [now, setNow] = useState(() => new Date());
  const [isRaining, setIsRaining] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(320);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [stockNotifs, setStockNotifs] = useState<StockNotification[]>([]);
  const [liveStockMap, setLiveStockMap] = useState<Record<string, { stock: number; price: number; name: string; img?: string }>>({});
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!cardRef.current) return undefined;
    const measure = () => setCardWidth(cardRef.current?.clientWidth || 320);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    fetchIsRaining(supabase, currentUser).then(setIsRaining);
  }, [currentUser, supabase]);

  useEffect(() => {
    if (!currentUser?.id) {
      setProfileComplete(null);
      return;
    }
    let cancelled = false;
    fetchMyProfile(supabase, currentUser.id).then((p) => {
      if (cancelled) return;
      setProfileComplete(p ? isProfileComplete(p) : false);
    });
    return () => { cancelled = true; };
  }, [currentUser?.id, supabase]);

  useEffect(() => {
    if (!currentUser) {
      setLoadingOrders(false);
      return;
    }
    setCompleteProfileOpen(false);
    const notifs = getStockNotifications();
    setStockNotifs(notifs);

    if (notifs.length > 0) {
      const ids = notifs.map((n) => n.prodId);
      supabase
        .from('custom_products')
        .select('id, name, stock, price, imgs')
        .in('id', ids)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const map: Record<string, { stock: number; price: number; name: string; img?: string }> = {};
            data.forEach((p) => {
              let imgsArr: string[] = [];
              if (typeof p.imgs === 'string') {
                try { imgsArr = JSON.parse(p.imgs); } catch { imgsArr = [p.imgs]; }
              } else if (Array.isArray(p.imgs)) imgsArr = p.imgs;
              map[String(p.id)] = {
                stock: Number(p.stock) || 0,
                price: Number(p.price) || 0,
                name: p.name || '',
                img: imgsArr[0] || '',
              };
            });
            setLiveStockMap(map);
          }
        });
    }

    setLoadingOrders(true);
    fetchMyOrders(supabase, currentUser).then((res) => {
      setOrders(res);
      setLoadingOrders(false);
    });
    fetchDrafts(supabase, currentUser).then(setDrafts);
  }, [currentUser, supabase]);

  const celestial = useMemo(
    () => computeCelestialState(now.getHours() + now.getMinutes() / 60, isRaining, cardWidth),
    [now, isRaining, cardWidth]
  );
  const stats = useMemo(() => orderStats(orders), [orders]);

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  // 🛡️ Safari-তে malformed/invalid date থাকলে toLocaleDateString() RangeError থ্রো করতে পারে
  // (Chrome-এ করে না) — safe helper ব্যবহার করা হচ্ছে
  const createdStr = formatSafeDate(currentUser?.createdAt, lang, { year: 'numeric', month: 'long', day: 'numeric' });

  const doLogout = async () => {
    setShowLogoutConfirm(false);
    await logout(supabase);
    useWishlistStore.getState().clearWishlist();
    showToast(t('লগআউট হয়েছে'));
  };

  const handleRemoveStockNotif = (key: string) => {
    removeStockNotification(key);
    setStockNotifs((prev) => prev.filter((i) => i.key !== key));
  };

  const handleClearStockNotifs = () => {
    clearAllStockNotifications();
    setStockNotifs([]);
  };

  const viewNotifiedProduct = (item: StockNotification) => {
    router.push(productHref({ id: item.prodId, name: item.prodName || '' }));
  };

  const handleAddToCartFromStock = (item: StockNotification) => {
    const live = liveStockMap[String(item.prodId)];
    const price = live?.price || 0;
    const name = live?.name || item.prodName || 'Product';
    const emoji = live?.img || '';

    useCartStore.getState().addToCart(
      [{
        id: item.prodId,
        name,
        price,
        old: price,
        imgs: emoji ? [emoji] : [],
        stock: live?.stock || 10,
        cat: 'general',
        cats: ['general'],
        specs: {},
        warranty: '৭ দিন',
        badge: '',
        rating: 5,
        discountColor: '',
        desc: '',
        _detailLoaded: false,
      }],
      item.prodId,
      1
    );

    removeStockNotification(item.key);
    setStockNotifs((prev) => prev.filter((i) => i.key !== item.key));
    showToast(t('কার্টে যোগ হয়েছে'));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT));
      window.dispatchEvent(new CustomEvent(QUICK_CART_EVENT, { detail: { id: item.prodId } }));
    }
  };

  const handleDeleteDraft = async (draftId: string, sbId?: number) => {
    await deleteDraft(supabase, currentUser, draftId, sbId);
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
  };

  const handleClearAllDrafts = async () => {
    await deleteAllDrafts(supabase, currentUser);
    setDrafts([]);
  };

  const continueFromDraft = (draft: DraftOrder) => guardPendingLock(() => proceedFromDraft(draft));

  const proceedFromDraft = (draft: DraftOrder) => {
    try {
      if (Array.isArray(draft.items) && draft.items.length) {
        sessionStorage.setItem('vc_quick_order_items', JSON.stringify(draft.items));
      }
      sessionStorage.setItem('vc_form_draft', JSON.stringify({
        name: draft.name || '',
        phone: draft.phone || '',
        dist: draft.dist || '',
        addr: draft.addr || '',
        email: draft.email || '',
      }));
      if (draft.ship) sessionStorage.setItem('vc_ship', draft.ship);
    } catch {
      // ignore
    }
    router.push('/checkout');
  };

  const currentTier = getTier(stats.completed);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg/25 via-white to-white">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ১. কাস্টমাইজড অ্যাকাউন্ট পেজ ন্যাভবার                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="sticky top-[14px] z-[900] mx-2 mb-1.5 mt-[14px] max-[400px]:mx-1.5 sm:mx-3">
        <nav className="navbar-glass relative rounded-[35px] border border-white/70 bg-white/80 shadow-sh1 backdrop-blur-[10px]">
          <div className="mx-auto flex h-[62px] max-w-[1300px] items-center justify-between gap-3 px-3 sm:px-5">
            {/* ব্যাক টু হোম বাটন */}
            <Link prefetch={false}
              href="/"
              aria-label={t('হোম')}
              onClick={(e) => {
                e.preventDefault();
                rippleThen(e, () => router.push('/'));
              }}
              className="vc-press group relative before:absolute before:content-[''] before:-inset-y-[10px] before:-left-3 before:-right-1 md:before:hidden flex shrink-0 items-center gap-2 rounded-full border border-border-base/70 bg-white/80 py-1.5 pl-2 pr-3.5 shadow-xs backdrop-blur-md hover:border-brand-light hover:bg-brand-bg/40 no-underline"
            >
              <RippleLayer />
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-light text-white shadow-xs transition-transform duration-brand group-hover:scale-105">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </div>
              <span className="font-body text-[13px] font-extrabold text-ink transition-colors duration-brand group-hover:text-brand-light">
                {lang === 'en' ? 'Back to Home' : 'ফিরে যান'}
              </span>
            </Link>

            {/* অ্যাকশন আইকনসমূহ: Wishlist, Cart, Membership, Track Order + নোটিফিকেশন */}
            {(() => {
              const navTabs: AccountNavTabItem[] = [
                {
                  id: 'wishlist',
                  label: t('উইশলিস্ট'),
                  badge: wishQty,
                  icon: (
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  ),
                  onSelect: () => window.dispatchEvent(new CustomEvent(OPEN_WISHLIST_EVENT)),
                },
                {
                  id: 'cart',
                  label: t('কার্ট'),
                  badge: cartQty,
                  icon: (
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                  ),
                  onSelect: () => window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT)),
                },
                {
                  id: 'membership',
                  label: currentTier ? (lang === 'en' ? currentTier.en : currentTier.bn) : t('মেম্বারশিপ'),
                  icon: <IconCrownNavbar />,
                  onSelect: () => setMembershipOpen(true),
                },
                {
                  id: 'track-order',
                  label: t('অর্ডার ট্র্যাক করুন'),
                  icon: (
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M9 17H7A5 5 0 017 7h2" /><path d="M15 7h2a5 5 0 010 10h-2" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  ),
                  onSelect: () => window.dispatchEvent(new CustomEvent(OPEN_TRACK_ORDER_EVENT)),
                },
                {
                  id: 'theme',
                  noActive: true,
                  label: theme === 'dark'
                    ? (lang === 'en' ? 'Light Mode' : 'লাইট মোড')
                    : (lang === 'en' ? 'Dark Mode' : 'ডার্ক মোড'),
                  icon: theme === 'dark' ? <IconSun /> : <IconMoon />,
                  onSelect: toggleTheme,
                },
              ];

              return (
                <>
                  <div className="hidden items-center gap-2 md:flex">
                    <AccountNavTabs tabs={navTabs} />
                    <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-border-base/70 bg-surface-muted/50 shadow-2xs backdrop-blur-md">
                      <NotificationBell className="[&>button]:!h-8 [&>button]:!w-8 [&>button]:!rounded-full" />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 md:hidden">
                    {navTabs.map((tab) => (
                      <button
                        key={tab.id}
                        className="relative flex items-center justify-center rounded-[9px] p-2 text-ink transition-brand duration-brand hover:bg-surface-muted hover:text-brand-light"
                        onClick={tab.onSelect}
                        title={tab.label}
                      >
                        <span className="[&_svg]:!h-5 [&_svg]:!w-5">{tab.icon}</span>
                        {!!tab.badge && tab.badge > 0 && (
                          <span className="absolute right-[1px] top-[1px] inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-brand-light px-[3px] pt-px text-[9px] font-bold leading-none tabular-nums text-white animate-badge-hot-glow">
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    ))}
                    <NotificationBell />
                  </div>
                </>
              );
            })()}
          </div>
        </nav>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ২. প্রোফাইল ড্যাশবোর্ড কনটেন্ট                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-4 md:px-6">
        {!authReady ? (
          <AccountMainSkeleton />
        ) : !currentUser ? (
          <div className="mx-auto my-12 max-w-[420px] rounded-[28px] border border-white/80 bg-white/85 p-8 text-center shadow-sh2 backdrop-blur-md animate-section-reveal">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-bg/50 text-brand-light shadow-xs">
              <IconLockAlt />
            </div>
            <h1 className="mb-1.5 font-body text-xl font-bold text-ink">
              {t('প্রোফাইল দেখতে লগইন করুন')}
            </h1>
            <p className="mb-6 font-body text-[13px] leading-relaxed text-muted">
              {lang === 'en'
                ? 'Please log in to your account to view your orders, membership level, and profile settings.'
                : 'আপনার অর্ডার হিস্টোরি, মেম্বারশিপ লেভেল এবং প্রোফাইল তথ্য দেখতে অ্যাকাউন্টে লগইন করুন।'}
            </p>
            <button
              onClick={() => setLoginOpen(true)}
              className="w-full rounded-full bg-gradient-to-r from-info to-brand-light py-3 font-body text-sm font-bold text-white shadow-sh2 transition-all duration-brand hover:brightness-[1.03] active:scale-95"
            >
              {t('লগইন করুন')}
            </button>
          </div>
        ) : (
          <>
            {/* হেডার */}
            <div className="mb-6 text-center">
              <h1 className="font-body text-xl sm:text-2xl font-extrabold text-brand-light">
                {lang === 'en' ? 'Welcome To Your Profile' : 'আপনার প্রোফাইলে স্বাগতম'}
              </h1>
              <div className="mt-1 font-body text-[13.5px] font-semibold text-ink/80">
                {getGreeting(currentUser, now, lang)}
              </div>
              <div className="mt-0.5 font-body text-[11.5px] text-muted">
                {formatLiveTimeDate(now, lang)}
              </div>
            </div>

            {/* ২-কলাম ড্যাশবোর্ড গ্রিড */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
              
              {/* বাম কলাম: সাইডবার উইজেটসমূহ */}
              <div className="flex flex-col gap-4">
                
                {/* ১. লাইভ ওয়েদার ও সেলেস্টিয়াল কার্ড */}
                <div
                  ref={cardRef}
                  className={`relative flex flex-col justify-between overflow-hidden rounded-[24px] p-5 shadow-sh2 select-none ${
                    STATE_BG[celestial.state] || STATE_BG.noon
                  }`}
                  style={{ minHeight: 280 }}
                >
                  {/* রাতের আকাশের তারা */}
                  {celestial.state === 'night' && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      {[
                        { left: '12%', top: '15%', size: 2, anim: 'twinkling 2.2s infinite 0.1s' },
                        { left: '24%', top: '28%', size: 3, anim: 'starShimmer 3s infinite 0.4s' },
                        { left: '38%', top: '12%', size: 1.5, anim: 'twinkling 1.8s infinite 0.2s' },
                        { left: '52%', top: '22%', size: 2.5, anim: 'starShimmer 2.8s infinite 0.6s' },
                        { left: '68%', top: '14%', size: 2, anim: 'twinkling 2.5s infinite 0.3s' },
                        { left: '78%', top: '30%', size: 3, anim: 'starShimmer 3.2s infinite 0.8s' },
                        { left: '88%', top: '16%', size: 2, anim: 'twinkling 2s infinite 0.5s' },
                        { left: '18%', top: '42%', size: 1.5, anim: 'twinkling 2.4s infinite 0.7s' },
                        { left: '46%', top: '38%', size: 2, anim: 'starShimmer 2.6s infinite 0.2s' },
                        { left: '82%', top: '44%', size: 1.5, anim: 'twinkling 2.1s infinite 0.9s' },
                      ].map((star, i) => (
                        <div
                          key={i}
                          className="absolute rounded-full bg-white"
                          style={{
                            left: star.left,
                            top: star.top,
                            width: star.size,
                            height: star.size,
                            animation: star.anim,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* ভাসমান থ্রি-ডি মেঘ */}
                  {celestial.state !== 'night' && celestial.state !== 'rain' && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      <div
                        className="absolute top-2.5 opacity-85"
                        style={{ animation: 'cloudDrift 24s linear infinite 0s' }}
                      >
                        <svg width="86" height="32" viewBox="0 0 100 40" fill="none">
                          <path
                            d="M20,35 Q10,35 10,25 Q10,18 16,14 Q16,5 26,5 Q34,5 38,11 Q44,2 56,2 Q68,2 74,10 Q82,7 88,14 Q94,18 94,26 Q94,35 82,35 Z"
                            fill="rgba(255, 255, 255, 0.75)"
                          />
                          <path
                            d="M25,32 Q16,32 16,24 Q16,18 22,15 Q22,8 30,8 Q38,8 41,13 Q46,5 57,5 Q67,5 72,12 Q79,10 84,16 Q88,20 88,26 Q88,32 78,32 Z"
                            fill="rgba(255, 255, 255, 0.95)"
                          />
                        </svg>
                      </div>

                      <div
                        className="absolute top-8 opacity-65"
                        style={{ animation: 'cloudDrift 34s linear infinite -12s' }}
                      >
                        <svg width="68" height="26" viewBox="0 0 100 40" fill="none">
                          <path
                            d="M20,35 Q10,35 10,25 Q10,18 16,14 Q16,5 26,5 Q34,5 38,11 Q44,2 56,2 Q68,2 74,10 Q82,7 88,14 Q94,18 94,26 Q94,35 82,35 Z"
                            fill="rgba(255, 255, 255, 0.65)"
                          />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* আকাশ পাড়ি দেওয়া পাখি */}
                  {celestial.birdsVisible && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      <svg
                        className="absolute left-0 top-3 h-3 w-5"
                        viewBox="0 0 20 12"
                        fill="none"
                        style={{ animation: 'birdFly 14s linear infinite 0s' }}
                      >
                        <path d="M1 7 Q5 0 10 7 Q15 0 19 7" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      <svg
                        className="absolute left-0 top-8 h-2.5 w-4"
                        viewBox="0 0 20 12"
                        fill="none"
                        style={{ animation: 'birdFly 18s linear infinite -6s' }}
                      >
                        <path d="M1 7 Q5 0 10 7 Q15 0 19 7" stroke="rgba(255,255,255,0.65)" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}

                  {/* অবিরাম প্রাকৃতিক বৃষ্টি ও বিদ্যুৎ */}
                  {isRaining && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      <div
                        className="absolute inset-0 bg-white"
                        style={{ animation: 'lightningFlash 8s ease-in-out infinite' }}
                      />
                      <svg
                        className="absolute right-[22%] top-0 h-16 w-6 text-sky-100"
                        viewBox="0 0 30 90"
                        preserveAspectRatio="none"
                        style={{ animation: 'lightningFlash 8s ease-in-out infinite' }}
                      >
                        <path d="M16 0 L3 42 L16 39 L7 88 L27 34 L15 37 Z" fill="#E0F2FE" />
                      </svg>
                      {[8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 94].map((leftPct, i) => (
                        <div
                          key={i}
                          className="absolute top-0 w-[1.5px] rounded-full bg-gradient-to-b from-transparent via-white/70 to-white/90"
                          style={{
                            left: `${leftPct}%`,
                            height: `${14 + (i % 4) * 3}px`,
                            animation: `rainDropFall ${0.65 + (i % 3) * 0.1}s linear infinite ${(i % 6) * 0.1}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* সূর্য / চাঁদ */}
                  {celestial.celestial !== 'none' && (
                    <div
                      className={`absolute h-7 w-7 rounded-full transition-all duration-700 ${
                        celestial.celestial === 'sun'
                          ? 'bg-gradient-to-tr from-[#F59E0B] via-[#FBBF24] to-[#FEF08A] shadow-[0_0_24px_8px_rgba(251,191,36,0.7)]'
                          : 'bg-gradient-to-tr from-[#94A3B8] via-[#E2E8F0] to-[#FFFFFF] shadow-[0_0_20px_6px_rgba(226,232,240,0.65)]'
                      }`}
                      style={{
                        left: celestial.posX,
                        top: celestial.posY,
                        animation: celestial.celestial === 'sun' ? 'sunCoronaPulse 4s ease-in-out infinite' : 'moonGlowAura 5s ease-in-out infinite',
                      }}
                    >
                      {celestial.celestial === 'moon' && (
                        <div className="absolute inset-0 rounded-full opacity-20 bg-[radial-gradient(circle_at_30%_30%,#475569_15%,transparent_40%)]" />
                      )}
                    </div>
                  )}

                  {/* সিনারি ল্যান্ডস্কেপ */}
                  <div
                    className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 w-full opacity-95 z-10"
                    dangerouslySetInnerHTML={{ __html: sanitizeSvgHtml(celestial.sceneryHtml) }}
                  />

                  {/* জোনাকি পোকা */}
                  {celestial.state === 'night' && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
                      {[
                        { left: '16%', bottom: '70px', dur: '3.2s', delay: '0.2s' },
                        { left: '36%', bottom: '80px', dur: '4s', delay: '0.9s' },
                        { left: '58%', bottom: '66px', dur: '3.6s', delay: '1.4s' },
                        { left: '76%', bottom: '74px', dur: '4.4s', delay: '0.5s' },
                        { left: '88%', bottom: '64px', dur: '3.8s', delay: '1.8s' },
                      ].map((bug, i) => (
                        <div
                          key={i}
                          className="absolute h-1.5 w-1.5 rounded-full bg-[#FEF08A]"
                          style={{
                            left: bug.left,
                            bottom: bug.bottom,
                            animation: `fireflyGlow ${bug.dur} ease-in-out infinite ${bug.delay}`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* শীর্ষ অংশ: অবতার ও কাস্টমার ইনফো */}
                  <div className="relative z-20 flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      {currentTier.crown && (
                        <span
                          className="pointer-events-none absolute -top-4 left-1/2 z-30 h-9 w-9 -translate-x-1/2 drop-shadow-md"
                          dangerouslySetInnerHTML={{ __html: sanitizeSvgHtml(crownSVG(currentTier.crown)) }}
                        />
                      )}
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-sm font-bold text-white shadow-sm backdrop-blur-md">
                        {initials}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.65)' }}>
                      <div className="flex items-center gap-1.5 font-body text-[15px] font-extrabold">
                        <span className="min-w-0 truncate">{currentUser.name || '-'}</span>
                        {profileComplete === true && <VerifiedCustomerBadge />}
                      </div>
                      <div className="truncate font-body text-[12px] text-white/80">{currentUser.email || '-'}</div>
                      {createdStr && (
                        <div className="mt-0.5 flex items-center gap-1 font-body text-[10.5px] text-white/70">
                          <IconCalendarSmall />
                          {t('অ্যাকাউন্ট তৈরি:')} {createdStr}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* নিচের অংশ: এডিট ও লগআউট বাটন */}
                  <div className="relative z-20 mt-auto pt-3">
                    {profileComplete === false && (
                      <div className="mb-2 flex items-center gap-1.5 font-body text-[11px] font-bold text-amber-200">
                        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-amber-300 text-[9px] font-black text-amber-950">!</span>
                        <span className="truncate">{t('ভেরিফাইড ব্যাজ পেতে প্রোফাইল সম্পূর্ণ করুন')}</span>
                      </div>
                    )}
                    <div className="flex gap-2 border-t border-white/[0.16] pt-3">
                      <button
                        onClick={() => setCompleteProfileOpen(true)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2 font-body text-xs font-bold text-white shadow-xs backdrop-blur-md transition-all active:scale-95 ${
                          profileComplete === false
                            ? 'border-brand-light/80 bg-brand-light/35 hover:bg-brand-light/45'
                            : 'border-white/25 bg-white/15 hover:bg-white/25'
                        }`}
                      >
                        <IconEdit />
                        <span>{profileComplete === false ? t('সেটআপ') : t('এডিট')}</span>
                      </button>
                      <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/15 py-2 font-body text-xs font-bold text-white shadow-xs backdrop-blur-md transition-all hover:bg-white/25 active:scale-95"
                      >
                        <IconLogout />
                        <span>{t('লগআউট')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ২. ৩-কার্ডের রিডিজাইন */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="flex flex-col items-center justify-center rounded-[20px] border border-white/80 bg-white/85 py-3.5 px-2 text-center shadow-xs backdrop-blur-md">
                    <div className="font-body text-base font-extrabold text-ink leading-tight">
                      {stats.total}{lang === 'en' ? '' : 'টি'}
                    </div>
                    <div className="mt-1 font-body text-[11px] font-bold text-muted">{t('মোট অর্ডার')}</div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label="Toggle dark mode"
                    title={theme === 'dark' ? (lang === 'en' ? 'Switch to Light Mode' : 'লাইট মোডে যান') : (lang === 'en' ? 'Switch to Dark Mode' : 'ডার্ক মোডে যান')}
                    className="flex flex-col items-center justify-center rounded-[20px] border border-white/80 bg-white/85 py-3.5 px-2 text-center shadow-xs backdrop-blur-md transition-all hover:border-brand-light/40 active:scale-95"
                  >
                    <div className="flex items-center gap-1">
                      <span className={theme === 'light' ? 'text-brand-light' : 'text-muted/50'}>
                        <IconSun />
                      </span>
                      <span className="text-[11px] text-muted">/</span>
                      <span className={theme === 'dark' ? 'text-brand-light' : 'text-muted/50'}>
                        <IconMoon />
                      </span>
                    </div>
                    <div className="mt-1 font-body text-[11px] font-bold text-muted">
                      {lang === 'en' ? (theme === 'dark' ? 'Dark Mode' : 'Light Mode') : (theme === 'dark' ? 'ডার্ক মোড' : 'লাইট মোড')}
                    </div>
                  </button>

                  <div
                    onClick={() => setMembershipOpen(true)}
                    className="flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[20px] border border-white/80 bg-white/85 py-3 px-2 text-center shadow-xs backdrop-blur-md transition-all hover:border-brand-light/40 active:scale-95"
                  >
                    <div className="h-6 w-6" dangerouslySetInnerHTML={{ __html: sanitizeSvgHtml(tierIconSVG(currentTier.key)) }} />
                    <div className="font-body text-[11px] font-extrabold text-brand-light truncate max-w-full">
                      {lang === 'en' ? currentTier.en : currentTier.bn}
                    </div>
                    <div className="font-body text-[9px] font-semibold text-muted">{t('মেম্বারশিপ')}</div>
                  </div>
                </div>

                {/* ৩. ভাষা পরিবর্তন উইজেট */}
                <div className="rounded-[22px] border border-white/80 bg-white/85 p-4 shadow-xs backdrop-blur-md">
                  <div className="font-body text-[13px] font-bold text-ink">{t('ভাষা')}</div>
                  <div className="mt-0.5 font-body text-[11px] text-muted">{t('ওয়েবসাইটের ভাষা পরিবর্তন করুন')}</div>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={() => setLanguage('bn' as Language)}
                      className={`flex-1 rounded-full border py-2 font-body text-[12.5px] font-bold transition-all duration-brand ${
                        lang === 'bn'
                          ? 'border-brand-light bg-brand-bg/40 text-brand-light shadow-xs'
                          : 'border-border-base bg-white/60 text-muted hover:bg-surface-muted'
                      }`}
                    >
                      {t('বাংলা')}
                    </button>
                    <button
                      onClick={() => setLanguage('en' as Language)}
                      className={`flex-1 rounded-full border py-2 font-body text-[12.5px] font-bold transition-all duration-brand ${
                        lang === 'en'
                          ? 'border-brand-light bg-brand-bg/40 text-brand-light shadow-xs'
                          : 'border-border-base bg-white/60 text-muted hover:bg-surface-muted'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* ৪. অসম্পূর্ণ ড্রাফট কার্ড */}
                {drafts.length > 0 && (
                  <div className="rounded-[22px] border border-white/80 bg-white/85 p-4 shadow-xs backdrop-blur-md animate-section-reveal">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-light text-white shadow-xs">
                          <IconCartBag className="h-3.5 w-3.5" />
                        </span>
                        <div className="font-body text-[13.5px] font-extrabold text-ink">{t('অর্ডার করতে চেয়েছিলেন')}</div>
                      </div>
                      
                      <button
                        onClick={handleClearAllDrafts}
                        title={t('সব মুছুন')}
                        aria-label={t('সব মুছুন')}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-border-base bg-white text-muted shadow-2xs transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500 active:scale-90"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {drafts.map((draft) => {
                        const items = Array.isArray(draft.items) ? draft.items : [];
                        const firstItem = items[0] || null;
                        // 🛡️ Safari-তে malformed/invalid date থাকলে toLocaleDateString() RangeError
                        // থ্রো করতে পারে (Chrome-এ করে না) — safe helper ব্যবহার করা হচ্ছে
                        const dateStr = formatSafeDate(draft.createdAt, lang);
                        const prodName = firstItem ? firstItem.name : t('প্রোডাক্ট');
                        const tot = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);

                        return (
                          <div key={draft.id} className="rounded-[16px] border border-border-base bg-white/90 p-3 shadow-xs">
                            <div className="flex items-center gap-1 font-body text-[10.5px] text-muted">
                              <IconCalendarSmall />
                              {dateStr} · {items.length} {t('আইটেম')}
                            </div>
                            <div className="mt-1.5 flex items-center gap-2.5">
                              {firstItem ? <ItemThumb imgVal={(firstItem.imgs || [])[0]} /> : <ItemThumb />}
                              <div className="min-w-0 flex-1 truncate font-body text-xs font-bold text-ink">
                                {prodName}
                              </div>
                              <div className="whitespace-nowrap font-body text-xs font-extrabold text-brand-light">
                                ৳{tot.toLocaleString('en-US')}
                              </div>
                            </div>
                            <div className="mt-2.5 flex gap-2">
                              <button
                                onClick={() => handleDeleteDraft(draft.id, draft._sbId)}
                                className="flex-1 rounded-full border border-border-base py-1.5 font-body text-[11px] font-semibold text-muted hover:bg-surface-muted"
                              >
                                {t('সরান')}
                              </button>
                              <button
                                onClick={() => continueFromDraft(draft)}
                                className="flex-1 rounded-full bg-gradient-to-r from-info to-brand-light py-1.5 font-body text-[11px] font-bold text-white shadow-xs hover:brightness-105 active:scale-95"
                              >
                                {t('চালিয়ে যান')} →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ৫. স্টক নোটিফিকেশন অ্যালার্ট */}
                {stockNotifs.length > 0 && (
                  <div className="rounded-[22px] border border-white/80 bg-white/85 p-4 shadow-xs backdrop-blur-md">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-light text-white shadow-xs">
                          <IconBellNotify className="h-3.5 w-3.5" />
                        </span>
                        <div className="font-body text-[13.5px] font-extrabold text-ink">{t('স্টকে আসলে জানানো')}</div>
                      </div>
                      {stockNotifs.length > 1 && (
                        <button
                          onClick={handleClearStockNotifs}
                          className="font-body text-[11px] font-semibold text-muted hover:text-red-500"
                        >
                          {t('সব মুছুন')}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {stockNotifs.map((item) => {
                        const live = liveStockMap[String(item.prodId)];
                        const isBackInStock = (live?.stock || 0) > 0;

                        return (
                          <div
                            key={item.key}
                            className={`flex items-center gap-3 rounded-[16px] border p-3 shadow-xs transition-all duration-brand ${
                              isBackInStock
                                ? 'border-emerald-300/80 bg-emerald-50/70 text-emerald-950'
                                : 'border-amber-200/80 bg-amber-50/60 text-amber-950'
                            }`}
                          >
                            <div className="shrink-0">
                              <ItemThumb imgVal={live?.img} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-body text-xs font-bold text-ink">
                                {live?.name || item.prodName || t('প্রোডাক্ট')}
                              </div>
                              <div className="mt-0.5">
                                {isBackInStock ? (
                                  <span className="inline-flex items-center gap-1.5 font-body text-[11px] font-extrabold text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>{lang === 'en' ? 'Back in Stock!' : 'স্টকে এসেছে!'}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 font-body text-[11px] font-bold text-amber-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    <span>{lang === 'en' ? 'Out of Stock' : 'স্টক নেই'}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {isBackInStock ? (
                                <button
                                  onClick={() => handleAddToCartFromStock(item)}
                                  className="rounded-full bg-emerald-600 px-3 py-1.5 font-body text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95"
                                >
                                  {lang === 'en' ? 'Add & Order' : 'অর্ডার করুন'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => viewNotifiedProduct(item)}
                                  className="rounded-full bg-brand-light px-3 py-1.5 font-body text-[11px] font-bold text-white shadow-xs hover:bg-brand-light-hover active:scale-95"
                                >
                                  {t('দেখুন')}
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveStockNotif(item.key)}
                                title={t('সরান')}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-white hover:text-red-500 active:scale-95"
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* ডান কলাম: আমার অর্ডার সমূহ */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-light text-white shadow-xs">
                      <IconOrdersBox className="h-4 w-4" />
                    </span>
                    <span className="font-body text-[16px] font-extrabold text-ink">
                      {t('আমার অর্ডার সমূহ')}
                    </span>
                  </div>
                  {orders.length > 0 && (
                    <Link prefetch={false}
                      href="/account/orders"
                      className="font-body text-[12.5px] font-bold text-brand-light hover:underline"
                    >
                      {t('সব দেখুন →')}
                    </Link>
                  )}
                </div>

                <div className="rounded-[24px] border border-white/80 bg-white/85 p-5 shadow-xs backdrop-blur-md">
                  <SkeletonTransition isReady={!loadingOrders} skeleton={<CompactOrderListSkeleton />}>
                    {orders.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-bg/40 text-brand-light shadow-xs">
                          <IconEmptyBox />
                        </div>
                        <div className="mb-1 font-body text-sm font-bold text-ink">{t('এখনো কোনো অর্ডার নেই')}</div>
                        <div className="mb-5 font-body text-xs text-muted">{t('অর্ডার করলে এখানে দেখাবে')}</div>
                        <Link prefetch={false}
                          href="/"
                          className="inline-block rounded-full bg-gradient-to-r from-info to-brand-light px-6 py-2.5 font-body text-xs font-bold text-white shadow-sh1 transition-all hover:brightness-105 active:scale-95"
                        >
                          {t('কেনাকাটা শুরু করুন')} →
                        </Link>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {orders.slice(0, 3).map((o) => (
                          <OrderCard key={o.id} order={o} />
                        ))}
                      </div>
                    )}
                  </SkeletonTransition>
                </div>
              </div>

            </div>
          </>
        )}
      </main>

      <Footer eager />

      {/* লগআউট কনফার্মেশন মোডাল */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-ink/55 p-4 backdrop-blur-[3px] animate-section-reveal"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogoutConfirm(false); }}
        >
          <div className="relative w-full max-w-[360px] overflow-hidden rounded-[28px] bg-gradient-to-b from-brand-bg/40 via-white to-white p-6 text-center shadow-sh3 ring-1 ring-white/80">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-red-200/80 bg-red-50 shadow-xs">
              <IconLogoutWarning />
            </div>
            <h3 className="mb-1.5 font-body text-[17px] font-extrabold text-ink">
              {lang === 'en' ? 'Confirm Logout' : 'লগআউট নিশ্চিতকরণ'}
            </h3>
            <p className="mb-5 font-body text-[13px] leading-relaxed text-muted">
              {t('আপনি কি নিশ্চিতভাবে লগআউট করতে চান?')}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-full border border-border-base bg-white/80 py-2.5 font-body text-[13px] font-bold text-ink shadow-xs transition-all hover:bg-white active:scale-95"
              >
                {t('না')}
              </button>
              <button
                onClick={doLogout}
                className="flex-1 rounded-full bg-red-500 py-2.5 font-body text-[13px] font-bold text-white shadow-xs transition-all hover:bg-red-600 active:scale-95"
              >
                {t('লগআউট')}
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />

      <CompleteProfileModal
        isOpen={completeProfileOpen}
        onClose={() => setCompleteProfileOpen(false)}
        onSaved={() => setProfileComplete(true)}
      />

      {/* ?open=membership — useSearchParams আলাদা ছোট কম্পোনেন্টে, নিজের Suspense-এ (পুরো পেজ CSR-এ চলে যাওয়া ঠেকাতে) */}
      <Suspense fallback={null}>
        <MembershipFromUrlSync onOpen={openMembership} />
      </Suspense>

      <MembershipModal
        isOpen={membershipOpen}
        onClose={() => setMembershipOpen(false)}
        completedCount={stats.completed}
      />
    </div>
  );
}
