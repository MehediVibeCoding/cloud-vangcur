'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/app/components/layout/Navbar';
import Footer from '@/app/components/layout/Footer';
import { useCartStore, cartCount } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { useAuthStore } from '@/lib/store/authStore';
import {
  OPEN_CART_EVENT, OPEN_WISHLIST_EVENT, OPEN_TRACK_ORDER_EVENT,
} from '@/lib/uiEvents';
import { useT } from '@/lib/i18n/useT';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { sanitizeHref } from '@/lib/security';
import { fetchProductById, productHref, startQuickOrder } from '@/lib/productData';
import type { Product } from '@/types';

const LoginModal = dynamic(() => import('@/app/components/auth/LoginModal'));

interface OfferModel1 {
  title: string;
  body: string;
  btn_text: string;
  btn_url: string;
}
interface OfferModel2 {
  img: string;
  url: string;
}
interface OfferModel3 {
  product_id: string;
  badge_text: string;
}
type OfferActiveModel = 'none' | 'model1' | 'model2' | 'model3';
interface OfferConfig {
  active_model: OfferActiveModel;
  model1: OfferModel1;
  model2: OfferModel2;
  model3: OfferModel3;
}

function HeaderDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.12]" aria-hidden="true">
      <svg width="34" height="34" className="absolute -left-1 top-2 -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
      </svg>
      <svg width="26" height="26" className="absolute right-14 top-3 rotate-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </div>
  );
}

function DesktopSideDecor() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden lg:block" aria-hidden="true">
      <div className="absolute left-[6%] top-[14%] text-brand-light/[0.14] -rotate-12">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <div className="absolute right-[6%] top-[18%] text-brand-light/[0.14] rotate-12">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="7" y="2.5" width="10" height="15" rx="3" />
          <path d="M10 5.5h4" />
          <circle cx="12" cy="20" r="1.6" />
        </svg>
      </div>
      <div className="absolute left-[5%] bottom-[24%] text-brand-light/[0.14] rotate-6">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 14.5a8 8 0 0 1 16 0" />
          <rect x="2.7" y="14.5" width="4.3" height="7" rx="1.6" />
          <rect x="17" y="14.5" width="4.3" height="7" rx="1.6" />
        </svg>
      </div>
      <div className="absolute right-[5%] bottom-[22%] text-brand-light/[0.14] -rotate-6">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>
    </div>
  );
}

function SparklesTagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12h15M13 5.5 20 12l-7 6.5" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function GiftBoxIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-brand-light">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" rx="1.5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

async function fetchOfferConfig(supabase: ReturnType<typeof createClient>): Promise<OfferConfig | null> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('setting_value')
      .eq('setting_key', 'vc_offer_popup')
      .maybeSingle();
    if (error || !data?.setting_value) return null;
    const raw = data.setting_value;
    const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object') return parsed as OfferConfig;
    return null;
  } catch {
    return null;
  }
}

