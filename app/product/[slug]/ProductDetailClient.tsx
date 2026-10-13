'use client';

import { MAX_QTY_PER_PRODUCT } from '@/lib/cartLimits';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';
import {
  fetchCustomProducts, mergeCustomProducts, fetchProductsByIds, fetchColorSiblings,
  findProdBySlug, productHref,
  startQuickOrder, QUICK_CART_EVENT, STOCK_NOTIFY_EVENT,
} from '@/lib/productData';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { fetchProductDetail } from '@/lib/productDetailData';
import { trackViewItem, trackAddToCart } from '@/lib/analytics';
import { renderLinkedText } from '@/lib/linkedText';
import {
  DEFAULT_MSG_LINK, computeMsgLink, fetchContactSettings, subscribeContactSettings,
} from '@/lib/floatButtonsData';
import { showToast } from '@/lib/toast';
import { useCartStore, cartCount } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';
import { OPEN_CART_EVENT, OPEN_WISHLIST_EVENT, OPEN_TRACK_ORDER_EVENT, WISHLIST_NAV_HIT_EVENT } from '@/lib/uiEvents';
import { prefersReducedMotion, makeHeartBurst, BurstHeart, type HeartParticle } from '@/lib/wishHeartBurst';
import Navbar from '@/app/components/layout/Navbar';
import ProductCard from '@/app/components/home/ProductCard';
import WarrantyModal from '@/app/components/modals/WarrantyModal';
import { hasWarranty, formatWarrantyLabel } from '@/lib/warrantyData';
import useCloseWhenOffscreen from '@/lib/useCloseWhenOffscreen';
import LoginModal from '@/app/components/auth/LoginModal';
import ProductQnA from '@/app/components/product/ProductQnA';
import ProductReviews from '@/app/components/product/ProductReviews';
import { useT } from '@/lib/i18n/useT';
import type { Product, ProductSpecs } from '@/types';

function VangcurPandaIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="36" height="45" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.5 30 Q5.5 34.5 7.2 40.5" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="7.2" cy="41" r="3.3" fill="#1E293B" />
      <ellipse cx="20" cy="35.5" rx="10.5" ry="10" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
      <ellipse cx="14" cy="44.5" rx="4.2" ry="3" fill="#1E293B" />
      <ellipse cx="26" cy="44.5" rx="4.2" ry="3" fill="#1E293B" />
      <circle cx="9.5" cy="5.5" r="4.6" fill="#1E293B" />
      <circle cx="30.5" cy="5.5" r="4.6" fill="#1E293B" />
      <circle cx="9.5" cy="5.5" r="2.1" fill="#475569" opacity="0.6" />
      <circle cx="30.5" cy="5.5" r="2.1" fill="#475569" opacity="0.6" />
      <ellipse cx="20" cy="15" rx="12" ry="10.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
      <ellipse cx="13.5" cy="14.5" rx="4.1" ry="5" transform="rotate(-15 13.5 14.5)" fill="#1E293B" />
      <ellipse cx="26.5" cy="14.5" rx="4.1" ry="5" transform="rotate(15 26.5 14.5)" fill="#1E293B" />
      <circle cx="14" cy="14" r="1.7" fill="#FFFFFF" />
      <circle cx="26" cy="14" r="1.7" fill="#FFFFFF" />
      <circle cx="14.5" cy="13.6" r="0.6" fill="#38BDF8" />
      <circle cx="25.5" cy="13.6" r="0.6" fill="#38BDF8" />
      <ellipse cx="9" cy="19" rx="2.3" ry="1.4" fill="#FDA4AF" opacity="0.9" />
      <ellipse cx="31" cy="19" rx="2.3" ry="1.4" fill="#FDA4AF" opacity="0.9" />
      <ellipse cx="20" cy="17.8" rx="2" ry="1.3" fill="#1E293B" />
      <path d="M17.5 19.8 Q20 21.6 22.5 19.8" stroke="#1E293B" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <path d="M29.5 30 Q36.5 25.5 34 15.5" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="34" cy="15" r="3.4" fill="#1E293B" />
    </svg>
  );
}

function SolidDocIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
    </svg>
  );
}

function SolidSparkIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  );
}

function SolidWrenchIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
    </svg>
  );
}

function SolidQuestionBookIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 8h6v2H9V8zm0 3h6v2H9v-2zm0 3h4v2H9v-2z" />
    </svg>
  );
}

function ShieldIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function HeartIcon({ className = '', filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function BoltIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M13 2 3 14h7l-1 8 11-14h-7l0-6Z" />
    </svg>
  );
}

function CartIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function BellIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ChevronIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CheckBadgeIcon({ className = '' }: { className?: string }) {
  return (
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success ${className}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

function PlugIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2v6M15 2v6" />
      <path d="M6 8h12v4a6 6 0 0 1-12 0V8z" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

function BoxIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}

function ArrowIcon({ className = '', dir = 'left' }: { className?: string; dir?: 'left' | 'right' }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-white shadow-xs">
        {icon}
      </div>
      <div className="font-body text-lg font-bold text-ink">{children}</div>
    </div>
  );
}

function parseJsonish<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val as T;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

function getQuickSpecPills(quickSpecsText: string | undefined, specs?: ProductSpecs & { _quick_keys?: string[] }): string[] {
  if (quickSpecsText && quickSpecsText.trim()) {
    return quickSpecsText.split('•').map((s) => s.trim()).filter(Boolean);
  }
  const s = specs || {};
  const quickKeys = s._quick_keys;
  if (Array.isArray(quickKeys) && quickKeys.length) {
    return quickKeys.filter((k) => s[k] !== undefined).slice(0, 6).map((k) => `${k}: ${s[k]}`);
  }
  return [];
}

const SPEC_PILL_GAP = 8;

