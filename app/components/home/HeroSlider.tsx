'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logWarn } from '@/lib/logger';
import { sanitizeSvgHtml } from '@/lib/sanitize';
import {
  optimizeCloudinaryUrl,
  buildImageSrcSet,
  HERO_CARD_IMG_WIDTH,
  HERO_SRCSET_WIDTHS,
  HERO_IMG_SIZES,
} from '@/lib/cloudinaryUrl';
import { isModalOpen } from '@/lib/bodyScrollLock';
import { productHref } from '@/lib/productData';
import { scrollToProductsSection } from '@/lib/scrollToProducts';
import { CATEGORY_FILTER_EVENT, FOCUS_PRODUCT_EVENT } from '@/lib/categoryData';
import {
  type HeroCard,
  DUO_TOTAL,
  DEFAULT_HERO_CARDS,
  fetchHeroCards,
  padCards,
} from '@/lib/heroSliderData';

const AUTOPLAY_MS = 5500;
const HOVER_AUTOPLAY_MS = 8000;
const GAP = 12;

function getDuoPerPage(): number {
  if (typeof window === 'undefined') return 2;
  return window.innerWidth >= 768 ? 6 : 2;
}

interface HeroSliderProps {
  initialCards?: HeroCard[];
  onCategoryClick?: (catId: string) => void;
}

function HeroCardImage({
  src,
  srcSet,
  alt,
  isPriority,
}: {
  src: string;
  srcSet?: string;
  alt: string;
  isPriority: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="absolute inset-0 z-0 h-full w-full rounded-[inherit] object-cover object-top opacity-100 transition-transform duration-300 ease-brand group-hover:scale-[1.05]"
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? HERO_IMG_SIZES : undefined}
      alt={alt}
      width={180}
      height={320}
      loading={isPriority ? 'eager' : 'lazy'}
      fetchPriority={isPriority ? 'high' : undefined}
      decoding="async"
      draggable={false}
    />
  );
}

