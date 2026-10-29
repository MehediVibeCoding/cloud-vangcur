'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getStockNotifications, removeStockNotification } from '@/lib/accountData';
import { getDraft } from '@/lib/draftRecovery';
import { useCartStore } from '@/lib/store/cartStore';
import { OPEN_CART_EVENT } from '@/lib/uiEvents';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { showToast } from '@/lib/toast';
import { hasExceededLocalOrderLimit } from '@/lib/productData';
import useHistoryModal from '@/lib/useHistoryModal';
import { useT } from '@/lib/i18n/useT';
import type { Product } from '@/types';
import { getTimeoutSignal, optionalSignal } from '@/lib/abortSignal';

interface InStockItem extends Product {
  key: string;
}

const HOMEPAGE_INITIAL_DELAY_MS = 5000;
const DISMISS_GAP_DELAY_MS = 10000;
const RECOVERY_DISMISS_KEY = 'vc_recovery_dismissed';
const RECOVERY_DISMISS_TIME_KEY = 'vc_toast_dismiss_time';
const MAX_DRAFT_AGE_MS = 3 * 24 * 60 * 60 * 1000;

function HeaderDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.14]" aria-hidden="true">
      <svg width="34" height="34" className="absolute -left-1 top-2 -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <svg width="26" height="26" className="absolute right-12 top-3 rotate-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2.5" width="10" height="15" rx="3" />
        <path d="M10 5.5h4" />
        <circle cx="12" cy="20" r="1.6" />
      </svg>
    </div>
  );
}

function ItemThumbnail({ imgVal }: { imgVal?: string }) {
  const isUrl = typeof imgVal === 'string' && (imgVal.startsWith('http://') || imgVal.startsWith('https://'));
  if (isUrl) {
    return (
      <img
        src={optimizeCloudinaryUrl(imgVal, 140)}
        alt="Product"
        className="h-12 w-12 shrink-0 rounded-xl border border-white/90 bg-white object-cover object-top shadow-xs"
        loading="lazy"
        decoding="async"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/90 bg-brand-bg/50 text-brand-light shadow-xs">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 9.4 7.55 4.24a1.8 1.8 0 0 0-1.8 0L2.5 6.1a1.8 1.8 0 0 0-.9 1.56v8.68a1.8 1.8 0 0 0 .9 1.56l3.25 1.86a1.8 1.8 0 0 0 1.8 0l8.95-5.16a1.8 1.8 0 0 0 .9-1.56V9.4z" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
      </svg>
    </div>
  );
}

function CartPlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function hasActiveRecoveryDraft(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(RECOVERY_DISMISS_KEY) === '1') return false;
    const d = getDraft();
    return !!(d && d.items && d.items.length > 0 && Date.now() - d.createdAt < MAX_DRAFT_AGE_MS);
  } catch {
    return false;
  }
}

