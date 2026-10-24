'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { logWarn } from '@/lib/logger';
import { getDeviceId, fetchMyLikedIds } from '@/lib/deviceId';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { lockBody, unlockBody, isModalOpen } from '@/lib/bodyScrollLock';
import { useT } from '@/lib/i18n/useT';
import { prefersReducedMotion, makeHeartBurst, BurstHeart, type HeartParticle } from '@/lib/wishHeartBurst';

interface Review {
  id: number | string;
  image_url?: string | null;
  alt_text?: string | null;
  like_count?: number | string | null;
  created_at?: string;
  liked?: boolean;
}

// alt_text না থাকলে (পুরনো রো) এই সাধারণ বর্ণনা — আগের "Customer Review"-এর চেয়ে অর্থবহ
const FALLBACK_REVIEW_ALT = 'Vangcur customer review photo';

const AUTOPLAY_MS = 5200;
const RESUME_DELAY_MS = 3200;
const GALLERY_CACHE_KEY = 'vc_gallery_reviews_cache';
const GALLERY_CACHE_TS_KEY = 'vc_gallery_reviews_ts';
const GALLERY_CACHE_TTL_MS = 10 * 60 * 1000;

function getCachedReviews(): Review[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(GALLERY_CACHE_KEY);
    const ts = Number(sessionStorage.getItem(GALLERY_CACHE_TS_KEY)) || 0;
    if (raw && Date.now() - ts < GALLERY_CACHE_TTL_MS) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function setCachedReviews(items: Review[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(GALLERY_CACHE_KEY, JSON.stringify(items));
    sessionStorage.setItem(GALLERY_CACHE_TS_KEY, String(Date.now()));
  } catch {
    // storage limit safe
  }
}

// 🛠️ ফিক্স: sessionStorage-এর ক্যাশ শুধু বর্তমান ট্যাব/সেশনের জন্য বাঁচে (~১০ মিনিট
// TTL অথবা ট্যাব বন্ধ হওয়া পর্যন্ত)। এতদিন "liked" স্ট্যাটাস শুধু ওই ক্যাশেই রাখা
// হতো — নতুন সেশনে (নতুন ট্যাব/ব্রাউজার রিস্টার্ট/TTL শেষ) ফ্রেশ DB ফেচ হলে liked
// সবসময় false দিয়ে শুরু হতো, ফলে ইউজারের কাছে মনে হতো লাইক "মুছে" যাচ্ছে। রিভিউ
// গ্যালারির মতোই এখানে localStorage-ভিত্তিক স্থায়ী liked-লিস্ট রাখা হলো, যা নতুন
// সেশনেও টিকে থাকবে।
const LIKED_GALLERY_KEY = 'vc_liked_gallery';

function getLikedGalleryIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const parsed = JSON.parse(localStorage.getItem(LIKED_GALLERY_KEY) || '[]');
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

// এই ডিভাইসের সার্ভার-লাইক সেশনে একবারই মেলানো হয় (আগে প্রতিটি হোম-লোডে একটা RPC যেত — ক্যাশ থাকলেও)।
// ডিভাইস-আইডি কুকিতেও থাকে, তাই লোকাল-স্টোরেজ মুছে গেলেও নতুন সেশনে লাইক ফিরে আসে।
const LIKES_SYNCED_KEY = 'vc_likes_synced_gal';
function likesAlreadySyncedThisSession(): boolean {
  try { return sessionStorage.getItem(LIKES_SYNCED_KEY) === '1'; } catch { return false; }
}
function markLikesSyncedThisSession() {
  try { sessionStorage.setItem(LIKES_SYNCED_KEY, '1'); } catch { /* ignore */ }
}

function markGalleryLiked(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const liked = getLikedGalleryIds();
    liked.add(id);
    localStorage.setItem(LIKED_GALLERY_KEY, JSON.stringify(Array.from(liked)));
  } catch {
    // ignore
  }
}

function CameraPhotoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? '#FF5A6E' : 'none'} stroke={filled ? '#FF5A6E' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  );
}

function PackageFallbackIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
      <path d="M16.5 9.4 7.55 4.24a1.8 1.8 0 0 0-1.8 0L2.5 6.1a1.8 1.8 0 0 0-.9 1.56v8.68a1.8 1.8 0 0 0 .9 1.56l3.25 1.86a1.8 1.8 0 0 0 1.8 0l8.95-5.16a1.8 1.8 0 0 0 .9-1.56V9.4z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}