function useSpecPillRows(pills: string[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<string[][] | null>(null);

  const pillsKey = pills.join('\u0001');

  useLayoutEffect(() => {
    if (!pills.length) { setRows([]); return; }
    const recompute = () => {
      const containerEl = containerRef.current;
      const measureEl = measureRef.current;
      if (!containerEl || !measureEl) return;
      const containerWidth = containerEl.clientWidth;
      if (!containerWidth) return;
      const items = Array.from(measureEl.children) as HTMLElement[];
      const widths = pills.map((_, i) => Math.ceil(items[i]?.getBoundingClientRect().width || 0));
      const order = pills.map((_, i) => i).sort((a, b) => widths[b] - widths[a]);
      const binRows: { idx: number[]; used: number }[] = [];
      for (const idx of order) {
        const w = widths[idx];
        let placed = false;
        for (const row of binRows) {
          const needed = row.used + SPEC_PILL_GAP + w;
          if (needed <= containerWidth) {
            row.idx.push(idx);
            row.used = needed;
            placed = true;
            break;
          }
        }
        if (!placed) binRows.push({ idx: [idx], used: w });
      }
      setRows(binRows.map((r) => r.idx.map((i) => pills[i])));
    };
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, [pillsKey]);

  return { containerRef, measureRef, rows };
}

function getTechSpecRows(specs?: ProductSpecs & { _quick_keys?: string[] }): [string, string][] {
  const s = specs || {};
  const quickKeys = s._quick_keys;
  const quickKeySet = Array.isArray(quickKeys) ? new Set(quickKeys) : new Set<string>();
  const EXCLUDE_FROM_TABLE = new Set(['Packaging Content', 'packaging_content']);
  return Object.entries(s).filter(
    ([k]) => !k.startsWith('_') && !quickKeySet.has(k) && !EXCLUDE_FROM_TABLE.has(k),
  ) as [string, string][];
}

function getPackagingContent(packagingContent: string | undefined, specs?: ProductSpecs): string {
  if (packagingContent && packagingContent.trim()) return packagingContent;
  const s = specs || {};
  return s['Packaging Content'] || s['packaging_content'] || '';
}

function FeatureItem({ text }: { text: string }) {
  const boldMatch = text.match(/^(.*?)\*\*(.*?)\*\*(.*)$/);
  if (boldMatch) {
    const [, pre, title, rest] = boldMatch;
    return (
      <div className="flex items-start gap-3 rounded-[10px] px-2.5 py-2.5 transition-brand duration-brand hover:bg-brand-bg/60">
        <div className="mt-0.5 shrink-0 text-base leading-none">{pre.trim() || <CheckBadgeIcon />}</div>
        <div className="font-body text-[15px] leading-[1.75] text-ink"><strong>{title}</strong>{renderLinkedText(rest)}</div>
      </div>
    );
  }
  const emojiMatch = text.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*(.*)/u);
  if (emojiMatch) {
    return (
      <div className="flex items-start gap-3 rounded-[10px] px-2.5 py-2.5 transition-brand duration-brand hover:bg-brand-bg/60">
        <div className="mt-0.5 shrink-0 text-base leading-none">{emojiMatch[1]}</div>
        <div className="font-body text-[15px] leading-[1.75] text-ink">{renderLinkedText(emojiMatch[2])}</div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-[10px] px-2.5 py-2.5 transition-brand duration-brand hover:bg-brand-bg/60">
      <div className="mt-0.5 shrink-0"><CheckBadgeIcon /></div>
      <div className="font-body text-[15px] leading-[1.75] text-ink">{text}</div>
    </div>
  );
}

function GalleryImg({ val, name, isThumb }: { val?: string; name: string; isThumb: boolean }) {
  const [broken, setBroken] = useState(false);
  const isUrl = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));
  if (isUrl && !broken) {
    return (
      <img
        src={optimizeCloudinaryUrl(val, isThumb ? 200 : 900)}
        alt={name || ''}
        loading="lazy"
        className={isThumb ? 'h-full w-full rounded-[8px] object-cover object-top' : 'block h-full w-full object-cover object-top select-none'}
        onError={() => setBroken(true)}
      />
    );
  }
  return <span className={isThumb ? 'text-2xl' : 'text-[90px]'}>{val || '📦'}</span>;
}

// 🏷️ পিউর মিনিমাল টেক্সট ট্যাবলেট (কোনো কাঁচা ইমোজি বা আইকন ছাড়া)
const TABS = [
  { id: 'ppSecDesc', label: 'বিবরণ' },
  { id: 'ppSecFeatures', label: 'ফিচারস' },
  { id: 'ppSecSpecs', label: 'স্পেসিফিকেশন' },
  { id: 'ppSecExtra', label: 'অতিরিক্ত তথ্য' },
  { id: 'ppSecFaq', label: 'প্রশ্নোত্তর' },
  { id: 'ppSecReviews', label: 'রিভিউ' },
];