export default function BackInStockToast() {
  const { t, lang } = useT();
  const pathname = usePathname();
  const [inStockItems, setInStockItems] = useState<InStockItem[]>([]);

  const handleDismissAll = useCallback(() => {
    inStockItems.forEach((item) => removeStockNotification(item.key));
    setInStockItems([]);
  }, [inStockItems]);

  useHistoryModal(inStockItems.length > 0, handleDismissAll, 'back-in-stock-toast');

  useEffect(() => {
    if (pathname !== '/') {
      setInStockItems([]);
      return;
    }

    if (hasExceededLocalOrderLimit()) {
      setInStockItems([]);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const scheduleStockToast = (delayMs: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        if (cancelled || hasExceededLocalOrderLimit()) return;
        const notifs = getStockNotifications();
        if (notifs.length === 0) return;

        const targetIds = notifs.map((n) => n.prodId).filter(Boolean);
        if (targetIds.length === 0) return;

        const supabase = createClient();
        try {
          const signal = getTimeoutSignal(5000);
          const { data, error } = await supabase
            .from('custom_products')
            .select('id, name, price, old, stock, imgs, cat')
            .in('id', targetIds)
            .abortSignal(optionalSignal(signal));

          if (error || !data || data.length === 0 || cancelled) return;

          const available: InStockItem[] = [];
          notifs.forEach((n) => {
            const prod = data.find((p) => String(p.id) === String(n.prodId));
            if (prod && Number(prod.stock) > 0) {
              let imgsArr: string[] = [];
              if (typeof prod.imgs === 'string') {
                try { imgsArr = JSON.parse(prod.imgs); } catch { imgsArr = [prod.imgs]; }
              } else if (Array.isArray(prod.imgs)) {
                imgsArr = prod.imgs;
              }

              available.push({
                id: prod.id,
                name: prod.name,
                price: Number(prod.price) || 0,
                old: Number(prod.old) || Number(prod.price) || 0,
                stock: Number(prod.stock) || 0,
                imgs: imgsArr.length ? imgsArr : ['📦'],
                cat: prod.cat || 'general',
                cats: [prod.cat || 'general'],
                specs: {},
                warranty: '৭ দিন',
                badge: '',
                rating: 5,
                discountColor: '',
                desc: '',
                _detailLoaded: false,
                key: n.key,
              });
            }
          });

          if (available.length > 0 && !cancelled && !hasExceededLocalOrderLimit()) {
            setInStockItems(available);
          }
        } catch {
          // ignore
        }
      }, delayMs);
    };

    if (hasActiveRecoveryDraft()) {
      const onRecoveryDismissed = (e: Event) => {
        const d = (e as CustomEvent<{ type?: string }>).detail;
        if (d?.type === 'recovery') {
          scheduleStockToast(DISMISS_GAP_DELAY_MS);
        }
      };
      window.addEventListener('vc:toastDismissed', onRecoveryDismissed);
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
        window.removeEventListener('vc:toastDismissed', onRecoveryDismissed);
      };
    } else {
      let calculatedDelay = HOMEPAGE_INITIAL_DELAY_MS;
      try {
        const dismissTime = Number(sessionStorage.getItem(RECOVERY_DISMISS_TIME_KEY)) || 0;
        if (dismissTime > 0) {
          const timeSinceDismiss = Date.now() - dismissTime;
          if (timeSinceDismiss < DISMISS_GAP_DELAY_MS) {
            calculatedDelay = DISMISS_GAP_DELAY_MS - timeSinceDismiss;
          }
        }
      } catch {
        // ignore
      }
      scheduleStockToast(calculatedDelay);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pathname]);

  if (inStockItems.length === 0) return null;

  const handleAddSingleToCart = (item: InStockItem) => {
    useCartStore.getState().addToCart([item], item.id, 1);
    removeStockNotification(item.key);
    showToast(t('কার্টে যোগ হয়েছে'));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT));
    }

    const remaining = inStockItems.filter((i) => i.id !== item.id);
    setInStockItems(remaining);
  };

  const handleAddAllToCart = () => {
    inStockItems.forEach((item) => {
      useCartStore.getState().addToCart([item], item.id, 1);
      removeStockNotification(item.key);
    });

    showToast(lang === 'en' ? 'All items added to cart!' : 'সকল পণ্য কার্টে যুক্ত করা হয়েছে!');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT));
    }

    setInStockItems([]);
  };

  const isMultiple = inStockItems.length > 1;

  return (
    <div className="fixed inset-x-3 bottom-4 z-[950] sm:bottom-5 sm:left-auto sm:right-5 sm:w-[390px] animate-section-reveal">
      <div className="relative overflow-hidden rounded-[24px] border border-white/80 bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white p-5 shadow-sh3 ring-1 ring-white/70 backdrop-blur-md">
        
        <HeaderDecor />

        <motion.button
          type="button"
          onClick={handleDismissAll}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 480, damping: 28 }}
          className="absolute right-3.5 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/80 text-ink/60 shadow-xs backdrop-blur-[8px] transition-colors duration-brand hover:bg-white hover:text-ink focus-visible:outline-none"
          aria-label={t('বন্ধ করুন')}
          title={t('বন্ধ করুন')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </motion.button>

        <div className="relative z-10 pr-7">
          <h3 className="font-body text-[15px] font-extrabold text-ink leading-tight">
            {isMultiple
              ? (lang === 'en' ? 'Products Back in Stock!' : 'পণ্যগুলো আবার স্টকে এসেছে!')
              : (lang === 'en' ? 'Product Back in Stock!' : 'প্রোডাক্ট আবার স্টকে এসেছে!')}
          </h3>
          <p className="mt-0.5 font-body text-[12.5px] text-muted">
            {isMultiple
              ? (lang === 'en' ? 'Items you requested are now ready to order.' : 'আপনার অনুরোধ করা পণ্যগুলো এখন অর্ডারের জন্য প্রস্তুত।')
              : (lang === 'en' ? 'The item you requested is now available.' : 'আপনার অনুরোধ করা প্রোডাক্টটি এখন স্টকে পাওয়া যাচ্ছে।')}
          </p>
        </div>

        {!isMultiple && (
          <>
            <div className="relative z-10 my-3 rounded-[16px] border border-white/90 bg-white/80 p-2.5 shadow-xs backdrop-blur-md">
              <div className="flex items-center gap-3">
                <ItemThumbnail imgVal={(inStockItems[0].imgs || [''])[0]} />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 font-body text-[13px] font-bold text-ink">
                    {inStockItems[0].name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-body text-[14px] font-extrabold text-brand-light">
                      ৳{inStockItems[0].price.toLocaleString('en-US')}
                    </span>
                    {inStockItems[0].old > inStockItems[0].price && (
                      <span className="font-body text-[11px] text-muted line-through">
                        ৳{inStockItems[0].old.toLocaleString('en-US')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mb-3.5 flex items-center gap-2 rounded-[12px] border border-emerald-300/80 bg-emerald-50/90 px-3 py-1.5 shadow-xs">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-body text-[11.5px] font-bold text-emerald-800">
                {lang === 'en' ? 'In Stock — Limited Units' : 'স্টকে আছে — দ্রুত অর্ডার করুন'}
              </span>
            </div>

            <button
              onClick={() => handleAddSingleToCart(inStockItems[0])}
              className="relative z-10 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-info to-brand-light py-[11.5px] font-body text-[13.5px] font-bold text-white shadow-sh2 transition-all duration-brand hover:brightness-[1.03] active:scale-95"
            >
              <CartPlusIcon />
              <span>{lang === 'en' ? 'Add to Cart & Apply Coupon' : 'কার্টে যোগ ও কুপন দেখুন'}</span>
            </button>
          </>
        )}

        {isMultiple && (
          <>
            <div className="sleek-scrollbar relative z-10 my-3 max-h-[190px] overflow-y-auto space-y-2 pr-0.5">
              {inStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 rounded-[14px] border border-white/90 bg-white/80 p-2 shadow-xs backdrop-blur-md"
                >
                  <ItemThumbnail imgVal={(item.imgs || [''])[0]} />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 font-body text-[13px] font-bold text-ink">
                      {item.name}
                    </div>
                    <div className="font-body text-[12px] font-extrabold text-brand-light">
                      ৳{item.price.toLocaleString('en-US')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddSingleToCart(item)}
                    className="shrink-0 rounded-full border border-brand-light/40 bg-white px-2.5 py-1 font-body text-[11px] font-bold text-brand-light shadow-xs transition-colors hover:bg-brand-light hover:text-white active:scale-95"
                  >
                    {lang === 'en' ? 'Add' : 'যোগ'}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddAllToCart}
              className="relative z-10 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-info to-brand-light py-[11.5px] font-body text-[13.5px] font-bold text-white shadow-sh2 transition-all duration-brand hover:brightness-[1.03] active:scale-95"
            >
              <CartPlusIcon />
              <span>{lang === 'en' ? 'Add All to Cart & Checkout' : 'সবগুলো কার্টে যোগ ও অর্ডার করুন'}</span>
            </button>
          </>
        )}

      </div>
    </div>
  );
}