export default function HeroSlider({ initialCards, onCategoryClick }: HeroSliderProps) {
  const supabase = useRef(createClient()).current;
  const router = useRouter();

  const [cards, setCards] = useState<HeroCard[]>(() =>
    padCards(initialCards && initialCards.length ? initialCards : DEFAULT_HERO_CARDS)
  );

  // ⚡ ব্যাচ ৫খ: স্লাইডারের ৩টা কপির মধ্যে প্রথম কপিই (১২টা কার্ড) শুরুতে পুরো আঁকা হয়; ২য়–৩য় কপি
  // (অসীম-লুপের জন্য) খালি ফ্রেম হিসেবে থাকে — মাপ একই, তাই লেআউট/অবস্থান অপরিবর্তিত। `warm` হলে
  // (পেজ লোড + idle, বা প্রথম ইন্টারঅ্যাকশন/অটো-স্লাইডের ঠিক আগে) পুরোটা আঁকা হয়।
  const [warm, setWarm] = useState(false);
  const warmRef = useRef(false);
  const warmNow = useCallback(() => {
    if (warmRef.current) return;
    warmRef.current = true;
    setWarm(true);
  }, []);

  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const duoIdxRef = useRef(0);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInteractingRef = useRef(false);
  const infiniteJumpRef = useRef(false);
  const dragRef = useRef({ active: false, startX: 0 });
  const touchRef = useRef({ startX: 0, startY: 0 });
  const isVisibleRef = useRef(true);

  const preloadedRef = useRef<Set<string>>(new Set());
  const preloadAhead = useCallback((upTo: number) => {
    if (typeof window === 'undefined') return;
    const total = cards.length;
    if (!total) return;
    for (let idx = 0; idx < upTo; idx++) {
      const src = cards[idx % total]?.img;
      if (!src) continue;
      const href = optimizeCloudinaryUrl(src, HERO_CARD_IMG_WIDTH);
      if (preloadedRef.current.has(href)) continue;
      preloadedRef.current.add(href);
      const preloadImg = new window.Image();
      // ⚠️ ব্যাচ ৫ঘ: <img> এখন srcset+sizes দিয়ে ছবি বাছে (ব্যাচ ৫গ)। প্রিলোডও হুবহু একই srcset/sizes দিয়ে না করলে
      // ব্রাউজার আলাদা URL (পুরনো width=240,dpr=2) টেনে একই ছবি দুবার নামাত — HAR/PSI-তে ডুপ্লিকেট (৭০ KiB + ৪১ KiB) দেখা গেছে।
      // `sizes` → `srcset` → `src` ক্রমে সেট করলে ব্রাউজার <img>-এর সমান প্রার্থীই বাছে।
      const srcSet = buildImageSrcSet(src, HERO_SRCSET_WIDTHS);
      if (srcSet) {
        preloadImg.sizes = HERO_IMG_SIZES;
        preloadImg.srcset = srcSet;
      }
      preloadImg.src = href;
    }
  }, [cards]);
  const preloadAheadRef = useRef(preloadAhead);
  preloadAheadRef.current = preloadAhead;

  // প্রথম স্ক্রিনের দৃশ্যমান কার্ডগুলোর তাৎক্ষণিক প্রিলোড + পেজ স্থির হওয়ার পর বাকি কার্ডগুলোর ব্যাকগ্রাউন্ড প্রিলোড
  useEffect(() => {
    if (typeof window === 'undefined' || !cards.length) return;
    const perPage = getDuoPerPage();
    
    preloadAheadRef.current(perPage);

    // 🐢 স্লো কানেকশন / ডেটা সেভার মোডে বাকি কার্ডগুলো আগে থেকে না টেনে, স্ক্রল করে
    // কাছে এলে native lazy loading-এর উপর ছেড়ে দেওয়া হয় — যাতে প্রথম LCP ছবির
    // সাথে ব্যান্ডউইথ ভাগ না হয়।
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    const conn = nav.connection;
    const isSlowConnection =
      !!conn && (conn.saveData === true || /^(slow-2g|2g|3g)$/.test(conn.effectiveType || ''));
    if (isSlowConnection) return;

    // ⚡ ব্যাচ ৫খ: আগে পেজ লোডের পর বাকি সব (১০টা) কার্ডের ছবি একসাথে নামত (~৫০০ KB)। এখন শুধু পরের
    // ২ পেজ (মোবাইলে ৪টা); বাকিগুলো অটো-স্লাইড এগোলে `preloadAhead` দিয়ে ধাপে ধাপে।
    const idlePreload = () => {
      preloadAheadRef.current(perPage * 3);
      warmNow();
    };

    let idleId: number | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    // পেজ পুরোপুরি লোড (সব ক্রিটিক্যাল রিসোর্স সহ) হওয়ার পরেই বাকি কার্ডগুলোর
    // ব্যাকগ্রাউন্ড প্রিলোড শিডিউল করা হয়, যাতে LCP/ফন্টের সাথে প্রতিযোগিতা না করে।
    const schedule = () => {
      if (cancelled) return;
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(idlePreload, { timeout: 4000 });
      } else {
        timerId = setTimeout(idlePreload, 3000);
      }
    };

    if (document.readyState === 'complete') {
      schedule();
    } else {
      window.addEventListener('load', schedule, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('load', schedule);
      if (idleId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId) clearTimeout(timerId);
    };
  }, [cards, warmNow]);

  // 🚀 জিরো রিফ্লো পজিশনিং — কোনো DOM নোড মিউটেশন ছাড়া সরাসরি GPU কম্পোজিটর ট্রান্সফর্ম
  const setPosition = useCallback((animate: boolean) => {
    const track = trackRef.current;
    const wrap = wrapRef.current;
    if (!track || !wrap) return;

    const perPage = getDuoPerPage();
    const wrapWidth = wrap.clientWidth;
    if (!wrapWidth || wrapWidth < 50) return;

    const cardWidth = (wrapWidth - GAP * (perPage - 1)) / perPage;
    const offset = duoIdxRef.current * (cardWidth + GAP);

    if (animate) {
      track.style.transition = 'transform .48s cubic-bezier(.4,0,.2,1)';
      track.style.transform = `translate3d(-${offset}px, 0, 0)`;
      return;
    }

    track.style.transition = 'none';
    track.style.transform = `translate3d(-${offset}px, 0, 0)`;
  }, []);

  // 🔄 জিরো-বাউন্স সিমেট্রিক্যাল ইনফিনিট সোয়াইপ হ্যান্ডলার
  const duoStep = useCallback((dir: number) => {
    const perPage = getDuoPerPage();
    const totalCards = cards.length;

    // ⚡ ব্যাচ ৫খ: লুপের ২য়–৩য় কপি তখনো খালি থাকলে, কোনো জাম্প/অ্যানিমেশনের আগেই সিঙ্ক্রোনাসলি আঁকি।
    if (!warmRef.current) {
      warmRef.current = true;
      flushSync(() => setWarm(true));
    }

    if (dir < 0 && duoIdxRef.current <= 0) {
      infiniteJumpRef.current = true;
      duoIdxRef.current = totalCards;
      setPosition(false);
      infiniteJumpRef.current = false;
    }

    duoIdxRef.current += dir * perPage;
    setPosition(true);
    // পরের ২ পেজের ছবি আগে থেকে (একবারই, ডুপ্লিকেট সেট দিয়ে) — মাথার ওপর বাড়তি রিকোয়েস্ট নয়।
    preloadAheadRef.current(
      Math.max(0, duoIdxRef.current % Math.max(totalCards, 1)) + perPage * 3
    );
  }, [cards.length, setPosition]);

  const startAuto = useCallback((intervalMs = AUTOPLAY_MS) => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = setInterval(() => {
      // মডাল/ড্রয়ার খোলা থাকলে অটো-স্লাইড হবে না (ব্যাটারি ও ফোকাস)
      if (!isInteractingRef.current && isVisibleRef.current && !isModalOpen()) {
        duoStep(1);
      }
    }, intervalMs);
  }, [duoStep]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;
    setPosition(false);
  }, [setPosition]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    startAuto(AUTOPLAY_MS);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisibleRef.current = entry.isIntersecting;
        if (!entry.isIntersecting) {
          if (autoTimerRef.current) {
            clearInterval(autoTimerRef.current);
            autoTimerRef.current = null;
          }
        } else {
          if (!autoTimerRef.current && !isInteractingRef.current) {
            startAuto(AUTOPLAY_MS);
          }
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(wrap);

    const onTouchStart = (e: TouchEvent) => {
      warmNow();
      touchRef.current.startX = e.touches[0].clientX;
      touchRef.current.startY = e.touches[0].clientY;
      isInteractingRef.current = true;
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchRef.current.startX;
      const dy = e.changedTouches[0].clientY - touchRef.current.startY;
      if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) {
        duoStep(dx < 0 ? 1 : -1);
      }
      isInteractingRef.current = false;
      setTimeout(() => {
        if (isVisibleRef.current) startAuto(AUTOPLAY_MS);
      }, 2500);
    };

    const onTouchCancel = () => {
      isInteractingRef.current = false;
      if (isVisibleRef.current) startAuto(AUTOPLAY_MS);
    };

    const onMouseEnter = () => {
      warmNow();
      if (window.innerWidth >= 768) {
        startAuto(HOVER_AUTOPLAY_MS);
      }
    };

    const onMouseLeaveAuto = () => {
      if (window.innerWidth >= 768) {
        startAuto(AUTOPLAY_MS);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (window.innerWidth < 768) return;
      dragRef.current.startX = e.clientX;
      dragRef.current.active = true;
      isInteractingRef.current = true;
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      isInteractingRef.current = false;
      const dx = e.clientX - dragRef.current.startX;
      if (Math.abs(dx) > 40) {
        duoStep(dx < 0 ? 1 : -1);
      }
      setTimeout(() => {
        if (isVisibleRef.current) startAuto(AUTOPLAY_MS);
      }, 1500);
    };

    const onMouseLeaveDrag = () => {
      if (dragRef.current.active) {
        dragRef.current.active = false;
        isInteractingRef.current = false;
        if (isVisibleRef.current) startAuto(AUTOPLAY_MS);
      }
    };

    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target !== trackRef.current || infiniteJumpRef.current) return;

      const totalCards = cards.length;
      if (duoIdxRef.current >= totalCards * 2) {
        infiniteJumpRef.current = true;
        duoIdxRef.current -= totalCards;
        setPosition(false);
        infiniteJumpRef.current = false;
      } else if (duoIdxRef.current < totalCards) {
        infiniteJumpRef.current = true;
        duoIdxRef.current += totalCards;
        setPosition(false);
        infiniteJumpRef.current = false;
      }
    };

    const onResize = () => {
      if (typeof window !== 'undefined' && window.visualViewport && window.visualViewport.scale !== 1) return;
      requestAnimationFrame(() => setPosition(false));
    };

    const onDocVisibility = () => {
      if (document.hidden) {
        isInteractingRef.current = true;
        if (autoTimerRef.current) {
          clearInterval(autoTimerRef.current);
          autoTimerRef.current = null;
        }
      } else {
        isInteractingRef.current = false;
        setPosition(false);
        if (isVisibleRef.current) startAuto(AUTOPLAY_MS);
      }
    };

    document.addEventListener('visibilitychange', onDocVisibility);
    wrap.addEventListener('touchstart', onTouchStart, { passive: true });
    wrap.addEventListener('touchend', onTouchEnd, { passive: true });
    wrap.addEventListener('touchcancel', onTouchCancel, { passive: true });
    wrap.addEventListener('mouseenter', onMouseEnter);
    wrap.addEventListener('mouseleave', onMouseLeaveAuto);
    wrap.addEventListener('mousedown', onMouseDown);
    wrap.addEventListener('mouseup', onMouseUp);
    wrap.addEventListener('mouseleave', onMouseLeaveDrag);
    track.addEventListener('transitionend', onTransitionEnd);
    window.addEventListener('resize', onResize);

    return () => {
      observer.disconnect();
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      wrap.removeEventListener('touchstart', onTouchStart);
      wrap.removeEventListener('touchend', onTouchEnd);
      wrap.removeEventListener('touchcancel', onTouchCancel);
      wrap.removeEventListener('mouseenter', onMouseEnter);
      wrap.removeEventListener('mouseleave', onMouseLeaveAuto);
      wrap.removeEventListener('mousedown', onMouseDown);
      wrap.removeEventListener('mouseup', onMouseUp);
      wrap.removeEventListener('mouseleave', onMouseLeaveDrag);
      track.removeEventListener('transitionend', onTransitionEnd);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onDocVisibility);
    };
  }, [cards.length, duoStep, setPosition, startAuto, warmNow]);

  useEffect(() => {
    if (initialCards && initialCards.length) return;
    const loadCards = async () => {
      try {
        const fetched = await fetchHeroCards(supabase);
        setCards(padCards(fetched));
      } catch (e) {
        logWarn('Hero card fetch failed:', e);
      }
    };
    loadCards();
  }, [supabase, initialCards]);

  const handleManualPrev = () => {
    isInteractingRef.current = true;
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    duoStep(-1);
    setTimeout(() => {
      isInteractingRef.current = false;
      if (isVisibleRef.current) startAuto(AUTOPLAY_MS);
    }, 2500);
  };

  const handleManualNext = () => {
    isInteractingRef.current = true;
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    duoStep(1);
    setTimeout(() => {
      isInteractingRef.current = false;
      if (isVisibleRef.current) startAuto(AUTOPLAY_MS);
    }, 2500);
  };

  const scrollToProdSec = () => scrollToProductsSection();

  const goCategory = (catId: string) => {
    if (typeof onCategoryClick === 'function') {
      onCategoryClick(catId);
    }
    try {
      const url = catId === 'all' ? '/' : `/?cat=${encodeURIComponent(catId)}`;
      window.history.replaceState({ homeCurrent: true, vcCat: catId }, '', url);
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent(CATEGORY_FILTER_EVENT, { detail: { catId } }));
    scrollToProdSec();
  };

  // কার্ডের লিংক ধরন অনুযায়ী: category / grid (গ্রিডে ওই প্রোডাক্ট) / product (ডিটেলস পেজ)
  const handleCardClick = (card: HeroCard) => {
    const type = card.linkType || 'category';
    const pid = card.productId;
    if (type === 'product' && pid) {
      router.push(productHref({ id: pid, name: card.productName || String(pid) }));
      return;
    }
    if (type === 'grid' && pid) {
      const catId = card.catId || 'all';
      window.dispatchEvent(new CustomEvent(CATEGORY_FILTER_EVENT, { detail: { catId } }));
      window.dispatchEvent(new CustomEvent(FOCUS_PRODUCT_EVENT, { detail: { productId: String(pid), catId } }));
      return;
    }
    goCategory(card.catId || 'all');
  };

  const tripled = [...cards, ...cards, ...cards];

  return (
    <div className="relative mx-auto max-w-[1300px] bg-transparent px-3.5 pt-3.5 sm:px-5 2xl:max-w-[1560px]">
      <style>{`
        @keyframes heroCardIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-card-anim-in {
          animation: heroCardIn 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
          will-change: opacity, transform;
        }
        /* সার্চ রেজাল্ট পেজের ক্যাটাগরি বাটন থেকে হোমে এলে (SearchClient.tsx <html>-এ এই অ্যাট্রিবিউট
           বসায়) কার্ডের এন্ট্রি অ্যানিমেশন বন্ধ — স্বাভাবিকভাবে হোমে ঢুকলে আগের মতোই চলবে */
        html[data-skip-home-anim] .hero-card-anim-in {
          animation: none !important;
          opacity: 1 !important;
          transform: none !important;
          will-change: auto;
        }
        @media (max-width: 767.98px) {
          .hero-card-anim-in[data-hero-desktop-extra='true'] {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div className="relative w-full touch-pan-y overflow-hidden bg-transparent" ref={wrapRef}>
        <div className="flex gap-3 bg-transparent" style={{ willChange: 'transform' }} ref={trackRef}>
          {tripled.map((card, i) => {
            const bg = card.bg || 'linear-gradient(155deg,#111,#222)';
            const catId = card.catId || 'all';
            const label = card.label || '';
            const isSvgEmoji = typeof card.emoji === 'string' && card.emoji.trim().startsWith('<svg');

            const isFirstDuo = i < 2;
            const isDesktopExtra = i >= 2 && i < 6;
            const isInitialCard = isFirstDuo || isDesktopExtra;
            // ⚡ ব্যাচ ৫খ: লুপের ২য়–৩য় কপি (i ≥ cards.length) warm হওয়ার আগে খালি ফ্রেম — একই মাপ, কোনো ছবি/blur নেই।
            const deferredCopy = !warm && i >= cards.length;
            const staggerDelay = i * 0.03;
            const isPriority = i < 2;

            return (
              <div
                data-cath-card
                key={`${catId}-${i}`}
                className="aspect-[9/16] w-[calc((100%-12px)/2)] min-h-[220px] shrink-0 sm:min-h-[280px] md:w-[calc((100%-60px)/6)]"
              >
                {deferredCopy ? null : <div
                  className={`group relative flex h-full w-full cursor-pointer flex-col justify-end overflow-hidden rounded-[14px] bg-[#111] shadow-[0_4px_16px_rgba(0,0,0,.08)] transition-transform duration-300 ease-brand [-webkit-tap-highlight-color:transparent] hover:-translate-y-0.5 hover:scale-[1.006] active:scale-[.98] ${
                    isInitialCard ? 'hero-card-anim-in' : ''
                  }`}
                  data-hero-desktop-extra={isDesktopExtra ? 'true' : undefined}
                  style={{
                    background: bg,
                    animationDelay: isInitialCard ? `${staggerDelay}s` : undefined,
                  }}
                  onClick={() => handleCardClick(card)}
                >
                  {card.img ? (
                    <HeroCardImage
                      src={optimizeCloudinaryUrl(card.img, HERO_CARD_IMG_WIDTH)}
                      srcSet={buildImageSrcSet(card.img, HERO_SRCSET_WIDTHS)}
                      alt={card.alt?.trim() || label}
                      isPriority={isPriority}
                    />
                  ) : isSvgEmoji ? (
                    <div
                      className="absolute inset-0 z-0 flex items-center justify-center pb-[60px] text-[72px] leading-none transition-transform duration-[550ms] ease-brand [filter:drop-shadow(0_4px_20px_rgba(0,0,0,.6))] group-hover:scale-[1.06] [&_svg]:h-20 [&_svg]:w-20"
                      dangerouslySetInnerHTML={{ __html: sanitizeSvgHtml(card.emoji) }}
                    />
                  ) : card.emoji ? (
                    <div className="absolute inset-0 z-0 flex items-center justify-center pb-[60px] text-[72px] leading-none transition-transform duration-[550ms] ease-brand [filter:drop-shadow(0_4px_20px_rgba(0,0,0,.6))] group-hover:scale-[1.06]">
                      {card.emoji}
                    </div>
                  ) : null}

                  <div
                    className="pointer-events-none absolute inset-0 z-[1]"
                    style={{
                      background:
                        'linear-gradient(to bottom, transparent 0%, transparent 55%, rgba(0,0,0,.40) 78%, rgba(0,0,0,.65) 100%)',
                    }}
                  />

                  <div className="relative z-[2] flex flex-col items-start gap-[5px] px-3 pb-[14px]">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/[.16] px-2.5 py-[4px] text-[10.5px] font-bold uppercase tracking-[.3px] text-white shadow-[0_2px_10px_rgba(0,0,0,.2)] backdrop-blur-[8px] transition-[background,border-color,transform] duration-200 group-hover:translate-x-0.5 group-hover:border-white/50 group-hover:bg-white/[.26]">
                      {label}
                    </span>
                  </div>
                </div>}
              </div>
            );
          })}
        </div>
      </div>

      <button
        className="absolute left-1 top-[calc(50%-7px)] z-20 hidden h-[38px] w-[38px] -translate-y-1/2 items-center justify-center rounded-full bg-white/[.94] text-[22px] font-bold leading-none text-ink shadow-[0_4px_16px_rgba(0,0,0,.22)] transition-all duration-200 ease-out hover:scale-110 hover:bg-white hover:shadow-[0_6px_22px_rgba(0,0,0,.28)] md:flex"
        onClick={handleManualPrev}
        aria-label="Previous"
      >
        &#8249;
      </button>
      <button
        className="absolute right-1 top-[calc(50%-7px)] z-20 hidden h-[38px] w-[38px] -translate-y-1/2 items-center justify-center rounded-full bg-white/[.94] text-[22px] font-bold leading-none text-ink shadow-[0_4px_16px_rgba(0,0,0,.22)] transition-all duration-200 ease-out hover:scale-110 hover:bg-white hover:shadow-[0_6px_22px_rgba(0,0,0,.28)] md:flex"
        onClick={handleManualNext}
        aria-label="Next"
      >
        &#8250;
      </button>
    </div>
  );
}