export default function CustomerGallery({ initialReviews }: { initialReviews?: Review[] | null }) {
  const { t, lang } = useT();
  const supabase = useRef(createClient()).current;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  // 💖 প্রোডাক্ট কার্ডের সাথে একদম সেম হার্ট-বার্স্ট এনিমেশন (@/lib/wishHeartBurst) —
  // reviewId ধরে-ধরে আলাদা burst ট্র্যাক করা হয়, যাতে একসাথে একাধিক কার্ড দৃশ্যমান
  // থাকলেও (carousel-এ ±2 অফসেট পর্যন্ত) প্রতিটার এনিমেশন স্বাধীনভাবে চলে।
  const [bursts, setBursts] = useState<Record<string, { id: number; particles: HeartParticle[] }>>({});
  const burstSeedRef = useRef(0);
  const burstTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => () => {
    burstTimersRef.current.forEach((timer) => clearTimeout(timer));
    burstTimersRef.current.clear();
  }, []);

  // 🔍 Interactive Lightbox Zoom & Pan State
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [zoomImageAlt, setZoomImageAlt] = useState<string>('');
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomTranslate, setZoomTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Pinch-to-zoom & pan drag refs
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);
  const lastTapRef = useRef(0);

  const reviewsRef = useRef<Review[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);

  const dragRef = useRef({ startX: 0, startY: 0, isDown: false, dragged: false });

  useEffect(() => { reviewsRef.current = reviews; }, [reviews]);

  useEffect(() => {
    if (zoomImageUrl) {
      lockBody();
    } else {
      unlockBody();
    }
    return () => unlockBody();
  }, [zoomImageUrl]);

  useEffect(() => {
    let cancelled = false;

    const cached = getCachedReviews();
    if (cached && cached.length > 0) {
      const likedIds = getLikedGalleryIds();
      const withLiked = cached.map((r) => ({ ...r, liked: r.liked || likedIds.has(String(r.id)) }));
      setReviews(withLiked);
      setActiveIdx(0);
      setLoaded(true);
      if (!likesAlreadySyncedThisSession()) {
        fetchMyLikedIds(supabase, 'customer_gallery').then((ids) => {
          markLikesSyncedThisSession();
          if (cancelled || !ids.length) return;
          ids.forEach((sid) => markGalleryLiked(sid));
          const all = getLikedGalleryIds();
          setReviews((prev) => prev.map((r) => ({ ...r, liked: r.liked || all.has(String(r.id)) })));
        });
      }
      return;
    }

    // 🆕 সার্ভার (হোম ISR) থেকে আসা ছবির তালিকা — ব্রাউজার থেকে customer_reviews কোয়েরি ছাড়াই দেখানো হয়।
    // (কোয়েরি আর ক্রম হুবহু আগের মতো; ক্যাশ/লাইক মেলানো নিচের মতোই।)
    if (initialReviews && initialReviews.length > 0) {
      const likedIds = getLikedGalleryIds();
      const mapped = initialReviews.map((r) => ({ ...r, liked: likedIds.has(String(r.id)) }));
      setReviews(mapped);
      setCachedReviews(mapped);
      setActiveIdx(0);
      setLoaded(true);
      if (!likesAlreadySyncedThisSession()) {
        fetchMyLikedIds(supabase, 'customer_gallery').then((ids) => {
          markLikesSyncedThisSession();
          if (cancelled || !ids.length) return;
          ids.forEach((sid) => markGalleryLiked(sid));
          const all = getLikedGalleryIds();
          setReviews((prev) => {
            const next = prev.map((r) => ({ ...r, liked: r.liked || all.has(String(r.id)) }));
            setCachedReviews(next);
            return next;
          });
        });
      }
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase
          .from('customer_reviews')
          .select('id,image_url,alt_text,like_count,created_at')
          .order('created_at', { ascending: false })
          .limit(30);

        if (!cancelled && !error && data && data.length > 0) {
          // সার্ভারে এই ডিভাইসের আগের লাইকও মিলিয়ে নেওয়া (লোকাল স্টোরেজ মুছে গেলেও লাভ ফিরে আসবে)
          const serverLiked = await fetchMyLikedIds(supabase, 'customer_gallery');
          markLikesSyncedThisSession();
          serverLiked.forEach((sid) => markGalleryLiked(sid));
          const likedIds = getLikedGalleryIds();
          const mapped = (data as Review[]).map((r) => ({ ...r, liked: likedIds.has(String(r.id)) }));
          setReviews(mapped);
          setCachedReviews(mapped);
          setActiveIdx(0);
        }
      } catch {
        // network fallback
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [supabase, initialReviews]);

  const resetAutoplay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!reviewsRef.current.length || zoomImageUrl) return;
    timerRef.current = setInterval(() => {
      if (pausedRef.current || isModalOpen()) return;
      const totalCount = reviewsRef.current.length;
      if (!totalCount) return;
      setActiveIdx((cur) => (cur + 1) % totalCount);
    }, AUTOPLAY_MS);
  }, [zoomImageUrl]);

  useEffect(() => {
    resetAutoplay();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [reviews.length, resetAutoplay]);

  const goTo = useCallback((idx: number) => {
    if (!reviewsRef.current.length) return;
    setActiveIdx(idx);
    resetAutoplay();
  }, [resetAutoplay]);

  const slide = useCallback((dir: number) => {
    const totalCount = reviewsRef.current.length;
    if (!totalCount) return;
    goTo((activeIdx + dir + totalCount) % totalCount);
  }, [activeIdx, goTo]);

  const handleMouseEnter = () => { pausedRef.current = true; };
  const handleMouseLeave = () => {
    dragRef.current.isDown = false;
    pausedRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    pausedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    dragRef.current.startX = e.touches[0].clientX;
    dragRef.current.startY = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - dragRef.current.startX;
    const dy = e.changedTouches[0].clientY - dragRef.current.startY;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
      slide(dx < 0 ? 1 : -1);
    }
    pausedRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setTimeout(() => {
      resetAutoplay();
    }, RESUME_DELAY_MS);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current.isDown = true;
    dragRef.current.dragged = false;
    dragRef.current.startX = e.clientX;
    pausedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.isDown) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 10) {
      dragRef.current.dragged = true;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragRef.current.isDown && dragRef.current.dragged) {
      const dx = e.clientX - dragRef.current.startX;
      if (Math.abs(dx) > 35) {
        slide(dx < 0 ? 1 : -1);
      }
    }
    dragRef.current.isDown = false;
    pausedRef.current = false;
    resetAutoplay();
  };

  const resetZoom = () => {
    setZoomScale(1);
    setZoomTranslate({ x: 0, y: 0 });
  };

  const closeLightbox = () => {
    setZoomImageUrl(null);
    resetZoom();
    pausedRef.current = false;
    resetAutoplay();
  };

  const handleCardClick = (idx: number, review: Review) => {
    if (dragRef.current.dragged) return;
    if (idx !== activeIdx) {
      goTo(idx);
      return;
    }
    if (!review.image_url) return;
    setZoomImageUrl(review.image_url);
    setZoomImageAlt(review.alt_text?.trim() || FALLBACK_REVIEW_ALT);
    resetZoom();
    pausedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleHeart = (e: React.MouseEvent, review: Review) => {
    e.stopPropagation();
    if (review.liked) return;
    const newCount = (parseInt(String(review.like_count), 10) || 0) + 1;

    markGalleryLiked(String(review.id));

    setReviews((prev) => {
      const updated = prev.map((r) => (
        r.id === review.id ? { ...r, liked: true, like_count: newCount } : r
      ));
      setCachedReviews(updated);
      return updated;
    });

    if (!prefersReducedMotion()) {
      const key = String(review.id);
      const seed = ++burstSeedRef.current;
      const existingTimer = burstTimersRef.current.get(key);
      if (existingTimer) clearTimeout(existingTimer);
      setBursts((prev) => ({ ...prev, [key]: { id: seed, particles: makeHeartBurst(seed) } }));
      const timer = setTimeout(() => {
        setBursts((prev) => {
          if (prev[key]?.id !== seed) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
        burstTimersRef.current.delete(key);
      }, 850);
      burstTimersRef.current.set(key, timer);
    }

    if (review.id) {
      (async () => {
        try {
          const { error } = await supabase.rpc('increment_gallery_like', {
            p_review_id: review.id,
            p_device_id: getDeviceId(),
          });
          if (error) logWarn('Like update failed:', error);
        } catch (err) {
          logWarn('Like update failed:', err);
        }
      })();
    }
  };

  // ══════════════════════════════════════════════════════════════════════
  // 🔍 Interactive Lightbox Touch, Pinch & Drag Handlers
  // ══════════════════════════════════════════════════════════════════════
  const handleLightboxTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialScaleRef.current = zoomScale;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        if (zoomScale > 1) {
          resetZoom();
        } else {
          setZoomScale(2.5);
          setZoomTranslate({ x: 0, y: 0 });
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      if (zoomScale > 1) {
        setIsPanning(true);
        dragStartRef.current = {
          x: e.touches[0].clientX - zoomTranslate.x,
          y: e.touches[0].clientY - zoomTranslate.y,
        };
      }
    }
  };

  const handleLightboxTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = dist / initialPinchDistRef.current;
      const newScale = Math.min(4, Math.max(1, initialScaleRef.current * scaleFactor));
      setZoomScale(newScale);
      if (newScale === 1) {
        setZoomTranslate({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isPanning && zoomScale > 1) {
      e.preventDefault();
      const maxTranslateX = (zoomScale - 1) * (window.innerWidth * 0.45);
      const maxTranslateY = (zoomScale - 1) * (window.innerHeight * 0.45);
      const rawX = e.touches[0].clientX - dragStartRef.current.x;
      const rawY = e.touches[0].clientY - dragStartRef.current.y;

      setZoomTranslate({
        x: Math.max(-maxTranslateX, Math.min(maxTranslateX, rawX)),
        y: Math.max(-maxTranslateY, Math.min(maxTranslateY, rawY)),
      });
    }
  };

  const handleLightboxTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      initialPinchDistRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsPanning(false);
      if (zoomScale < 1.05) {
        resetZoom();
      }
    }
  };

  const handleMouseDownPan = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomScale > 1) {
      setIsPanning(true);
      dragStartRef.current = {
        x: e.clientX - zoomTranslate.x,
        y: e.clientY - zoomTranslate.y,
      };
    }
  };

  const handleMouseMovePan = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && zoomScale > 1) {
      const maxTranslateX = (zoomScale - 1) * (window.innerWidth * 0.45);
      const maxTranslateY = (zoomScale - 1) * (window.innerHeight * 0.45);
      const rawX = e.clientX - dragStartRef.current.x;
      const rawY = e.clientY - dragStartRef.current.y;

      setZoomTranslate({
        x: Math.max(-maxTranslateX, Math.min(maxTranslateX, rawX)),
        y: Math.max(-maxTranslateY, Math.min(maxTranslateY, rawY)),
      });
    }
  };

  const handleMouseUpPan = () => {
    setIsPanning(false);
  };

  const totalReviews = reviews.length;

  const headerBlock = (
    <div className="mb-8 text-center">
      <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-brand-light/40 bg-white/80 px-3.5 py-1 font-body text-[11px] font-bold uppercase tracking-wider text-brand-light shadow-xs backdrop-blur-md">
        <CameraPhotoIcon />
        <span>{lang === 'en' ? 'Customer Reviews' : 'কাস্টমার রিভিউ'}</span>
      </div>
      
      <h2 className="font-body text-2xl font-extrabold text-ink sm:text-[28px]">
        {lang === 'en' ? (
          <>Review <span className="text-brand-light">Gallery</span></>
        ) : (
          <>Review <span className="text-brand-light">গ্যালারি</span></>
        )}
      </h2>
      
      <p className="mt-1.5 font-body text-[13px] text-muted sm:text-[14px]">
        {lang === 'en'
          ? 'Happy moments and authentic review experiences from our customers'
          : 'আমাদের আসল গ্রাহকদের আনন্দময় রিভিউ মুহূর্ত ও অভিজ্ঞতা'}
      </p>
    </div>
  );

  if (loaded && totalReviews === 0) {
    return (
      <section className="mx-auto mb-14 max-w-[1300px] px-4 sm:px-5 overflow-hidden">
        {headerBlock}
        <div className="rounded-[22px] border border-border-base/80 bg-white/70 py-10 text-center font-body text-sm font-semibold text-muted shadow-xs backdrop-blur-sm">
          <p>{t('এখনো কোনো রিভিউ নেই।')}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="mx-auto mb-16 max-w-[1300px] px-4 sm:px-5 overflow-hidden"
      >
        {headerBlock}

        {totalReviews > 0 && (
          <div
            className="relative mx-auto w-full max-w-[960px] select-none overflow-hidden touch-pan-y"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <div className="relative h-[390px] sm:h-[450px] md:h-[490px] w-full flex items-center justify-center overflow-hidden">
              {reviews.map((r, i) => {
                let offset = (i - activeIdx + totalReviews) % totalReviews;
                if (offset > totalReviews / 2) offset -= totalReviews;

                const isActive = offset === 0;
                const isLeft = offset === -1;
                const isRight = offset === 1;
                const isFarLeft = offset === -2;
                const isFarRight = offset === 2;
                const isVisible = Math.abs(offset) <= 2;

                if (!isVisible) return null;

                const imgUrl = r.image_url && (r.image_url.startsWith('http') || r.image_url.startsWith('//'))
                  ? r.image_url : null;
                const likeCount = parseInt(String(r.like_count), 10) || 0;

                let transformStyle = '';
                let zIndex = 0;
                let opacity = 0;
                let pointerEvents: 'auto' | 'none' = 'none';

                if (isActive) {
                  transformStyle = 'translate3d(0, 0, 0) scale(1)';
                  zIndex = 20;
                  opacity = 1;
                  pointerEvents = 'auto';
                } else if (isLeft) {
                  transformStyle = 'translate3d(-102%, 0, 0) scale(0.85)';
                  zIndex = 10;
                  opacity = 0.65;
                  pointerEvents = 'auto';
                } else if (isRight) {
                  transformStyle = 'translate3d(102%, 0, 0) scale(0.85)';
                  zIndex = 10;
                  opacity = 0.65;
                  pointerEvents = 'auto';
                } else if (isFarLeft) {
                  transformStyle = 'translate3d(-180%, 0, 0) scale(0.7)';
                  zIndex = 5;
                  opacity = 0;
                } else if (isFarRight) {
                  transformStyle = 'translate3d(180%, 0, 0) scale(0.7)';
                  zIndex = 5;
                  opacity = 0;
                }

                return (
                  <div
                    key={r.id}
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[360px] w-[220px] min-[400px]:w-[235px] sm:h-[420px] sm:w-[270px] md:h-[460px] md:w-[295px] shrink-0 overflow-hidden rounded-[24px] transition-all duration-[500ms] ease-[cubic-bezier(0.22,1,0.36,1)] [-webkit-tap-highlight-color:transparent] ${
                      isActive
                        ? 'border border-white/90 shadow-sh1 ring-1 ring-white/80 cursor-zoom-in'
                        : 'cursor-pointer hover:opacity-80'
                    }`}
                    style={{
                      transform: `translate(-50%, -50%) ${transformStyle}`,
                      zIndex,
                      opacity,
                      pointerEvents,
                      willChange: 'transform, opacity',
                    }}
                    onClick={() => handleCardClick(i, r)}
                  >
                    <div className="relative h-full w-full overflow-hidden bg-[#0A0E1A]">
                      {imgUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="block h-full w-full object-cover select-none"
                          src={optimizeCloudinaryUrl(imgUrl, 720)}
                          alt={r.alt_text?.trim() || FALLBACK_REVIEW_ALT}
                          loading="lazy"
                          draggable={false}
                          onError={(e) => { e.currentTarget.style.opacity = '.3'; }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#0F172A]">
                          <PackageFallbackIcon />
                        </div>
                      )}

                      <div className="absolute bottom-3.5 right-3.5 z-10 flex items-center gap-1.5">
                        {likeCount > 0 && (
                          <span className="font-body text-[11.5px] font-extrabold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                            {likeCount}
                          </span>
                        )}
                        <div className="relative h-[36px] w-[36px]">
                          <button
                            type="button"
                            className="relative flex h-full w-full items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md shadow-md transition-transform duration-200 before:absolute before:-inset-3 before:content-[''] [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] hover:bg-black/65 active:scale-90"
                            onClick={(e) => handleHeart(e, r)}
                            aria-label={t('লাইক')}
                          >
                            <motion.span
                              key={bursts[String(r.id)] ? `pop-${bursts[String(r.id)].id}` : 'idle'}
                              initial={bursts[String(r.id)] ? { scale: 1 } : false}
                              animate={bursts[String(r.id)] ? { scale: [1, 1.35, 0.92, 1.05, 1] } : { scale: 1 }}
                              transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
                              className="flex h-full w-full items-center justify-center"
                            >
                              <HeartIcon filled={r.liked} />
                            </motion.span>
                          </button>

                          <AnimatePresence>
                            {bursts[String(r.id)] && (
                              <div className="pointer-events-none absolute inset-0">
                                {bursts[String(r.id)].particles.map((pt) => (
                                  <BurstHeart key={pt.id} p={pt} />
                                ))}
                              </div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="absolute left-2 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-ink shadow-sh2 backdrop-blur-sm transition-all duration-brand hover:border-brand-light hover:bg-white active:scale-95 sm:flex cursor-pointer"
              onClick={() => slide(-1)}
              aria-label={t('আগের')}
            >
              <ChevronIcon dir="left" />
            </button>

            <button
              type="button"
              className="absolute right-2 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-ink shadow-sh2 backdrop-blur-sm transition-all duration-brand hover:border-brand-light hover:bg-white active:scale-95 sm:flex cursor-pointer"
              onClick={() => slide(1)}
              aria-label={t('পরের')}
            >
              <ChevronIcon dir="right" />
            </button>
          </div>
        )}

        {totalReviews > 1 && (
          <div className="mt-4 flex justify-center gap-1.5">
            {reviews.map((r, i) => (
              <button
                key={r.id}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === activeIdx ? 'w-6 bg-brand-light' : 'w-1.5 bg-border-base'
                }`}
                onClick={() => goTo(i)}
                aria-label={`${t('রিভিউ')} ${i + 1}`}
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* 🔍 Interactive Pinch-to-Zoom & Pan Fullscreen Lightbox */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-[1300] flex flex-col items-center justify-center bg-black/95 p-2 sm:p-4 backdrop-blur-md animate-section-reveal select-none touch-none"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPanning) {
              closeLightbox();
            }
          }}
        >
          {/* টপ ফ্লোটিং ক্লোজ ও রিসেট বাটন */}
          <div className="absolute right-4 top-4 z-40 flex items-center gap-2">
            {zoomScale > 1 && (
              <button
                type="button"
                onClick={resetZoom}
                className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 font-body text-xs font-bold text-white backdrop-blur-md hover:bg-white/30 active:scale-95 cursor-pointer"
              >
                <span>Reset (1x)</span>
              </button>
            )}
            <motion.button
              type="button"
              onClick={closeLightbox}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 480, damping: 28 }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white hover:text-ink cursor-pointer"
              aria-label={t('বন্ধ করুন')}
            >
              ✕
            </motion.button>
          </div>

          {/* জুম ও প্যান কন্টেইনার */}
          <div
            className="relative flex h-full w-full items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={handleLightboxTouchEnd}
            onMouseDown={handleMouseDownPan}
            onMouseMove={handleMouseMovePan}
            onMouseUp={handleMouseUpPan}
            onMouseLeave={handleMouseUpPan}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={optimizeCloudinaryUrl(zoomImageUrl, 1600)}
              alt={zoomImageAlt || FALLBACK_REVIEW_ALT}
              style={{
                transform: `translate3d(${zoomTranslate.x}px, ${zoomTranslate.y}px, 0) scale(${zoomScale})`,
                transition: isPanning ? 'none' : 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                transformOrigin: 'center center',
              }}
              className="max-h-[85vh] max-w-[92vw] rounded-xl object-contain shadow-2xl pointer-events-none select-none"
              draggable={false}
            />
          </div>

          {/* বটম ফ্লোটিং জুম কন্ট্রোল বার (+, -, Reset) */}
          <div className="absolute bottom-5 z-40 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-4 py-2 backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                setZoomScale((prev) => Math.max(1, prev - 0.5));
                if (zoomScale <= 1.5) setZoomTranslate({ x: 0, y: 0 });
              }}
              disabled={zoomScale <= 1}
              className="flex h-7 w-7 items-center justify-center rounded-full text-lg font-bold text-white hover:bg-white/20 disabled:opacity-30 active:scale-90 cursor-pointer"
              aria-label="Zoom Out"
            >
              −
            </button>
            <span className="min-w-[42px] text-center font-body text-xs font-extrabold text-white">
              {zoomScale.toFixed(1)}x
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((prev) => Math.min(4, prev + 0.5))}
              disabled={zoomScale >= 4}
              className="flex h-7 w-7 items-center justify-center rounded-full text-lg font-bold text-white hover:bg-white/20 disabled:opacity-30 active:scale-90 cursor-pointer"
              aria-label="Zoom In"
            >
              +
            </button>
          </div>
        </div>
      )}
    </>
  );
}
