'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  productHref,
  startQuickOrder,
  QUICK_CART_EVENT,
} from '@/lib/productData';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { useCartStore } from '@/lib/store/cartStore';
import { showToast } from '@/lib/toast';
import {
  optimizeCloudinaryUrl,
  buildImageSrcSet,
  PRODUCT_SRCSET_WIDTHS,
  PRODUCT_IMG_SIZES,
} from '@/lib/cloudinaryUrl';
import { attachProductToNavHint } from '@/lib/productNavHint';
import { useImageRetry } from '@/lib/useImageRetry';
import { useT } from '@/lib/i18n/useT';
import { prefersReducedMotion, makeHeartBurst, BurstHeart, type HeartParticle } from '@/lib/wishHeartBurst';
import type { Product } from '@/types';

function StarRating({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, rating || 4.5));
  const full = Math.floor(r);
  const partial = r - full;
  const empty = 5 - full - (partial > 0 ? 1 : 0);
  const pct = Math.round(partial * 100);
  return (
    <span className="text-[#FFC530]">
      {Array.from({ length: full }).map((_, i) => <span key={'f' + i}>★</span>)}
      {partial > 0 && (
        <span className="relative inline-block text-white/30">
          ★
          <span className="absolute left-0 top-0 overflow-hidden text-[#FFC530]" style={{ width: pct + '%' }}>★</span>
        </span>
      )}
      {Array.from({ length: empty }).map((_, i) => <span key={'e' + i} className="text-white/30">★</span>)}
    </span>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="52%" height="52%" viewBox="0 0 24 24" fill={filled ? '#FF5A6E' : 'none'} stroke={filled ? '#FF5A6E' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────────
// উইশলিস্টে "লাভ" (হার্ট) ক্লিক করলে প্রোডাক্ট কার্ডের হার্ট আইকন থেকেই
// ৫-৬টা ছোট হার্ট ছড়িয়ে/ভেসে উঠে ফেড-আউট হয়ে যায়। প্রোডাক্ট ডিটেল পেজের
// উইশলিস্ট বাটনেও এই একই এনিমেশন ব্যবহার হয় — লজিক @/lib/wishHeartBurst-এ
// শেয়ার্ড, যাতে দুই জায়গায় একদম সেম এনিমেশন দেখা যায়।

function CartIcon() {
  return (
    <svg width="46%" height="46%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function CartCheckIcon() {
  return (
    <svg width="50%" height="50%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5l5 5L20 6" />
    </svg>
  );
}

function ProdImg({ imgVal, name, lazy }: { imgVal?: string; name: string; lazy?: boolean }) {
  // একবার ব্যর্থ হলে ১.৫s পর আবার চেষ্টা; দ্বিতীয়বারও ব্যর্থ হলে তবেই 📦
  const { attempt, waiting, failed, onError } = useImageRetry(1);
  const isUrl = typeof imgVal === 'string' && (imgVal.startsWith('http://') || imgVal.startsWith('https://'));
  if (!imgVal) return <span className="text-[52px]">📦</span>;
  if (isUrl && !failed) {
    const productSrcSet = buildImageSrcSet(imgVal, PRODUCT_SRCSET_WIDTHS);
    return (
      <img
        key={attempt}
        src={optimizeCloudinaryUrl(imgVal, 380)}
        srcSet={productSrcSet}
        sizes={productSrcSet ? PRODUCT_IMG_SIZES : undefined}
        alt={name || ''}
        width={380}
        height={667}
        loading={lazy ? 'lazy' : 'eager'}
        fetchPriority={lazy ? undefined : 'high'}
        decoding="async"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className={`block h-full w-full select-none object-cover object-top [-webkit-touch-callout:none]${waiting ? ' invisible' : ''}`}
        onError={onError}
      />
    );
  }
  if (isUrl && failed) return <span className="text-[52px]">📦</span>;
  return <span className="text-[52px]">{imgVal}</span>;
}

interface ProductCardProps {
  prod: Product;
  isFirst?: boolean;
  index?: number;
  /** true হলে ছবি সবসময় lazy (ডিফল্ট: প্রথম ২টা কার্ড eager+high)। যে সেকশন ভাঁজের অনেক নিচে (যেমন প্রোডাক্ট পেজের
   *  "রিলেটেড") সেখানে true দাও — নাহলে ভাঁজের নিচের ২টা ছবি মূল (LCP) ছবির সাথে ব্যান্ডউইথ ভাগ করে নামে। */
  lazyImage?: boolean;
}

export default function ProductCard({ prod: p, isFirst, index = 0, lazyImage = false }: ProductCardProps) {
  const { t, lang } = useT();
  const router = useRouter();
  const rawWished = useWishlistStore((s) => s.wishlist.some((x) => String(x.id) === String(p.id)));
  const [wished, setWished] = useState(false);
  const [burst, setBurst] = useState<{ id: number; particles: HeartParticle[] } | null>(null);
  const burstSeedRef = useRef(0);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cartPop, setCartPop] = useState<number | null>(null);
  const cartPopSeedRef = useRef(0);
  const cartPopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 🛡️ রিকোয়েস্ট-সেভিং ইন্টেন্ট-প্রিফেচ: মাউস শুধু পাশ দিয়ে গেলে বা আঙুল স্ক্রল করতে কার্ড ছুঁলে
  // প্রিফেচ হবে না; কয়েক মিলিসেকেন্ড ধরে থাকলে তবেই এই একটা কার্ডের পেজ প্রিফেচ হয়।
  const intentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelIntentPrefetch = () => {
    if (intentTimerRef.current) {
      clearTimeout(intentTimerRef.current);
      intentTimerRef.current = null;
    }
  };
  const scheduleIntentPrefetch = (delayMs: number) => {
    cancelIntentPrefetch();
    intentTimerRef.current = setTimeout(() => {
      intentTimerRef.current = null;
      router.prefetch(href);
    }, delayMs);
  };
  useEffect(() => cancelIntentPrefetch, []);

  useEffect(() => {
    setWished(rawWished);
  }, [rawWished]);

  useEffect(() => () => {
    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    if (cartPopTimerRef.current) clearTimeout(cartPopTimerRef.current);
  }, []);

  const sold = p.stock <= 0;
  const discPct = p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0;
  const showDiscBadge = discPct >= 5 && !sold;
  const href = productHref(p);

  const handleWish = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = useWishlistStore.getState().toggleWish(p);
    if (added) {
      const reducedMotion = prefersReducedMotion();
      if (!reducedMotion) {
        const seed = ++burstSeedRef.current;
        if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
        setBurst({ id: seed, particles: makeHeartBurst(seed) });
        burstTimerRef.current = setTimeout(() => {
          setBurst((prev) => (prev && prev.id === seed ? null : prev));
        }, 850);
      }
    }
  };

  const handleAddToCartDirect = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (sold) return;

    const res = useCartStore.getState().addToCart([p], p.id, 1);
    if (res.ok) {
      showToast(t('কার্টে যোগ হয়েছে'));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(QUICK_CART_EVENT, { detail: { id: p.id } }));
      }
      const seed = ++cartPopSeedRef.current;
      if (cartPopTimerRef.current) clearTimeout(cartPopTimerRef.current);
      if (!prefersReducedMotion()) {
        setCartPop(seed);
        cartPopTimerRef.current = setTimeout(() => {
          setCartPop((prev) => (prev === seed ? null : prev));
        }, 900);
      }
    } else if (res.reason === 'stock') {
      showToast(t('স্টক শেষ!'));
    } else if (res.reason === 'limit') {
      showToast(t('একটি পণ্য সর্বোচ্চ ১০টি নেওয়া যাবে'));
    }
  };

  const handleOrderNowDirect = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (sold) return;
    startQuickOrder(router, p, 1);
  };

  // 🔒 ফিক্স (পারফরম্যান্স অপটিমাইজেশন, ২০২৬-১০): আগে প্রতিটা কার্ডে সবসময়
  // `[transform:translateZ(0)]` বসানো থাকত — মানে পেজে যতগুলো কার্ড মাউন্টেড
  // (কয়েকশো হলে কয়েকশো), ঠিক ততগুলো আলাদা GPU compositor layer তৈরি হতো, যা
  // মোবাইলে GPU মেমরি/স্ক্রল FPS-এর উপর বড় চাপ ফেলত। `[contain:content]` এমনিতেই
  // লেআউট/পেইন্ট আইসোলেশন দেয় বলে এই ফোর্সড লেয়ারের দরকার নেই — শুধু হার্ট-বার্স্ট/
  // কার্ট-পপ অ্যানিমেশন চলাকালীন (কয়েকশো মিলিসেকেন্ডের জন্য) `transform-gpu` যোগ হয়,
  // বাকি সময় কার্ডটা হালকা থাকে।
  const isAnimatingTransform = !!burst || cartPop !== null;

  // প্রোডাক্ট লিংকে ক্লিক হলে কার্ডের তথ্য (শুধু GRID_COLS-এর অংশ) নেভিগেশন-হিন্টে জুড়ে দেয়, যাতে প্রোডাক্ট পেজ
  // খোলার ফাঁকে ছবি/দাম/স্টক/ওয়ারেন্টি সঙ্গে সঙ্গে দেখানো যায়। document-লেভেল capture লিসেনার (ProductNavOverlay)
  // আগে চলে হিন্ট বানায়, এটা তার পর চলে তথ্য যোগ করে।
  const handleProductNavCapture = (e: React.MouseEvent) => {
    const target = e.target as Element | null;
    if (!target || typeof target.closest !== 'function' || !target.closest('a[href^="/product/"]')) return;
    const imgs = Array.isArray(p.imgs) ? p.imgs : [];
    attachProductToNavHint({
      img: imgs[0] || null,
      imgCount: imgs.length,
      price: p.price,
      old: p.old,
      stock: p.stock,
      badge: p.badge,
      warranty: p.warranty,
      hasColorGroup: !!p.colorGroupId,
      // seoH1 ফিল্ডটাই নেই (পুরনো ক্যাশ/অন্য কুয়েরি) হলে খালি — স্কেলেটন তখন টাইটেল-বার দেখায়, ভুল নাম নয়
      title: p.seoH1 === undefined ? '' : p.seoH1 || p.name,
      id: String(p.id),
    });
  };

  // ⚡ ব্যাচ ৫ক: ভাঁজের নিচের কার্ডগুলো (প্রথম ৪টা বাদে) অফস্ক্রিনে থাকলে ব্রাউজার তাদের লেআউট/পেইন্ট/ছবি-লোড
  // বাদ দেয় (content-visibility:auto) এবং ভিউপোর্টের কাছে এলে আঁকে। `auto` কিওয়ার্ড একবার আঁকার পর আসল মাপ মনে রাখে;
  // তার আগে ~৩০০px ধরা হয়। কার্ডে আগে থেকেই [contain:content] আছে, তাই হোভার-গ্লো/শ্যাডোর ক্লিপিং বদলায় না।
  const cvAuto = lazyImage || (!isFirst && index >= 4);

  return (
    <div
      data-pid={p.id}
      onClickCapture={handleProductNavCapture}
      onMouseEnter={() => scheduleIntentPrefetch(120)}
      onMouseLeave={cancelIntentPrefetch}
      onTouchStart={() => scheduleIntentPrefetch(70)}
      onTouchMove={cancelIntentPrefetch}
      onTouchEnd={cancelIntentPrefetch}
      onTouchCancel={cancelIntentPrefetch}
      className={`card-hover-glow group rounded-[18px] bg-white p-1 shadow-[0_4px_14px_rgba(0,88,199,.12)] [contain:content] ${cvAuto ? '[content-visibility:auto] [contain-intrinsic-size:auto_300px]' : ''} ${isAnimatingTransform ? 'transform-gpu' : ''}`}
    >
      <div className="relative aspect-[0.57] overflow-hidden rounded-[14px] bg-surface-muted [contain:paint_layout]">
        <Link prefetch={false}
          href={href}
          className="absolute inset-0 block cursor-pointer transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.06]"
        >
          <ProdImg imgVal={(p.imgs || ['📦'])[0]} name={p.name} lazy={lazyImage || (!isFirst && index >= 2)} />
        </Link>

        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 58%, rgba(8,12,22,.55) 78%, rgba(5,7,14,.95) 100%)' }}
        />

        {sold ? (
          <div className="absolute left-[4.5%] top-[4.5%] z-[2] rounded-full bg-[#5A6578] px-2.5 py-1 text-[10.5px] font-bold text-white shadow-xs">
            {lang === 'en' ? 'Sold Out' : 'স্টক শেষ'}
          </div>
        ) : p.badge && (
          <div className="absolute left-[4.5%] top-[4.5%] z-[2] rounded-full bg-brand-light px-2.5 py-1 text-[10px] font-bold text-white shadow-sh1">
            {p.badge}
          </div>
        )}

        <div className="absolute right-[4.5%] top-[4.5%] z-[3] h-7 w-7 sm:h-8 sm:w-8">
          <button
            type="button"
            onClick={handleWish}
            title="Wishlist"
            aria-label="Wishlist"
            className={`flex h-full w-full shrink-0 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-90 ${
              wished
                ? 'bg-white/95 text-[#FF5A6E] shadow-xs'
                : 'border border-white/40 bg-black/25 text-white hover:bg-black/35'
            }`}
          >
            <motion.span
              key={burst ? `pop-${burst.id}` : 'idle'}
              initial={burst ? { scale: 1 } : false}
              animate={burst ? { scale: [1, 1.35, 0.92, 1.05, 1] } : { scale: 1 }}
              transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex h-full w-full items-center justify-center"
            >
              <HeartIcon filled={wished} />
            </motion.span>
          </button>

          <AnimatePresence>
            {burst && (
              <div className="pointer-events-none absolute inset-0">
                {burst.particles.map((pt) => (
                  <BurstHeart key={pt.id} p={pt} />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-[2] p-2 sm:p-3">
          <Link prefetch={false}
            href={href}
            title={p.name}
            className="block w-full cursor-pointer truncate overflow-hidden text-ellipsis whitespace-nowrap font-body text-[11px] font-extrabold leading-tight text-white no-underline hover:underline sm:text-sm xl:text-xs"
          >
            {p.name}
          </Link>
          <div className="mt-0.5 flex items-center gap-1 font-body text-[9px] sm:mt-1 sm:text-[11px]">
            <StarRating rating={p.rating || 4.5} />
            <span className="text-white/75">{(p.rating || 4.5).toFixed(1)}</span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1 sm:gap-1.5 font-body">
            <span className="text-sm font-extrabold text-white sm:text-lg xl:text-sm">৳{p.price.toLocaleString('en-US')}</span>
            {p.old > p.price && (
              <>
                <span className="text-[10px] text-white/50 line-through sm:text-xs">৳{p.old.toLocaleString('en-US')}</span>
                {showDiscBadge && (
                  <span className="whitespace-nowrap text-[12px] font-bold text-success sm:text-[14px] xl:text-[13px]">-{discPct}%</span>
                )}
              </>
            )}
          </div>

          <div className="mt-1 flex w-full items-center gap-1 sm:mt-1.5 sm:gap-1.5">
            {sold ? (
              <button
                type="button"
                disabled
                className="flex h-8 w-full min-w-0 items-center justify-center rounded-full border border-white/20 bg-[#5A6578] font-body text-[11.5px] font-bold text-white shadow-xs cursor-not-allowed select-none sm:h-9 sm:text-xs lg:h-9"
              >
                {lang === 'en' ? 'Out of Stock' : 'স্টক শেষ'}
              </button>
            ) : (
              <>
                {/* Frosted Glass Cart Button */}
                <div className="relative shrink-0">
                  <motion.button
                    type="button"
                    className="box-border flex aspect-square h-8 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/20 text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-colors duration-150 hover:bg-white/30 hover:border-white/70 sm:h-9 lg:h-9"
                    title={t('কার্টে যোগ করুন')}
                    aria-label={t('কার্টে যোগ করুন')}
                    onClick={handleAddToCartDirect}
                    animate={cartPop ? { scale: [1, 0.8, 1.18, 0.95, 1] } : { scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                    whileTap={{ scale: 0.85 }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {cartPop ? (
                        <motion.span
                          key="check"
                          initial={{ opacity: 0, scale: 0.4, rotate: -35 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                          className="flex h-full w-full items-center justify-center text-emerald-300"
                        >
                          <CartCheckIcon />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="cart"
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ duration: 0.25 }}
                          className="flex h-full w-full items-center justify-center"
                        >
                          <CartIcon />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <AnimatePresence>
                    {cartPop && (
                      <motion.span
                        key={cartPop}
                        initial={{ opacity: 0, y: 0, scale: 0.7 }}
                        animate={{ opacity: [0, 1, 1, 0], y: -22, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.75, ease: [0.22, 0.7, 0.2, 1], times: [0, 0.2, 0.65, 1] }}
                        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-sh1"
                      >
                        +1
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Refined Crystal Liquid Glass Button (Based on Image 3 with Fresh Ice-Sky Tint) */}
                <motion.button
                  type="button"
                  className="order-btn-glow relative flex h-8 min-w-0 flex-1 items-center justify-center overflow-hidden whitespace-nowrap rounded-full border border-white/90 font-body text-[12px] font-extrabold tracking-wide shadow-[inset_0_1.5px_2px_rgba(255,255,255,1),0_3px_10px_rgba(0,88,199,0.12)] sm:h-9 sm:text-[13px] lg:h-9"
                  onClick={handleOrderNowDirect}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 18 }}
                >
                  <span className="relative z-10">
                    {lang === 'en' ? 'Order Now' : 'অর্ডার করুন'}
                  </span>
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
