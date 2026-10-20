'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  productHref,
  startQuickOrder,
  QUICK_CART_EVENT,
} from '@/lib/productData';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { refreshWishlistImages } from '@/lib/freshImages';
import { useCartStore } from '@/lib/store/cartStore';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import { showToast } from '@/lib/toast';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { useT } from '@/lib/i18n/useT';
import useHistoryModal, { suppressHistoryCleanup } from '@/lib/useHistoryModal';
import type { WishlistItem, Product } from '@/types';

function WishImg({ emoji }: { emoji?: string }) {
  const isUrl = typeof emoji === 'string' && (emoji.startsWith('http://') || emoji.startsWith('https://'));
  if (isUrl) {
    return (
      <img
        src={optimizeCloudinaryUrl(emoji, 140)}
        alt=""
        className="h-14 w-14 shrink-0 rounded-2xl border border-white/90 bg-white object-cover object-top shadow-xs"
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/90 bg-white/90 text-2xl shadow-xs">
      {emoji || '📦'}
    </span>
  );
}

function HeartEmptySvgIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
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

function CartPlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
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

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WishlistDrawer({ isOpen, onClose }: WishlistDrawerProps) {
  const { t, lang } = useT();
  const router = useRouter();
  const items = useWishlistStore((s) => s.wishlist);

  useHistoryModal(isOpen, onClose, 'wishlist-drawer');

  // 🖼️ উইশলিস্ট খোলার সময় আইটেমের ছবি সর্বশেষ ছবিতে হালনাগাদ (৫ মিনিট ক্যাশসহ)
  useEffect(() => {
    if (isOpen) refreshWishlistImages();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) lockBody();
    else unlockBody();
    return () => unlockBody();
  }, [isOpen]);

  const openProduct = (item: WishlistItem) => {
    onClose();
    suppressHistoryCleanup();
    router.push(productHref(item));
  };

  const goToProducts = () => {
    onClose();
    document.getElementById('prodSec')?.scrollIntoView({ behavior: 'smooth' });
  };

  const addToCart = (item: WishlistItem) => {
    const prod: Product = {
      id: item.id,
      name: item.name,
      price: item.price,
      old: item.price,
      imgs: [item.emoji || '📦'],
      cat: item.cat || 'general',
      cats: [item.cat || 'general'],
      specs: {},
      warranty: '৭ দিন',
      badge: '',
      stock: 99,
      rating: 5,
      discountColor: '',
      desc: '',
      _detailLoaded: false,
    };
    useCartStore.getState().addToCart([prod], prod.id, 1);
    showToast(t('কার্টে যোগ হয়েছে'));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(QUICK_CART_EVENT, { detail: { id: item.id } }));
    }
  };

  const handleOrderNow = (item: WishlistItem) => {
    onClose();
    const prod: Product = {
      id: item.id,
      name: item.name,
      price: item.price,
      old: item.price,
      imgs: [item.emoji || '📦'],
      cat: item.cat || 'general',
      cats: [item.cat || 'general'],
      specs: {},
      warranty: '৭ দিন',
      badge: '',
      stock: 99,
      rating: 5,
      discountColor: '',
      desc: '',
      _detailLoaded: false,
    };
    startQuickOrder(router, prod, 1);
  };

  const removeItem = (id: number | string) => {
    useWishlistStore.getState().removeItem(id);
    showToast(t('Wishlist থেকে সরানো হয়েছে'));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[965] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 bg-ink/55 backdrop-blur-[3px]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex max-h-[86vh] w-full max-w-[440px] flex-col overflow-hidden rounded-[28px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white shadow-sh3 ring-1 ring-white/80"
          >
            <div className="relative shrink-0 overflow-hidden border-b border-ink/10 px-6 pb-3.5 pt-5 text-left">
              <HeaderDecor />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="font-body text-[17px] font-extrabold text-ink">
                    ❤️ {lang === 'en' ? 'My Wishlist' : 'আপনার Wishlist'}
                  </h3>
                  <p className="mt-0.5 font-body text-[13px] font-semibold text-muted">
                    {lang === 'en'
                      ? `${items.length} favorite ${items.length === 1 ? 'item' : 'items'}`
                      : `${items.length}টি পছন্দের পণ্য`}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/80 text-ink/60 shadow-sh1 backdrop-blur-[8px] transition-colors hover:bg-white hover:text-ink focus-visible:outline-none"
                  aria-label="Close"
                >
                  ✕
                </motion.button>
              </div>
            </div>

            <div className="sleek-scrollbar flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white/80 text-brand-light shadow-sm">
                    <HeartEmptySvgIcon className="h-8 w-8 text-brand-light" />
                  </div>
                  <p className="mb-1 font-body text-[15px] font-bold text-ink">
                    {t('আপনার Wishlist খালি')}
                  </p>
                  <p className="mb-5 max-w-xs font-body text-[13px] text-muted">
                    {t('পছন্দের প্রোডাক্ট হার্ট আইকনে ট্যাপ করে সেভ করুন')}
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={goToProducts}
                    className="rounded-full bg-gradient-to-r from-brand-light to-brand-light-hover px-6 py-2.5 font-body text-xs font-bold text-white shadow-sh2 transition-[filter] hover:brightness-[1.03]"
                  >
                    {t('প্রোডাক্ট দেখুন')} →
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {items.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
                        transition={{ delay: Math.min(idx, 6) * 0.03, duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                        className={`pb-4 ${idx !== items.length - 1 ? 'border-b border-ink/10' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="cursor-pointer shrink-0"
                            onClick={() => openProduct(item)}
                            title={t('প্রোডাক্ট দেখুন')}
                          >
                            <WishImg emoji={item.emoji} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div
                              className="line-clamp-2 cursor-pointer font-body text-[13.5px] font-bold leading-snug text-ink transition-colors hover:text-brand-light"
                              onClick={() => openProduct(item)}
                              title={t('প্রোডাক্ট দেখুন')}
                            >
                              {item.name}
                            </div>
                            <div className="mt-1 font-body text-[13px] font-extrabold text-brand-light">
                              ৳{Number(item.price).toLocaleString('en-US')}
                            </div>
                          </div>

                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.85 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                            onClick={() => removeItem(item.id)}
                            title={t('Wishlist থেকে সরান')}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-transparent text-muted/35 transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <TrashIcon />
                          </motion.button>
                        </div>

                        <div className="mt-3 flex items-center gap-2.5">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                            onClick={() => addToCart(item)}
                            className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-full border border-brand-light/40 bg-white/80 font-body text-xs font-bold text-brand-light shadow-xs transition-colors hover:bg-brand-light hover:text-white hover:border-brand-light"
                          >
                            <CartPlusIcon />
                            <span>{lang === 'en' ? 'Add to Cart' : 'কার্টে যোগ'}</span>
                          </motion.button>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                            onClick={() => handleOrderNow(item)}
                            // 🛡️ পারফরম্যান্স ফিক্স: `shimmer-sheen` ক্লাস (6s infinite animation)
                            // ইচ্ছাকৃতভাবে বাদ দেওয়া হলো — wishlist-এ একাধিক আইটেম থাকলে প্রতিটা
                            // বাটনে আলাদা infinite GPU animation একসাথে চলায় লো-এন্ড ডিভাইসে
                            // মেমোরি/GPU-তে বাড়তি চাপ পড়ছিল। অন্য কোথাও shimmer-sheen অক্ষত আছে।
                            className="flex-1 h-9 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-info to-brand-light font-body text-xs font-bold text-white shadow-sh2 transition-[filter] hover:brightness-[1.03]"
                          >
                            <span>{lang === 'en' ? 'Order Now' : 'অর্ডার করুন'}</span>
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