function SpecCalloutBox({
  icon,
  title,
  children,
  tone,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  tone: 'amber' | 'blue';
}) {
  const isAmber = tone === 'amber';
  return (
    <div
      className={`mt-5 rounded-[18px] border p-4 sm:p-5 shadow-xs transition-all duration-brand ${
        isAmber
          ? 'border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 text-amber-950'
          : 'border-brand-light/35 bg-gradient-to-br from-[#F0F7FF] via-white to-[#EFF6FE]/75 text-ink'
      }`}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-2xs ${
            isAmber
              ? 'border border-amber-300/90 bg-amber-100 text-amber-700'
              : 'border border-brand-light/40 bg-brand-bg/50 text-brand-light'
          }`}
        >
          {icon}
        </span>
        <span
          className={`font-body text-[14.5px] font-extrabold ${
            isAmber ? 'text-amber-950' : 'text-ink'
          }`}
        >
          {title}
        </span>
      </div>
      <div className="font-body text-[14.5px] leading-[1.85] text-ink/85 space-y-1">
        {children}
      </div>
    </div>
  );
}

interface ProductDetailClientProps {
  slug: string;
  initialId: string | null;
  initialProduct: Product | null;
  initialProducts?: Product[];
}

export default function ProductDetailClient({
  slug,
  initialId,
  initialProduct,
  initialProducts,
}: ProductDetailClientProps) {
  const { t, lang } = useT();
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const [prods, setProds] = useState<Product[]>(
    initialProducts && initialProducts.length
      ? initialProducts
      : initialProduct
      ? [initialProduct]
      : []
  );
  const [prodsLoaded, setProdsLoaded] = useState(
    !!initialProduct || (initialProducts && initialProducts.length > 0)
  );

  useEffect(() => {
    router.prefetch('/checkout');
    router.prefetch('/');
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    if (!initialProducts || initialProducts.length === 0) {
      fetchCustomProducts(supabase).then((customRows) => {
        if (cancelled) return;
        if (customRows.length) setProds((prev) => mergeCustomProducts(prev, customRows));
        setProdsLoaded(true);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [supabase, initialProducts]);

  // 🔒 স্মার্ট মার্জ পোলিং: প্রতি ৩০ সেকেন্ডে দাম/স্টক রিকোয়েস্ট হলেও বিবরণ/ফিচারস কখনো মুছবে না
  const prodsRef = useRef(prods);
  useEffect(() => { prodsRef.current = prods; }, [prods]);

  useEffect(() => {
    let cancelled = false;
    // 🛡️ ট্রাফিক-অডিট ফিক্স: আগে ৩০ সেকেন্ড ছিল — অনেক ভিজিটর একই প্রোডাক্ট পেজে থাকলে
    // প্রতি মিনিটে হাজার হাজার ডাটাবেজ রিকোয়েস্ট তৈরি হতো। মনে রাখার জিনিস: দাম/স্টকের
    // আসল সত্য সবসময় চেকআউট জমা দেওয়ার মুহূর্তে সার্ভার-সাইডে (checkout.ts-এর
    // decrement_product_stock RPC) আলাদাভাবে যাচাই হয় — তাই এই পোলিং কখনোই
    // নিরাপত্তা/সঠিকতার জন্য জরুরি না, শুধু পেজের UI তাজা রাখার জন্য। ইন্টারভাল
    // অনেক বাড়ানো তাই সম্পূর্ণ নিরাপদ। ৩০ সে. → ৩ মিনিট (রিকোয়েস্ট ৬ গুণ কম)।
    // (ব্যাকগ্রাউন্ড ট্যাবে এমনিতেই স্কিপ হয় — document.hidden চেক নিচেই আছে, অপরিবর্তিত।
    // দীর্ঘমেয়াদে আরও ভালো সমাধান: পোলিং পুরোপুরি বাদ দিয়ে Supabase Realtime
    // broadcast channel দিয়ে শুধু স্টক/দাম বদলালেই push পাওয়া — এটা আলাদা, বড় কাজ।)
    const POLL_MS = 180000;

    const tick = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const ids = prodsRef.current.map((p) => p.id);
      if (!ids.length) return;
      const fresh = await fetchProductsByIds(supabase, ids);
      if (cancelled) return;
      const freshById = new Map(fresh.map((p) => [String(p.id), p]));

      // 🎨 পুরনো ক্যাশ করা পেজে কালার-সিবলিং না থাকলে (পরে লিংক করা হয়েছে) তাদের এনে যোগ করা
      const currentId = initialProduct ? String(initialProduct.id) : '';
      const currentGroup = currentId ? freshById.get(currentId)?.colorGroupId : null;
      if (currentGroup) {
        const have = new Set(prodsRef.current.map((p) => String(p.id)));
        const siblings = await fetchColorSiblings(supabase, currentGroup);
        if (cancelled) return;
        const missing = siblings.filter((s) => !have.has(String(s.id)));
        if (missing.length) {
          setProds((prev) => mergeCustomProducts(prev, missing));
          missing.forEach((s) => freshById.set(String(s.id), s));
        }
      }

      setProds((prev) => prev
        .filter((p) => freshById.has(String(p.id)))
        .map((p) => {
          const freshItem = freshById.get(String(p.id))!;
          return {
            ...p,
            price: freshItem.price,
            old: freshItem.old,
            stock: freshItem.stock,
            badge: freshItem.badge,
            // 🎨 কালার-গ্রুপের তথ্যও রিফ্রেশ — পেজ পুরনো ক্যাশ থেকে এলেও কয়েক সেকেন্ডে ঠিক হয়ে যায়
            colorGroupId: freshItem.colorGroupId,
            colorName: freshItem.colorName,
            colorSwatch: freshItem.colorSwatch,
            imgs: freshItem.imgs && freshItem.imgs.length ? freshItem.imgs : p.imgs,
            // 🛡️ স্মার্ট মার্জ: যদি নতুন অবজেক্টে বিস্তারিত বিবরণ থাকে তবেই আপডেট হবে, অন্যথায় বিদ্যমান সমৃদ্ধ বিবরণ বজায় থাকবে
            ...(freshItem._detailLoaded ? {
              longDesc: freshItem.longDesc || p.longDesc,
              desc: freshItem.desc || p.desc,
              features: freshItem.features && freshItem.features.length ? freshItem.features : p.features,
              faqs: freshItem.faqs && freshItem.faqs.length ? freshItem.faqs : p.faqs,
              specs: freshItem.specs && Object.keys(freshItem.specs).length ? freshItem.specs : p.specs,
              infoBoxes: freshItem.infoBoxes && freshItem.infoBoxes.length ? freshItem.infoBoxes : p.infoBoxes,
              powerInfo: freshItem.powerInfo || p.powerInfo,
              packagingContent: freshItem.packagingContent || p.packagingContent,
              _detailLoaded: true,
            } : {}),
          };
        }));
    };

    const timer = setInterval(tick, POLL_MS);
    // পেজ খোলার কিছুক্ষণ পর একবার — ক্যাশ করা পুরনো পেজের কালার/স্টক ঠিক করতে
    const firstTick = setTimeout(tick, 3000);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(firstTick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [supabase]);

  const baseProd = useMemo(
    () => findProdBySlug(prods, slug) || (initialId ? prods.find((x) => String(x.id) === String(initialId)) : null),
    [prods, slug, initialId],
  );

  const [detail, setDetail] = useState<Partial<Product> | null>(null);
  useEffect(() => {
    if (!baseProd) return;
    if (baseProd._detailLoaded) { setDetail(null); return; }
    let cancelled = false;
    fetchProductDetail(supabase, baseProd.id).then((d) => { if (!cancelled) setDetail(d); });
    return () => { cancelled = true; };
  }, [baseProd?.id, supabase]);

  const prod = useMemo(() => {
    if (!baseProd) return null;
    return {
      ...baseProd,
      ...(detail || {}),
      longDesc: detail?.longDesc || baseProd.longDesc || baseProd.desc || '',
      features: (detail?.features && detail.features.length) ? detail.features : baseProd.features || [],
      faqs: (detail?.faqs && detail.faqs.length) ? detail.faqs : baseProd.faqs || [],
      specs: (detail?.specs && Object.keys(detail.specs).length) ? detail.specs : baseProd.specs || {},
      infoBoxes: (detail?.infoBoxes && detail.infoBoxes.length) ? detail.infoBoxes : baseProd.infoBoxes || [],
      powerInfo: detail?.powerInfo || baseProd.powerInfo || '',
      packagingContent: detail?.packagingContent || baseProd.packagingContent || '',
    };
  }, [baseProd, detail]);

  const quickSpecPills = useMemo(
    () => (prod ? getQuickSpecPills(prod.quickSpecsText, prod.specs) : []),
    [prod],
  );
  const { containerRef: specPillsRef, measureRef: specPillsMeasureRef, rows: specPillRows } = useSpecPillRows(quickSpecPills);

  const [qty, setQty] = useState(1);
  const [curImgIdx, setCurImgIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [transformOrigin, setTransformOrigin] = useState('center center');
  const [activeTab, setActiveTab] = useState('ppSecDesc');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);
  const faqItemRefs = useRef<(HTMLElement | null)[]>([]);
  useCloseWhenOffscreen(openFaqIdx, faqItemRefs, () => setOpenFaqIdx(null));
  const [warrantyOpen, setWarrantyOpen] = useState(false);
  const [stickyShown, setStickyShown] = useState(false);

  const [cartButtonState, setCartButtonState] = useState<'idle' | 'animating' | 'added'>('idle');
  const [isStockNotified, setIsStockNotified] = useState(false);

  const [msgLink, setMsgLink] = useState<string | null>(DEFAULT_MSG_LINK);

  const cartQty = useCartStore((s) => cartCount(s.cart));
  const wishQty = useWishlistStore((s) => s.wishlist.length);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (!prod?.id) return;
    try {
      const isSaved = !!localStorage.getItem(`vc_sn_${prod.id}`);
      setIsStockNotified(isSaved);
    } catch {
      setIsStockNotified(false);
    }

    const onSubscribed = (e: Event) => {
      const d = (e as CustomEvent<{ id: string | number }>).detail;
      if (d && String(d.id) === String(prod.id)) {
        setIsStockNotified(true);
      }
    };
    window.addEventListener('vc:stockSubscribed', onSubscribed);
    return () => window.removeEventListener('vc:stockSubscribed', onSubscribed);
  }, [prod?.id]);

  const touchRef = useRef({ x: 0, y: 0 });
  const tabsWrapRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [wishBurst, setWishBurst] = useState<{ id: number; particles: HeartParticle[] } | null>(null);
  const wishBurstSeedRef = useRef(0);
  const wishBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (wishBurstTimerRef.current) clearTimeout(wishBurstTimerRef.current);
  }, []);

  const wished = useWishlistStore((s) => (prod ? s.wishlist.some((x) => String(x.id) === String(prod.id)) : false));

  useEffect(() => {
    if (!prod) return;
    setQty(1);
    setCurImgIdx(0);
    setZoomed(false);
    setActiveTab('ppSecDesc');
    setOpenFaqIdx(null);
    setCartButtonState('idle');

    trackViewItem({
      item_id: prod.id,
      item_name: prod.name,
      price: prod.price,
      item_category: prod.cat,
    });
  }, [prod?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const contact = await fetchContactSettings(supabase);
      if (cancelled) return;
      setMsgLink(computeMsgLink(contact));
    })();
    const channel = subscribeContactSettings(supabase, (contact) => {
      setMsgLink(computeMsgLink(contact));
    });
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [supabase]);

  useEffect(() => {
    let raf = 0;
    const checkSticky = () => {
      raf = 0;
      const tabsEl = tabsWrapRef.current;
      if (tabsEl) {
        const tabsTop = tabsEl.getBoundingClientRect().top;
        setStickyShown(tabsTop <= 2);
      } else {
        setStickyShown(false);
      }
    };

    const onScrollHandler = () => {
      if (raf) return;
      raf = requestAnimationFrame(checkSticky);
    };

    checkSticky();
    window.addEventListener('scroll', onScrollHandler, { passive: true });
    window.addEventListener('resize', onScrollHandler, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScrollHandler);
      window.removeEventListener('resize', onScrollHandler);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [prod?.id]);

  const sold = prod ? prod.stock <= 0 : false;
  const maxQty = prod ? (prod.stock > 0 ? Math.min(prod.stock, MAX_QTY_PER_PRODUCT) : 1) : 1;

  const chgQty = (d: number) => {
    if (sold) return;
    setQty((q) => Math.max(1, Math.min(maxQty, q + d)));
  };

  const addCartFromPP = () => {
    if (!prod || sold || cartButtonState === 'animating') return;

    const res = useCartStore.getState().addToCart([prod], prod.id, qty);
    if (res.ok && res.capped) {
      showToast(t('একটি পণ্য সর্বোচ্চ ১০টি নেওয়া যাবে'));
    }
    if (res.ok) {
      setCartButtonState('animating');

      setTimeout(() => {
        setCartButtonState('added');
        showToast(t('কার্টে যোগ হয়েছে'));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(QUICK_CART_EVENT, { detail: { id: prod.id, qty } }));
        }
      }, 1050);

      setTimeout(() => {
        setCartButtonState('idle');
      }, 2150);
    } else if (res.reason === 'stock') {
      showToast(t('স্টক শেষ!'));
    } else if (res.reason === 'limit') {
      showToast(t('একটি পণ্য সর্বোচ্চ ১০টি নেওয়া যাবে'));
    }
    
    trackAddToCart(
      {
        item_id: prod.id,
        item_name: prod.name,
        price: prod.price,
        item_category: prod.cat,
      },
      qty,
    );
  };

  const orderNow = () => {
    if (!prod || sold) return;
    startQuickOrder(router, prod, qty);
  };

  const notifyStock = () => {
    if (!prod) return;
    
    if (isStockNotified) {
      showToast(lang === 'en' ? 'You have already requested notification for this product.' : 'আপনি ইতিমধ্যে এই প্রোডাক্টের নোটিফিকেশন রিকোয়েস্ট জমা দিয়েছেন।');
      return;
    }

    if (!currentUser) {
      try {
        sessionStorage.setItem('vc_auth_stock_notify_prod', JSON.stringify({ id: prod.id, name: prod.name }));
      } catch {
        // ignore
      }
      showToast(lang === 'en' ? 'Please login first to request stock notification' : 'স্টক নোটিফিকেশন পেতে অনুগ্রহ করে আগে লগইন করুন');
      setLoginOpen(true);
      return;
    }

    window.dispatchEvent(new CustomEvent(STOCK_NOTIFY_EVENT, { detail: { id: prod.id, name: prod.name } }));
  };

  const handleAuthSuccess = () => {
    setLoginOpen(false);
    try {
      const raw = sessionStorage.getItem('vc_auth_stock_notify_prod');
      if (raw) {
        sessionStorage.removeItem('vc_auth_stock_notify_prod');
        const pData = JSON.parse(raw);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent(STOCK_NOTIFY_EVENT, { detail: pData }));
        }, 350);
      }
    } catch {
      // ignore
    }
  };

  const toggleWishFromPP = () => {
    if (!prod) return;
    const added = useWishlistStore.getState().toggleWish(prod);
    if (added) {
      window.dispatchEvent(new CustomEvent(WISHLIST_NAV_HIT_EVENT));
      if (!prefersReducedMotion()) {
        const seed = ++wishBurstSeedRef.current;
        if (wishBurstTimerRef.current) clearTimeout(wishBurstTimerRef.current);
        setWishBurst({ id: seed, particles: makeHeartBurst(seed) });
        wishBurstTimerRef.current = setTimeout(() => {
          setWishBurst((prev) => (prev && prev.id === seed ? null : prev));
        }, 850);
      }
    }
  };

  const shareProduct = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const title = prod?.name || document.title;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title, url });
        return;
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return; // ইউজার নিজেই শেয়ার বন্ধ করেছে
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast(lang === 'en' ? 'Link copied' : 'লিংক কপি হয়েছে');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showToast(lang === 'en' ? 'Link copied' : 'লিংক কপি হয়েছে'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
  };

  const goImg = (i: number) => { setCurImgIdx(i); setZoomed(false); };
  const galleryArrow = (dir: number) => {
    if (!prod || !prod.imgs || prod.imgs.length <= 1) return;
    goImg((curImgIdx + dir + prod.imgs.length) % prod.imgs.length);
  };
  const handleGalleryTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleGalleryTouchEnd = (e: React.TouchEvent) => {
    if (zoomed) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) galleryArrow(dx < 0 ? 1 : -1);
  };
  const toggleZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed) {
      const rect = e.currentTarget.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width * 100).toFixed(2);
      const yPct = ((e.clientY - rect.top) / rect.height * 100).toFixed(2);
      setTransformOrigin(`${xPct}% ${yPct}%`);
      setZoomed(true);
    } else {
      setZoomed(false);
      setTimeout(() => setTransformOrigin('center center'), 380);
    }
  };

  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const section = sectionRefs.current[id];
    if (!section) return;
    const tabHeight = tabsWrapRef.current ? tabsWrapRef.current.offsetHeight : 50;
    const top = section.getBoundingClientRect().top + window.scrollY - tabHeight - 8;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const toggleFaq = (i: number) => setOpenFaqIdx((cur) => (cur === i ? null : i));

  const navbarProps = {
    sticky: false as const,
    showHomeButton: true,
    cartCount: cartQty,
    wishCount: wishQty,
    currentUser,
    onCartClick: () => window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT)),
    onWishClick: () => window.dispatchEvent(new CustomEvent(OPEN_WISHLIST_EVENT)),
    onTrackClick: () => window.dispatchEvent(new CustomEvent(OPEN_TRACK_ORDER_EVENT)),
    onLoginClick: () => setLoginOpen(true),
  };

  if (!prod) {
    if (!prodsLoaded) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-brand-bg/25 via-white to-white">
          <Navbar {...navbarProps} />
          <div className="flex min-h-[50vh] items-center justify-center gap-2.5 text-sm text-muted">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-light/25 border-t-brand-light" />
            {t('লোড হচ্ছে...')}
          </div>
          <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} onAuthSuccess={handleAuthSuccess} />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-bg/25 via-white to-white">
        <Navbar {...navbarProps} />
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3.5 px-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-bg/60 text-brand-light">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
              <path d="M3 8.5v7L12 20l9-4.5v-7" />
              <path d="M12 13v7" />
            </svg>
          </div>
          <p className="text-sm text-muted">{t('এই প্রোডাক্টটি খুঁজে পাওয়া যায়নি')}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-brand-light px-7 py-3 font-body text-sm font-bold text-white no-underline shadow-sh2 transition-brand duration-brand hover:-translate-y-0.5 hover:bg-brand-light-hover hover:shadow-sh3"
          >
            {t('হোমে ফিরে যান')}
            <ArrowIcon dir="right" className="h-3.5 w-3.5" />
          </Link>
        </div>
        <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  const imgs = prod.imgs && prod.imgs.length ? prod.imgs : ['📦'];
  const techRows = getTechSpecRows(prod.specs);
  const pkg = getPackagingContent(prod.packagingContent, prod.specs);
  const features = Array.isArray(prod.features) ? prod.features : [];

  const faqs: { q: string; a: string }[] = useMemo(() => {
    if (!prod?.faqs) return [];
    if (Array.isArray(prod.faqs)) return prod.faqs;
    if (typeof prod.faqs === 'string') {
      return parseJsonish<{ q: string; a: string }[]>(prod.faqs, []);
    }
    return [];
  }, [prod?.faqs]);

  const related = useMemo(() => {
    const currentCat = String(prod.cat || '').trim().toLowerCase();
    const currentIdStr = String(prod.id);
    return prods
      .filter((p) => {
        if (String(p.id) === currentIdStr) return false;
        if (!currentCat || currentCat === 'all') return true;
        if (Array.isArray(p.cats) && p.cats.length) {
          return p.cats.some((c) => String(c || '').trim().toLowerCase() === currentCat);
        }
        return String(p.cat || '').trim().toLowerCase() === currentCat;
      })
      .sort((a, b) => (a.stock <= 0 ? 1 : 0) - (b.stock <= 0 ? 1 : 0))
      .slice(0, 4);
  }, [prods, prod.cat, prod.id]);

  const discountPct = prod.old && prod.old > prod.price ? Math.round((1 - prod.price / prod.old) * 100) : 0;

  const colorVariants = useMemo(() => {
    if (!prod.colorGroupId) return [];
    const currentIdStr = String(prod.id);
    return prods.filter((p) => (
      p.colorGroupId === prod.colorGroupId && (String(p.id) === currentIdStr || p.stock > 0)
    ));
  }, [prods, prod.colorGroupId, prod.id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg/25 via-white to-white overflow-x-hidden">
      <Navbar {...navbarProps} />

      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-4 pb-6 pt-3.5 md:grid-cols-2 md:px-8 md:pb-10">
        <div>
          <div
            className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-[14px] border border-border-base bg-white shadow-sh1 ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            onClick={toggleZoom}
            onTouchStart={handleGalleryTouchStart}
            onTouchEnd={handleGalleryTouchEnd}
          >
            {sold ? (
              <div className="absolute left-3.5 top-3.5 z-10 rounded-full bg-[#5A6578] px-3 py-1 font-body text-[11px] font-bold text-white shadow-xs">
                {lang === 'en' ? 'Sold Out' : 'স্টক শেষ'}
              </div>
            ) : prod.badge && (
              <div className="absolute left-3.5 top-3.5 z-10 animate-badge-hot-glow rounded-full bg-brand-light px-3 py-1 text-[11px] font-bold text-white shadow-sh1">
                {prod.badge}
              </div>
            )}
            <div
              className="flex h-full w-full items-center justify-center transition-transform duration-300"
              style={{ transformOrigin, transform: zoomed ? 'scale(2)' : 'scale(1)' }}
            >
              <GalleryImg val={imgs[curImgIdx]} name={prod.name} isThumb={false} />
            </div>
          </div>

          {imgs.length > 1 && (
            <>
              <div className="mt-4 flex justify-center gap-1.5">
                {imgs.map((_, i) => (
                  <button
                    key={i}
                    aria-label={lang === 'en' ? `Image ${i + 1}` : `ছবি ${i + 1}`}
                    className={`h-1.5 rounded-full transition-brand duration-brand ${i === curImgIdx ? 'w-6 bg-brand-light' : 'w-1.5 bg-border-base hover:bg-brand-light/40'}`}
                    onClick={() => goImg(i)}
                  />
                ))}
              </div>
              <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
                {imgs.map((im, i) => (
                  <button
                    type="button"
                    key={i}
                    aria-label={lang === 'en' ? `View image ${i + 1}` : `ছবি ${i + 1} দেখুন`}
                    className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border-[1.5px] transition-brand duration-brand ${i === curImgIdx ? 'border-brand-light shadow-[0_0_0_3px_rgba(68,167,252,.12)]' : 'border-border-base hover:border-brand-light/40'}`}
                    onClick={() => goImg(i)}
                  >
                    <GalleryImg val={im} name={prod.name} isThumb />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          <h1 className="mb-3 font-body text-[21px] font-bold leading-snug text-ink sm:text-2xl">{prod.seoH1 || prod.name}</h1>

          <div className="mb-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="font-body text-[28px] font-bold text-brand-light sm:text-[32px]">৳{prod.price.toLocaleString('en-US')}</span>
            {prod.old > prod.price && (
              <>
                <span className="text-[15px] text-muted line-through">৳{prod.old.toLocaleString('en-US')}</span>
                {discountPct > 0 && (
                  <span className="text-[13px] font-bold text-success">{lang === 'en' ? `${discountPct}% Off` : `${discountPct}% ছাড়`}</span>
                )}
              </>
            )}
          </div>

          {colorVariants.length > 1 && (
            <div className="mb-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                {t('উপলব্ধ কালার')}
              </div>
              <div className="flex flex-wrap gap-2">
                {colorVariants.map((v) => {
                  const isCurrent = String(v.id) === String(prod.id);
                  const dot = (
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                      style={{ backgroundColor: v.colorSwatch || '#D1D5DB' }}
                    />
                  );
                  const label = v.colorName || v.name;
                  return isCurrent ? (
                    <span
                      key={v.id}
                      className="flex items-center gap-1.5 rounded-full border-2 border-brand-light bg-brand-bg/25 px-3 py-1.5 text-[12.5px] font-bold text-ink"
                    >
                      {dot}
                      {label}
                    </span>
                  ) : (
                    <Link
                      key={v.id}
                      href={productHref(v)}
                      className="flex items-center gap-1.5 rounded-full border border-brand-light/25 bg-white/60 px-3 py-1.5 text-[12.5px] font-semibold text-ink shadow-2xs backdrop-blur-[6px] transition-brand duration-brand hover:border-brand-light/60 hover:bg-brand-bg/40 hover:shadow-xs"
                    >
                      {dot}
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {!sold && (
            <div className="mb-3 flex items-center gap-1.5 text-[12.5px] font-semibold">
              {prod.stock <= 10 ? (
                <span className="text-brand-light">⚡ {t('মাত্র')} {prod.stock}{t('টি বাকি — দ্রুত অর্ডার করুন')}</span>
              ) : (
                <span className="text-brand-light">{t('স্টকে আছে')} ({prod.stock}{t('টি')})</span>
              )}
            </div>
          )}

          {hasWarranty(prod.warranty) && (
            <button
              type="button"
              onClick={() => setWarrantyOpen(true)}
              className="mb-5 flex w-full items-center justify-between gap-2 rounded-[10px] border border-success/30 bg-success/10 px-3.5 py-2.5 text-left transition-brand duration-brand hover:border-success/50"
            >
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-success">
                <ShieldIcon className="text-success" /> {formatWarrantyLabel(prod.warranty, lang === 'en' ? 'en' : 'bn')}
              </span>
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-success/40 text-[10.5px] font-bold text-success"
                title={t('ওয়ারেন্টি বিস্তারিত')}
              >
                ?
              </span>
            </button>
          )}

          {quickSpecPills.length > 0 && (
            <div className="mb-5">
              <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                {t('স্পেসিফিকেশন এক নজরে')}
              </div>
              <div ref={specPillsRef} className="relative overflow-hidden">
                <div ref={specPillsMeasureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex gap-2 opacity-0">
                  {quickSpecPills.map((pill, i) => (
                    <div key={i} className="max-w-full truncate whitespace-nowrap rounded-full bg-brand-bg/35 px-3 py-1.5 text-[13px] text-ink">
                      {pill}
                    </div>
                  ))}
                </div>
                {specPillRows === null ? (
                  <div className="flex flex-wrap gap-2">
                    {quickSpecPills.map((pill, i) => (
                      <div key={i} className="max-w-full truncate rounded-full bg-brand-bg/35 px-3 py-1.5 text-[13px] text-ink">
                        {pill}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {specPillRows.map((row, ri) => (
                      <div key={ri} className="flex flex-wrap gap-2">
                        {row.map((pill, pi) => (
                          <div key={pi} className="max-w-full truncate whitespace-nowrap rounded-full bg-brand-bg/35 px-3 py-1.5 text-[13px] text-ink">
                            {pill}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className={`inline-flex items-center gap-2.5 rounded-full bg-brand-bg/35 py-1 pl-3.5 pr-1 ${sold ? 'opacity-50' : ''}`}>
              <span className="text-[13px] font-semibold text-ink">{t('পরিমাণ')}</span>
              <div className="flex items-center gap-1">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-ink transition-brand duration-brand hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => chgQty(-1)}
                  disabled={sold || qty <= 1}
                  aria-label={t('কমান')}
                >
                  −
                </button>
                <span className="min-w-[26px] text-center text-[14px] font-bold text-ink">{sold ? 0 : qty}</span>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-ink transition-brand duration-brand hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => chgQty(1)}
                  disabled={sold || qty >= maxQty}
                  aria-label={t('বাড়ান')}
                >
                  +
                </button>
              </div>
            </div>

            {!sold && qty > 1 && (
              <span className="text-[13px] text-muted">
                {t('মোট')} <span className="font-bold text-ink">৳{(prod.price * qty).toLocaleString('en-US')}</span>
              </span>
            )}

            <div className="ml-auto flex items-center gap-1">
              <div className="relative h-9 w-9">
                <button
                  onClick={toggleWishFromPP}
                  title={t('Wishlist এ যোগ করুন')}
                  aria-label={t('Wishlist এ যোগ করুন')}
                  className={`flex h-9 w-9 items-center justify-center rounded-[10px] border transition-brand duration-brand active:scale-90 ${
                    wished
                      ? 'border-[#FF5A6E]/40 bg-[#FF5A6E]/10 text-[#FF5A6E]'
                      : 'border-brand-light/30 bg-brand-bg/35 text-ink hover:bg-brand-bg/55 hover:border-brand-light/60'
                  }`}
                >
                  <motion.span
                    key={wishBurst ? `pop-${wishBurst.id}` : 'idle'}
                    initial={wishBurst ? { scale: 1 } : false}
                    animate={wishBurst ? { scale: [1, 1.35, 0.92, 1.05, 1] } : { scale: 1 }}
                    transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
                    className="flex h-full w-full items-center justify-center"
                  >
                    <HeartIcon filled={wished} />
                  </motion.span>
                </button>

                <AnimatePresence>
                  {wishBurst && (
                    <div className="pointer-events-none absolute inset-0">
                      {wishBurst.particles.map((pt) => (
                        <BurstHeart key={pt.id} p={pt} />
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={shareProduct}
                title={t('শেয়ার করুন')}
                aria-label={t('শেয়ার করুন')}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-brand-light/30 bg-brand-bg/35 text-ink transition-brand duration-brand hover:border-brand-light/60 hover:bg-brand-bg/55 active:scale-90"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="18" cy="5" r="2.6" />
                  <circle cx="6" cy="12" r="2.6" />
                  <circle cx="18" cy="19" r="2.6" />
                  <path d="M8.3 10.7l7.4-4.3M8.3 13.3l7.4 4.3" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {sold ? (
              isStockNotified ? (
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand-light py-3.5 font-body text-sm font-bold text-white shadow-sh1 cursor-default select-none border-none outline-none ring-0"
                >
                  <BellIcon className="text-white" />
                  <span>{lang === 'en' ? 'You will be notified when back in stock' : 'স্টকে আসলে আপনাকে জানানো হবে'}</span>
                </button>
              ) : (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand-light py-3.5 font-body text-sm font-bold text-white shadow-sh1 transition-all duration-brand hover:bg-brand-light-hover border-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
                  onClick={notifyStock}
                >
                  <BellIcon className="text-white" />
                  <span>{lang === 'en' ? 'Notify Me When in Stock' : 'স্টকে আসলে আমাকে জানান'}</span>
                </motion.button>
              )
            ) : (
              <>
                <motion.button
                  type="button"
                  whileTap={cartButtonState === 'idle' ? { scale: 0.97 } : undefined}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className={`relative flex w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] py-3.5 font-body text-sm font-bold transition-all duration-200 outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] overflow-visible select-none ${
                    cartButtonState === 'added'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-xs'
                      : 'border-brand-light/40 bg-brand-bg/35 text-brand-light hover:bg-brand-bg/55 hover:border-brand-light'
                  }`}
                  onClick={addCartFromPP}
                >
                  <AnimatePresence>
                    {cartButtonState === 'animating' && (
                      <motion.div
                        key="panda-cart-jump"
                        initial={{ opacity: 0, y: 10, scale: 0.3, rotate: 0 }}
                        animate={{
                          opacity: [0, 1, 1, 1, 1, 1, 1, 1, 0],
                          y: [10, -8, -46, -50, -50, -50, -46, -6, 10],
                          scale: [0.3, 0.75, 1.05, 1.1, 1.1, 1.1, 1.05, 0.6, 0.25],
                          rotate: [0, -4, 8, -14, 14, -10, 0, 0, 0],
                        }}
                        transition={{
                          duration: 1.05,
                          ease: [0.22, 0.7, 0.2, 1],
                          times: [0, 0.16, 0.3, 0.42, 0.52, 0.62, 0.72, 0.88, 1],
                        }}
                        style={{ transformOrigin: 'center bottom' }}
                        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 z-30 drop-shadow-[0_6px_10px_rgba(0,0,0,0.18)]"
                      >
                        <VangcurPandaIcon className="h-12 w-10" />
                        <motion.span
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{
                            opacity: [0, 0, 1, 1, 1, 0, 0, 0, 0],
                            scale: [0.5, 0.5, 1, 1, 1, 0.8, 0.5, 0.5, 0.5],
                          }}
                          transition={{
                            duration: 1.05,
                            ease: [0.22, 0.7, 0.2, 1],
                            times: [0, 0.16, 0.3, 0.42, 0.52, 0.62, 0.72, 0.88, 1],
                          }}
                          className="absolute -right-3 -top-1 rounded-full border border-brand-light/40 bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-brand-light shadow-sh1"
                        >
                          Hi!
                        </motion.span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <span
                    className={`inline-flex items-center justify-center transition-transform duration-200 ${
                      cartButtonState === 'animating' ? 'animate-cart-jiggle' : ''
                    }`}
                  >
                    {cartButtonState === 'added' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <CartIcon />
                    )}
                  </span>

                  <span className="transition-all duration-200">
                    {cartButtonState === 'added'
                      ? (lang === 'en' ? 'Added to Cart!' : 'কার্টে যোগ হয়েছে!')
                      : t('কার্টে যোগ করুন')}
                  </span>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  onMouseEnter={() => router.prefetch('/checkout')}
                  onTouchStart={() => router.prefetch('/checkout')}
                  className="shimmer-sheen flex w-full items-center justify-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-info to-brand-light py-3.5 font-body text-sm font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03] outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
                  onClick={orderNow}
                >
                  <BoltIcon />
                  <span>{t('এখনই অর্ডার করুন')}</span>
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-30 border-b border-border-base bg-white/95 backdrop-blur-md" ref={tabsWrapRef}>
        <div
          className="no-scrollbar mx-auto flex max-w-[1100px] gap-1 overflow-x-auto px-4 [overscroll-behavior-x:contain] [touch-action:pan-x_pan-y] md:px-8"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`whitespace-nowrap border-b-2 px-3.5 py-3.5 text-[13px] font-semibold transition-brand duration-brand ${activeTab === tab.id ? 'border-brand-light text-brand-light' : 'border-transparent text-muted hover:text-ink'}`}
              onClick={() => scrollToSection(tab.id)}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>
      </div>

      <div className={`mx-auto max-w-[1100px] px-4 md:px-8 ${related.length > 0 ? 'pb-10' : 'pb-20 sm:pb-24'}`}>
        <div className="border-b border-border-base py-8" id="ppSecDesc" ref={(el) => { sectionRefs.current.ppSecDesc = el; }}>
          <SectionHeading icon={<SolidDocIcon />}>
            {t('প্রোডাক্টের')} <span className="text-brand-light">{t('বিস্তারিত বিবরণ')}</span>
          </SectionHeading>
          <div className="font-body text-[16px] leading-[1.9] text-ink/85">
            {(prod.longDesc || prod.desc) ? (
              (prod.longDesc || prod.desc)!.split('\n\n').map((p, i) => (
                <p key={i} className="mb-3.5">
                  {p.split('\n').map((line, j) => (j === 0 ? renderLinkedText(line) : [<br key={j} />, renderLinkedText(line)]))}
                </p>
              ))
            ) : (
              <p className="text-muted">{t('এই প্রোডাক্টের বিস্তারিত বিবরণ শীঘ্রই যোগ করা হবে।')}</p>
            )}
          </div>
        </div>

        <div className="border-b border-border-base py-8" id="ppSecFeatures" ref={(el) => { sectionRefs.current.ppSecFeatures = el; }}>
          <SectionHeading icon={<SolidSparkIcon />}>
            {t('প্রধান')} <span className="text-brand-light">{t('ফিচারস')}</span>
          </SectionHeading>
          {features.length ? (
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {features.map((f, i) => <FeatureItem key={i} text={f} />)}
            </div>
          ) : (
            <div className="font-body text-[13.5px] text-muted">{t('এই প্রোডাক্টের features এখনো যোগ হয়নি।')}</div>
          )}
        </div>

        <div className="border-b border-border-base py-8" id="ppSecSpecs" ref={(el) => { sectionRefs.current.ppSecSpecs = el; }}>
          <SectionHeading icon={<SolidWrenchIcon />}>
            {t('কারিগরি')} <span className="text-brand-light">{t('স্পেসিফিকেশন')}</span>
          </SectionHeading>
          <div className="w-full overflow-hidden rounded-[18px] border border-border-base/80 bg-white shadow-xs">
            {/*
              🛡️ Safari/WebKit ফিক্স (ভার্সন ২): মূল কারণ ছিল `border-collapse: collapse`
              মোডে `<tr>`/`<th>`-এর ব্যাকগ্রাউন্ড গ্র্যাডিয়েন্ট Safari প্রতিটা সেল আলাদা করে
              পেইন্ট করে (মাঝে সিম দেখায়)। আগে এটা ঠিক করতে গ্র্যাডিয়েন্ট প্রতিটা <th>-এ
              আলাদা করে বসানো হয়েছিল — কিন্তু তাতে Android/Chrome-এ উল্টো দুই টুকরার
              মতো দেখাচ্ছিল (দুটো আলাদা গ্র্যাডিয়েন্ট কলামের সীমানায় টোন মেলে না)।

              এবারের সমাধান: হেডারটা পুরোপুরি <table>-এর বাইরে একটা সাধারণ flex div
              দিয়ে বানানো (একটামাত্র ব্যাকগ্রাউন্ড — কোনো table/border-collapse পেইন্টিং
              কোয়ার্কই নেই, তাই দুই ব্রাউজারেই নিশ্চিতভাবে অভিন্ন দেখাবে), আর নিচের আসল
              <table>-এ `<colgroup>` দিয়ে কলাম-width স্পষ্টভাবে বেঁধে দেওয়া হলো (৩৮%/৬২%) —
              এতে header-এর flex split আর নিচের ডেটা-রো-এর কলাম ঠিক একই জায়গায় মিলবে।
              <tbody>-এর বর্ডার/স্টাইল অবিকল আগের মতোই অক্ষত রাখা হয়েছে, কোনো পরিবর্তন
              হয়নি, তাই সেখানে নতুন কোনো রিগ্রেশনের ঝুঁকি নেই।
            */}
            <div className="flex border-b border-brand-light/35 bg-gradient-to-br from-[#F0F7FF] via-white to-[#EFF6FE]/75">
              <div className="w-[38%] px-4 py-3 text-left font-body text-[13.5px] font-bold text-ink">{t('বিবরণ')}</div>
              <div className="flex-1 px-4 py-3 text-left font-body text-[13.5px] font-bold text-ink">{lang === 'en' ? 'Details' : 'তথ্য'}</div>
            </div>
            {/* table-fixed: colgroup-এর width-কে জোরপূর্বক মানতে বাধ্য করে (content অনুযায়ী
                অটো-অ্যাডজাস্ট না করে), যাতে উপরের flex হেডারের সাথে কলাম ঠিক মিলে যায় */}
            <table className="w-full table-fixed border-collapse text-[14px]">
              <colgroup>
                <col className="w-[38%]" />
                <col />
              </colgroup>
              <tbody>
                {techRows.length === 0 ? (
                  <tr><td colSpan={2} className="p-4 text-center text-muted font-body text-xs">{t('স্পেসিফিকেশন শীঘ্রই যোগ করা হবে।')}</td></tr>
                ) : (
                  techRows.map(([k, v]) => (
                    <tr key={k} className="border-b border-border-base/50 last:border-b-0 transition-colors hover:bg-brand-bg/10">
                      <td className="px-4 py-3 font-body text-[14.5px] font-semibold text-ink/90">{k}</td>
                      <td className="px-4 py-3 font-body text-[14.5px] font-medium text-ink/80">{v}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {prod.powerInfo && (
            <SpecCalloutBox icon={<PlugIcon />} title={t('পাওয়ার / কানেকশন তথ্য')} tone="amber">
              {prod.powerInfo.split('\n').filter((l) => l.trim()).map((l, i) => (
                <div key={i}>{renderLinkedText(l.trim())}</div>
              ))}
            </SpecCalloutBox>
          )}

          {pkg && (
            <SpecCalloutBox icon={<BoxIcon />} title={lang === 'en' ? 'Packaging Content' : 'প্যাকেজিং কন্টেন্ট'} tone="blue">
              {pkg.split('\n').filter((l) => l.trim()).map((l, i) => (
                <div key={i}>{renderLinkedText(l.trim())}</div>
              ))}
            </SpecCalloutBox>
          )}
        </div>

        <div className="border-b border-border-base py-8" id="ppSecExtra" ref={(el) => { sectionRefs.current.ppSecExtra = el; }}>
          <SectionHeading icon={<SolidDocIcon />}>
            {t('অতিরিক্ত')} <span className="text-brand-light">{t('তথ্য')}</span>
          </SectionHeading>
          {(prod.infoBoxes && prod.infoBoxes.length) ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {prod.infoBoxes.map((box, i) => (
                <div key={i} className="rounded-brand border border-border-base bg-white p-4 shadow-sh1">
                  <div className="mb-2 text-[15.5px] font-bold text-ink">{box.title}</div>
                  <div className="whitespace-pre-line font-body text-[15px] leading-[1.85] text-ink/85">{renderLinkedText(box.body)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="font-body text-[13.5px] text-muted">{t('এই প্রোডাক্টের জন্য অতিরিক্ত তথ্য এখনো যোগ হয়নি।')}</div>
          )}
        </div>

        <div className="border-b border-border-base py-8" id="ppSecFaq" ref={(el) => { sectionRefs.current.ppSecFaq = el; }}>
          {faqs.length > 0 && (
            <div className="mb-10">
              <SectionHeading icon={<SolidQuestionBookIcon />}>
                <span>{t('কমন')} <span className="text-brand-light">{t('প্রশ্নোত্তর (FAQ)')}</span></span>
              </SectionHeading>
              <div className="flex flex-col gap-3">
                {faqs.map((f, i) => {
                  const isOpen = openFaqIdx === i;
                  return (
                    <div
                      key={i}
                      ref={(el) => { faqItemRefs.current[i] = el; }}
                      className={`overflow-hidden rounded-[14px] border transition-colors duration-200 ${
                        isOpen
                          ? 'border-brand-light/50 bg-gradient-to-br from-[#F0F7FF] to-white shadow-sh1 ring-1 ring-brand-light/20'
                          : 'border-border-base bg-white shadow-xs hover:border-brand-light/40 hover:bg-brand-bg/10'
                      }`}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 p-4 text-left font-body text-[15px] font-bold text-ink transition-colors"
                        onClick={() => toggleFaq(i)}
                      >
                        <span className="font-bold leading-snug">{renderLinkedText(t(f.q))}</span>
                        <ChevronIcon className={`shrink-0 transition-transform duration-brand ${isOpen ? 'rotate-180 text-brand-light' : 'text-muted'}`} />
                      </button>
                      
                      <div
                        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                        }`}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <div className="border-t border-brand-light/15 px-4 pb-4 pt-3 font-body text-[15px] leading-[1.85] text-ink/85">
                            <div className="border-l-2 border-brand-light/60 pl-3">
                              {renderLinkedText(t(f.a))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <ProductQnA productId={prod.id} productName={prod.name} />
        </div>

        <div className="pt-8" id="ppSecReviews" ref={(el) => { sectionRefs.current.ppSecReviews = el; }}>
          <ProductReviews
            productId={prod.id}
            productName={prod.name}
            defaultRating={prod.rating || 4.8}
            onOpenLogin={() => setLoginOpen(true)}
          />
        </div>
      </div>

      {related.length > 0 && (
        <div className="mx-auto max-w-[1100px] px-4 pb-20 sm:pb-24 pt-2 md:px-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border-base" />
            <div className="whitespace-nowrap font-body text-lg font-bold text-ink">
              {t('একই ক্যাটাগরির')} <span className="text-brand-light">{t('আরও পণ্য')}</span>
            </div>
            <div className="h-px flex-1 bg-border-base" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((p, i) => (
              <div key={p.id}>
                <ProductCard prod={p} isFirst={false} index={i} />
              </div>
            ))}
          </div>
        </div>
      )}

      <WarrantyModal isOpen={warrantyOpen} onClose={() => setWarrantyOpen(false)} warrantyText={prod.warranty} />
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} onAuthSuccess={handleAuthSuccess} />

      <div className={`fixed inset-x-0 bottom-0 z-[45] border-t border-border-base bg-white/95 pb-[max(10px,env(safe-area-inset-bottom))] shadow-sh3 backdrop-blur transition-transform duration-300 ${stickyShown ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 pt-2.5 md:px-8">
          <div className="min-w-0 flex flex-1 flex-col justify-center pr-2">
            <div className="line-clamp-2 font-body text-[12px] font-semibold leading-tight text-ink">
              {prod.name}
            </div>
            <div className="mt-0.5 font-body text-[14.5px] font-extrabold text-brand-light">
              ৳{(prod.price * (sold ? 1 : qty)).toLocaleString('en-US')} - {sold ? 1 : qty} {lang === 'en' ? 'Pcs' : 'পিছ'}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {sold ? (
              isStockNotified ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex h-[42px] min-h-[42px] box-border items-center justify-center gap-1.5 rounded-[12px] bg-brand-light px-4 text-[13px] font-bold text-white shadow-sh1 cursor-default select-none border-none outline-none ring-0"
                >
                  <BellIcon className="text-white h-4 w-4" />
                  <span>{lang === 'en' ? 'Notified' : 'জানানো হবে'}</span>
                </button>
              ) : (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="inline-flex h-[42px] min-h-[42px] box-border items-center justify-center gap-1.5 rounded-[12px] bg-brand-light px-4 text-[13px] font-bold text-white shadow-sh1 transition-all duration-brand hover:bg-brand-light-hover border-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
                  onClick={notifyStock}
                >
                  <BellIcon className="text-white h-4 w-4" />
                  <span>{lang === 'en' ? 'Notify' : 'জানান'}</span>
                </motion.button>
              )
            ) : (
              <>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  onMouseEnter={() => router.prefetch('/checkout')}
                  onTouchStart={() => router.prefetch('/checkout')}
                  className="shimmer-sheen inline-flex h-[42px] min-h-[42px] box-border items-center justify-center gap-1.5 rounded-[12px] border-none bg-gradient-to-r from-info to-brand-light px-4 text-[13px] font-bold text-white shadow-sh1 transition-[filter] duration-brand hover:brightness-[1.03] outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
                  onClick={orderNow}
                >
                  <BoltIcon />
                  <span>{t('অর্ডার করুন')}</span>
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className={`inline-flex h-[42px] min-h-[42px] box-border items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] px-4 text-[13px] font-bold transition-all duration-200 outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] ${
                    cartButtonState === 'added'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                      : 'border-brand-light/40 bg-brand-bg/35 text-brand-light hover:bg-brand-bg/55'
                  }`}
                  onClick={addCartFromPP}
                >
                  {cartButtonState === 'added' ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <CartIcon />
                  )}
                  <span>{cartButtonState === 'added' ? (lang === 'en' ? 'Added!' : 'যোগ হয়েছে!') : t('কার্ট')}</span>
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