export default function OffersClient() {
  const { t, lang } = useT();
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const cartQty = useCartStore((s) => cartCount(s.cart));
  const wishQty = useWishlistStore((s) => s.wishlist.length);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [loginOpen, setLoginOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<OfferConfig | null>(null);
  const [model3Product, setModel3Product] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const cfg = await fetchOfferConfig(supabase);
      if (cancelled) return;

      let validConfig: OfferConfig | null = null;
      let m3Product: Product | null = null;

      if (cfg && cfg.active_model && cfg.active_model !== 'none') {
        if (cfg.active_model === 'model1' && cfg.model1?.title?.trim()) {
          validConfig = cfg;
        } else if (cfg.active_model === 'model2' && cfg.model2?.img?.trim()) {
          validConfig = cfg;
        } else if (cfg.active_model === 'model3' && cfg.model3?.product_id) {
          m3Product = await fetchProductById(supabase, cfg.model3.product_id);
          if (m3Product) {
            validConfig = cfg;
          }
        }
      }

      setConfig(validConfig);
      setModel3Product(m3Product);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleNavigate = (url: string) => {
    if (!url) return;
    const safe = sanitizeHref(url);
    if (safe === '#' || !safe) return;
    if (/^https?:\/\//i.test(safe)) {
      window.location.href = safe;
    } else {
      router.push(safe.startsWith('/') ? safe : `/${safe}`);
    }
  };

  const hasActiveOffer = !loading && config && config.active_model !== 'none';

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-brand-bg/35 via-[#DCEBFD]/45 to-white flex flex-col justify-between">
      <DesktopSideDecor />

      <div className="relative z-10">
        <Navbar
          showHomeButton
          sticky={false}
          cartCount={cartQty}
          wishCount={wishQty}
          currentUser={currentUser}
          onCartClick={() => window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT))}
          onWishClick={() => window.dispatchEvent(new CustomEvent(OPEN_WISHLIST_EVENT))}
          onTrackClick={() => window.dispatchEvent(new CustomEvent(OPEN_TRACK_ORDER_EVENT))}
          onLoginClick={() => setLoginOpen(true)}
        />

        <main className="mx-auto w-full max-w-[840px] px-4 sm:px-6 pb-16 pt-3.5 sm:pt-5">
          
          {/* ================= পেজ হেডার ================= */}
          <div className="relative mb-6 overflow-hidden rounded-[24px] border border-white/80 bg-gradient-to-b from-brand-bg/40 via-[#DCEBFD]/50 to-white/90 p-5 sm:p-7 shadow-sh2 backdrop-blur-md">
            <HeaderDecor />

            <div className="relative z-10 mb-4 flex items-center justify-between border-b border-ink/10 pb-3.5">
              <Link prefetch={false}
                href="/"
                className="group inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 py-1.5 pl-2.5 pr-4 font-body text-xs font-bold text-ink shadow-xs backdrop-blur-md transition-all duration-brand hover:border-brand-light hover:bg-white hover:text-brand-light active:scale-95 no-underline"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-light text-white shadow-2xs transition-transform duration-brand group-hover:scale-105">
                  <ArrowLeftIcon />
                </div>
                <span>{lang === 'en' ? 'Home' : 'হোম'}</span>
              </Link>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-light/30 bg-white/80 px-3 py-1 font-body text-[11px] font-bold text-brand-light shadow-2xs">
                <SparklesTagIcon />
                <span>{lang === 'en' ? 'Special Promotions' : 'চলতি অফারসমূহ'}</span>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-light/35 bg-white text-brand-light shadow-xs">
                <SparklesTagIcon />
              </div>
              <div>
                <h1 className="font-body text-xl sm:text-2xl font-extrabold text-ink leading-tight">
                  {lang === 'en' ? 'Exclusive Deals & Campaigns' : 'এক্সক্লুসিভ অফার ও ক্যাম্পেইন'}
                </h1>
                <p className="mt-1 font-body text-[12px] font-bold text-brand-light">
                  {lang === 'en' ? 'Official Vangcur Promotional Hub' : 'ভাঙচুর-এর অফিসিয়াল অফার ও ডিসকাউন্ট'}
                </p>
              </div>
            </div>
          </div>

          {/* ================= লোডিং স্পিনার ================= */}
          {loading && (
            <div className="rounded-[22px] border border-white/80 bg-white/85 p-12 text-center shadow-xs backdrop-blur-md">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-light/25 border-t-brand-light" />
              <p className="mt-2 font-body text-xs font-semibold text-muted">
                {t('লোড হচ্ছে...')}
              </p>
            </div>
          )}

          {/* ================= অফার কনটেন্ট রেন্ডারার ================= */}
          {!loading && hasActiveOffer && config && (
            <div className="space-y-6 animate-section-reveal">
              
              {/* মডেল ১: টেক্সট ক্যাম্পেইন বক্স */}
              {config.active_model === 'model1' && (
                <div className="relative overflow-hidden rounded-[24px] border border-white/90 bg-white/90 p-6 sm:p-8 shadow-sh2 backdrop-blur-md">
                  <HeaderDecor />
                  
                  <div className="relative z-10 mb-3 flex items-center gap-2 text-brand-light">
                    <SparklesTagIcon />
                    <span className="font-body text-[11.5px] font-extrabold uppercase tracking-wider">
                      {lang === 'en' ? 'Featured Promotion' : 'বিশেষ ক্যাম্পেইন'}
                    </span>
                  </div>

                  <h2 className="relative z-10 mb-3 font-body text-xl sm:text-2xl font-extrabold text-ink">
                    {config.model1.title}
                  </h2>

                  {config.model1.body && (
                    <p className="relative z-10 font-body text-[14px] sm:text-[15px] leading-[1.85] text-ink/85 whitespace-pre-line mb-6">
                      {config.model1.body}
                    </p>
                  )}

                  {config.model1.btn_text && (
                    <div className="relative z-10 pt-1">
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        onClick={() => handleNavigate(config.model1.btn_url)}
                        className="shimmer-sheen inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-info to-brand-light px-7 py-3.5 font-body text-[14.5px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03] cursor-pointer"
                      >
                        <span>{config.model1.btn_text}</span>
                        <ArrowRightIcon />
                      </motion.button>
                    </div>
                  )}
                </div>
              )}

              {/* মডেল ২: প্রমোশনাল ব্যানার ইমেজ */}
              {config.active_model === 'model2' && (
                <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-sh2">
                  <motion.div
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleNavigate(config.model2.url)}
                    className="cursor-pointer overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={optimizeCloudinaryUrl(config.model2.img, 1000)}
                      alt="Promotional Campaign Banner"
                      className="w-full object-cover transition-transform duration-500 hover:scale-[1.01]"
                    />
                  </motion.div>
                </div>
              )}

              {/* মডেল ৩: হট ডিল প্রোডাক্ট কার্ড */}
              {config.active_model === 'model3' && model3Product && (
                <div className="overflow-hidden rounded-[24px] border border-white/90 bg-white/90 p-5 sm:p-7 shadow-sh2 backdrop-blur-md">
                  <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-center">
                    <Link prefetch={false}
                      href={productHref(model3Product)}
                      className="group relative block aspect-square w-full overflow-hidden rounded-[18px] bg-surface-muted shadow-xs no-underline"
                    >
                      {config.model3.badge_text && (
                        <span className="absolute left-3 top-3 z-10 rounded-full bg-[#DC2626] px-3 py-1 font-body text-[11px] font-extrabold text-white shadow-xs">
                          {config.model3.badge_text}
                        </span>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={optimizeCloudinaryUrl((model3Product.imgs || [])[0], 600)}
                        alt={model3Product.name}
                        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />
                    </Link>

                    <div className="flex flex-col justify-center">
                      <div className="mb-1.5 inline-flex items-center gap-1.5 text-brand-light font-body text-[11.5px] font-bold uppercase tracking-wider">
                        <span>🔥</span>
                        <span>{lang === 'en' ? 'Hot Deal of the Week' : 'সপ্তাহের সেরা ডিল'}</span>
                      </div>

                      <Link prefetch={false}
                        href={productHref(model3Product)}
                        className="font-body text-lg sm:text-xl font-extrabold text-ink leading-snug hover:text-brand-light transition-colors no-underline"
                      >
                        {model3Product.name}
                      </Link>

                      <div className="mt-2.5 flex items-baseline gap-2.5 font-body">
                        <span className="text-2xl font-extrabold text-brand-light">
                          ৳{model3Product.price.toLocaleString('en-US')}
                        </span>
                        {model3Product.old > model3Product.price && (
                          <span className="text-sm text-muted line-through">
                            ৳{model3Product.old.toLocaleString('en-US')}
                          </span>
                        )}
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          onClick={() => startQuickOrder(router, model3Product, 1)}
                          className="shimmer-sheen flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-info to-brand-light py-3 font-body text-[13.5px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03] cursor-pointer"
                        >
                          <span>{lang === 'en' ? 'Order Now' : 'অর্ডার করুন'}</span>
                          <ArrowRightIcon />
                        </motion.button>

                        <Link prefetch={false}
                          href={productHref(model3Product)}
                          className="rounded-full border border-border-base bg-white/80 px-5 py-3 font-body text-[13px] font-bold text-ink transition-colors hover:border-brand-light hover:bg-white no-underline text-center"
                        >
                          {lang === 'en' ? 'View Details' : 'বিস্তারিত দেখুন'}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ================= নো-অফার ক্লিন স্টেট ================= */}
          {!loading && !hasActiveOffer && (
            <div className="rounded-[28px] border border-white/90 bg-white/85 p-8 sm:p-12 text-center shadow-sh2 backdrop-blur-md animate-section-reveal">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-brand-light/35 bg-brand-bg/40 text-brand-light shadow-xs">
                <GiftBoxIcon />
              </div>
              <h2 className="font-body text-lg sm:text-xl font-extrabold text-ink mb-1.5">
                {lang === 'en' ? 'No Active Offers Right Now' : 'এই মুহূর্তে কোনো অফার সক্রিয় নেই'}
              </h2>
              <p className="mx-auto max-w-sm font-body text-[13px] leading-relaxed text-muted mb-6">
                {lang === 'en'
                  ? 'Our promotional campaigns are updated periodically. Please explore our regular gadget catalog or check back soon!'
                  : 'আমাদের নতুন অফার বা ক্যাম্পেইন শুরু হলে এই পেজে স্বয়ংক্রিয়ভাবে দেখতে পাবেন। এখনই আমাদের সেরা গ্যাজেট সম্ভার ঘুরে দেখুন!'}
              </p>
              <Link prefetch={false}
                href="/"
                className="shimmer-sheen inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-info to-brand-light px-7 py-3 font-body text-[14px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03] no-underline"
              >
                <span>{lang === 'en' ? 'Explore Products' : 'সকল প্রোডাক্ট দেখুন'}</span>
                <ArrowRightIcon />
              </Link>
            </div>
          )}

        </main>
      </div>

      <Footer />

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
